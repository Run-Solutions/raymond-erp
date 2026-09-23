import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaClient as PrismaComercialClient } from '@prisma/client-comercial';
import { AuthRepository } from './auth.repository';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { AuditService } from './audit.service';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { SetupPasswordDto } from './dto/setup-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SwitchOrganizationDto } from './dto/switch-organization.dto';
import { AuthResponse } from './interfaces/auth-response.interface';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private static directPrismaInstance: PrismaClient | null = null;
    private static directPrismaR4Instance: PrismaComercialClient | null = null;

    private get directPrisma(): PrismaClient {
        if (!AuthService.directPrismaInstance) {
            AuthService.directPrismaInstance = new PrismaClient();
        }
        return AuthService.directPrismaInstance;
    }

    private get directPrismaR4(): PrismaComercialClient {
        if (!AuthService.directPrismaR4Instance) {
            AuthService.directPrismaR4Instance = new PrismaComercialClient();
        }
        return AuthService.directPrismaR4Instance;
    }

    constructor(
        private readonly authRepository: AuthRepository,
        private readonly tokenService: TokenService,
        private readonly sessionService: SessionService,
        private readonly auditService: AuditService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Login de usuario con credenciales contra PostgreSQL (BD de auth).
     */
    async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
        const user = await this.authRepository.findUserByEmail(dto.email);

        if (!user) {
            // El usuario no existe en PSQL. Intentar recuperarlo desde la BD remota
            // (ComercialR4) y forzar el cambio de contraseña por seguridad.
            const pendingSetup = await this.resolvePasswordSetup(dto.email, ipAddress, userAgent);
            if (pendingSetup) {
                return pendingSetup;
            }
        }

        if (!user || !(await bcrypt.compare(dto.password, user.password))) {
            await this.auditService.log(null, 'LOGIN_FAILED', 'AUTH', { email: dto.email }, ipAddress, userAgent);
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.is_active) {
            throw new UnauthorizedException('Account is disabled');
        }

        if (!user.roles) {
            throw new UnauthorizedException('User has no role assigned');
        }

        // Use unique UUID for pending token to avoid unique constraint violations
        const pendingToken = `PENDING_${require('crypto').randomUUID()}`;
        const session = await this.sessionService.createSession(user.id, pendingToken, userAgent, ipAddress);

        // CRITICAL: For global SuperAdmin, orgId can be NULL
        const isSuperadmin = user.roles.name === 'Superadmin';

        const tokens = await this.tokenService.generateTokens({
            sub: user.id,
            email: user.email,
            roles: user.roles.name,
            sid: session.id,
            orgId: user.organization_id || null, // NULL for global SuperAdmin
        });

        const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
        await this.sessionService.updateSessionToken(session.id, hashedRefreshToken);

        const now = new Date();
        await this.prisma.users.update({
            where: { id: user.id },
            data: { last_login_at: now }
        }).catch(err => this.logger.error(`Error updating last_login_at for user ${user.id}: ${err.message}`));

        await this.auditService.log(user.id, 'LOGIN_SUCCESS', 'AUTH', { sessionId: session.id }, ipAddress, userAgent);

        return {
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                roles: user.roles.name,
                organization_id: user.organization_id || null, // NULL for global SuperAdmin
                isSuperadmin, // CRITICAL: Add SuperAdmin flag for frontend
                adc_asociado_id: (user as any).adc_asociado_id || null,
                adc_asociado_name: (user as any).adc_asociado_name || null,
                permissions: user.roles.role_permissions.map(p => ({
                    resource: p.permissions.resource,
                    action: p.permissions.action,
                })),
                avatar_url: user.avatar_url || undefined,
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
        };
    }

    /**
     * Cuando el usuario no existe en PSQL pero sí en la BD remota (ComercialR4)
     * y no está bloqueado, se emite un token de configuración para forzar el
     * cambio de contraseña por seguridad y así re-crear el registro en PSQL.
     */
    private async resolvePasswordSetup(email: string, ipAddress?: string, userAgent?: string): Promise<AuthResponse | null> {
        const r4User = await this.findR4UserByEmail(email);
        if (!r4User) {
            return null;
        }

        if (r4User.bloqueado) {
            await this.auditService.log(null, 'LOGIN_BLOCKED', 'AUTH', { email, source: 'ComercialR4' }, ipAddress, userAgent);
            throw new UnauthorizedException('Cuenta bloqueada');
        }

        const setupToken = await this.tokenService.generatePasswordSetupToken({
            email: r4User.correo,
            roles: r4User.rol || 'USUARIO',
            r4UserId: r4User.id,
        });

        const { first_name, last_name } = this.splitFullName(r4User.nombre);

        await this.auditService.log(null, 'LOGIN_PENDING_PASSWORD_SETUP', 'AUTH', { email: r4User.correo, r4UserId: r4User.id }, ipAddress, userAgent);

        return {
            user: {
                id: r4User.id,
                email: r4User.correo,
                first_name,
                last_name,
                roles: r4User.rol || 'USUARIO',
                organization_id: null,
                permissions: [],
            },
            accessToken: '',
            refreshToken: '',
            expiresIn: 1800, // 30 minutes
            requiresPasswordSetup: true,
            setupToken,
        };
    }

    /**
     * Crea el registro del usuario en PSQL con la nueva contraseña y arranca
     * su sesión. Solo es válido con el token emitido por resolvePasswordSetup.
     */
    async setupPassword(dto: SetupPasswordDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
        const payload = await this.tokenService.verifyPasswordSetupToken(dto.setupToken);
        const email = payload?.email as string;
        const rolName = (payload?.roles as string) || 'USUARIO';

        // Re-validar contra la BD remota (evita abusos posteriores a la emisión)
        const r4User = await this.findR4UserByEmail(email);
        if (!r4User) {
            throw new UnauthorizedException('La cuenta ya no existe en el sistema');
        }
        if (r4User.bloqueado) {
            throw new UnauthorizedException('Cuenta bloqueada');
        }

        // Resolver la organización destino (primera activa)
        const organization = await this.prisma.organizations.findFirst({
            where: { is_active: true },
            orderBy: { created_at: 'asc' },
        });
        if (!organization) {
            await this.auditService.log(null, 'PASSWORD_SETUP_FAILED', 'AUTH', { email, reason: 'No organization available' }, ipAddress, userAgent);
            throw new BadRequestException('No hay una organización disponible para crear el usuario');
        }

        // Evitar duplicados: el token de setup es de un solo uso
        const existing = await this.prisma.users.findFirst({
            where: { email, organization_id: organization.id },
        });
        if (existing && existing.deleted_at === null) {
            await this.auditService.log(null, 'PASSWORD_SETUP_CONFLICT', 'AUTH', { email, organization_id: organization.id }, ipAddress, userAgent);
            throw new ConflictException('El correo ya se encuentra registrado en el sistema');
        }

        // Crear/buscar el rol por nombre en la organización destino.
        // En producción los roles ya existen con todos sus permisos asignados,
        // así que aquí solo se reutiliza el rol existente y se asigna al usuario.
        const role = await this.prisma.roles.upsert({
            where: { name_organization_id: { name: rolName, organization_id: organization.id } },
            update: {},
            create: {
                id: require('crypto').randomUUID(),
                name: rolName,
                description: `Rol recuperado desde ComercialR4 (Origen: ${rolName})`,
                organization_id: organization.id,
                updated_at: new Date(),
            } as any,
        });

        const { first_name, last_name } = this.splitFullName(r4User.nombre);
        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const includeRoles = {
            roles: {
                include: { role_permissions: { include: { permissions: true } } },
            },
        } as any;

        let user: any;
        if (existing && existing.deleted_at !== null) {
            // Reactivar un registro previamente eliminado (soft delete)
            user = await this.prisma.users.update({
                where: { id: existing.id },
                data: {
                    email: r4User.correo,
                    password: hashedPassword,
                    first_name,
                    last_name,
                    role_id: role.id,
                    organization_id: organization.id,
                    is_active: true,
                    deleted_at: null,
                    avatar_url: r4User.avatar_url ?? null,
                    adc_asociado_name: r4User.adc_asociado_name ?? null,
                    auxiliar_name: r4User.auxiliar_name ?? null,
                    updated_at: new Date(),
                } as any,
                include: includeRoles,
            });
        } else {
            user = await this.prisma.users.create({
                data: {
                    id: require('crypto').randomUUID(),
                    email: r4User.correo,
                    password: hashedPassword,
                    first_name,
                    last_name,
                    organization_id: organization.id,
                    role_id: role.id,
                    is_active: true,
                    avatar_url: r4User.avatar_url ?? null,
                    adc_asociado_name: r4User.adc_asociado_name ?? null,
                    auxiliar_name: r4User.auxiliar_name ?? null,
                    updated_at: new Date(),
                } as any,
                include: includeRoles,
            });
        }

        // Emitir sesión y tokens (mismo flujo que el login normal)
        const pendingToken = `PENDING_${require('crypto').randomUUID()}`;
        const session = await this.sessionService.createSession(user.id, pendingToken, userAgent, ipAddress);
        const isSuperadmin = user.roles?.name === 'Superadmin';

        const tokens = await this.tokenService.generateTokens({
            sub: user.id,
            email: user.email,
            roles: user.roles?.name,
            sid: session.id,
            orgId: user.organization_id || null,
        });

        const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
        await this.sessionService.updateSessionToken(session.id, hashedRefreshToken);

        await this.prisma.users.update({
            where: { id: user.id },
            data: { last_login_at: new Date() }
        }).catch((err: any) => this.logger.error(`Error updating last_login_at for user ${user.id}: ${err.message}`));

        await this.auditService.log(user.id, 'PASSWORD_SETUP_COMPLETED', 'AUTH', { email: user.email, r4UserId: r4User.id }, ipAddress, userAgent);
        await this.auditService.log(user.id, 'LOGIN_SUCCESS', 'AUTH', { sessionId: session.id }, ipAddress, userAgent);

        return {
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                roles: user.roles?.name,
                organization_id: user.organization_id || null,
                isSuperadmin,
                adc_asociado_id: (user as any).adc_asociado_id || null,
                adc_asociado_name: (user as any).adc_asociado_name || null,
                permissions: user.roles?.role_permissions?.map((p: any) => ({
                    resource: p.permissions?.resource,
                    action: p.permissions?.action,
                })) || [],
                avatar_url: user.avatar_url || undefined,
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
        };
    }

    private async findR4UserByEmail(email: string) {
        const r4 = this.directPrismaR4;
        const trimmedEmail = email.trim();

        const direct = await r4.usuario.findFirst({
            where: { correo: trimmedEmail },
        });
        if (direct) {
            return direct;
        }

        // MySQL (Prisma) no soporta mode:'insensitive'; búsqueda por coincidencia
        const matches = await r4.usuario.findMany({
            where: { correo: { contains: trimmedEmail } },
            select: {
                id: true,
                correo: true,
                nombre: true,
                rol: true,
                adc_asociado_name: true,
                auxiliar_name: true,
                avatar_url: true,
                bloqueado: true,
                created_at: true,
            },
        });
        return matches.find(u => u.correo.trim().toLowerCase() === trimmedEmail.toLowerCase()) || null;
    }

    private splitFullName(nombre?: string | null): { first_name: string; last_name: string } {
        const name = (nombre || '').trim();
        if (!name) {
            return { first_name: 'Usuario', last_name: '' };
        }
        const parts = name.split(/\s+/);
        return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
    }

    async refresh(refreshToken: string) {
        try {
            if (!refreshToken) {
                throw new UnauthorizedException('Refresh token is required');
            }

            const payload = await this.tokenService.verifyRefreshToken(refreshToken);
            if (!payload || !payload.sid) {
                throw new UnauthorizedException('Invalid refresh token payload');
            }

            const session = await this.sessionService.findSessionById(payload.sid);
            if (!session || !session.is_valid) { // Fixed: snake_case
                throw new UnauthorizedException('Session invalid or expired');
            }

            // Verify token hash matches DB (if hash is present)
            if (session.refresh_token && !session.refresh_token.startsWith('PENDING_')) {
                const isMatch = await bcrypt.compare(refreshToken, session.refresh_token);
                if (!isMatch) {
                    this.logger.warn(`Refresh token mismatch for session ${session.id}`);
                }
            }

            const user = await this.authRepository.findUserById(payload.sub);
            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            // Graceful handling if role is missing (though normalization should fix this)
            if (!user.roles) {
                this.logger.error(`User ${user.id} has no role assigned during refresh`);
                throw new UnauthorizedException('User has no role assigned');
            }

            // Keep current session valid and issue new tokens
            const tokens = await this.tokenService.generateTokens({
                sub: user.id,
                email: user.email,
                roles: user.roles.name,
                sid: session.id,
                orgId: user.organization_id || null, // NULL for global SuperAdmin
            });

            const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
            await this.sessionService.updateSessionToken(session.id, hashedRefreshToken);

            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresIn: tokens.expiresIn,
            };
        } catch (error) {
            this.logger.error(`Refresh token failed: ${(error as Error).message}`, (error as Error).stack);
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Could not refresh token');
        }
    }

    async logout(refreshToken: string) {
        const payload = await this.tokenService.verifyRefreshToken(refreshToken);
        if (payload && payload.sid) {
            await this.sessionService.revokeSession(payload.sid);
        }
        return true;
    }
    async forgotPassword(dto: ForgotPasswordDto) {
        const user = await this.authRepository.findUserByEmail(dto.email);
        if (!user) {
            // Don't reveal user existence
            return true;
        }

        // Generate a random token (or JWT)
        // For DB storage, a random string is often enough, but we can use JWT if we want stateless verification option.
        // Requirement says: Store in DB.
        const token = await this.tokenService.generateResetToken(user.id);
        const hashedToken = await bcrypt.hash(token, 10);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

        await this.authRepository.createPasswordResetToken(user.id, hashedToken, expiresAt);

        // In a real app, send email here.
        this.logger.log(`[MOCK EMAIL] Reset Token for ${user.email}: ${token}`);

        await this.auditService.log(user.id, 'FORGOT_PASSWORD_REQUEST', 'AUTH', { email: dto.email });
        return true;
    }

    async resetPassword(dto: ResetPasswordDto) {
        // We need to find the token in DB. 
        // Since we hashed it, we can't look it up directly by the raw token if we only stored the hash.
        // Wait, the requirement says "Guardar token hasheado".
        // If we store the hash, we can't query by it unless we have the ID.
        // Usually, we send a token like `id:secret`.
        // Or we store the raw token in DB (if it's a random string) and hash it for comparison?
        // Let's assume the token sent to user is the one we verify.
        // If we store hashed token, we need to iterate or have a lookup key.
        // Better approach for this prompt: Store the token as is (if it's a UUID/JWT) or hash it if it's a sensitive secret.
        // Given the constraints and typical flow:
        // 1. User gets token.
        // 2. User sends token.
        // 3. We verify token signature (JWT).
        // 4. We ALSO check if it exists in DB and is not used/expired.

        const payload = await this.tokenService.verifyResetToken(dto.token);
        if (!payload) {
            throw new UnauthorizedException('Invalid or expired reset token');
        }

        // Find token record for this user
        // We need to find the token record. Since we don't have the record ID, we might need to query by user_id?
        // But a user might have multiple? No, we deleted old ones.
        // Let's try to find by user_id.
        // Actually, `findPasswordResetToken` queries by `token`. 
        // If we stored the HASH, we can't query by the raw token.
        // Correction: We should store the raw token if we want to query by it, OR store a lookup ID.
        // Let's NOT hash it in DB for this specific implementation to allow lookup, 
        // OR (Better Security): The token is `id:secret`. We look up by `id`, verify `secret` hash.
        // Let's stick to: Token is the JWT. We store the JWT in DB. 
        // "Guardar token hasheado" -> Okay, if we must hash it, we need a way to find it.
        // Let's assume we store the JWT directly for now to satisfy the "Store in DB" requirement without overcomplicating the lookup.
        // Wait, the prompt says "Guardar token hasheado". 
        // Okay, I will generate a random token (UUID), hash it, store it. 
        // But then I can't look it up by the raw token.
        // I will stick to storing the JWT as is, but maybe "hashed" meant "securely".
        // Let's use the JWT as the key.

        // RE-READING REQUIREMENT 1.3: "Guardar token hasheado".
        // Okay, I will generate a `resetId` and a `token`. Send `resetId` and `token` to user?
        // No, standard flow is one string.
        // Let's use the JWT. The JWT has a signature.
        // I will store the JWT string in the DB. It's already signed.
        // If I MUST hash it, I'll do it, but then I need to fetch all tokens for user and compare? No.
        // I'll store the JWT.

        // Actually, let's look at `findPasswordResetToken`. It queries by `token`.
        // So I must store the value I search for.
        // I will store the JWT.

        // Wait, `createPasswordResetToken` in repo takes `token`.
        // I will pass the JWT there.

        // But I need to verify it matches.
        // Let's verify the JWT first (stateless check).

        const user = await this.authRepository.findUserById(payload.sub);
        if (!user) throw new UnauthorizedException('User not found');

        // Now check DB
        // We need to find the token record.
        // Since we invalidated old ones, we can find by user_id?
        // But `findPasswordResetToken` uses `token`.
        // Let's try to find by the token string (dto.token).
        // If we stored the hash, this fails.
        // I will store the RAW token (dto.token) to enable lookup.
        // If security demands hashing, I would need to change the flow to send (id, token).
        // I will proceed with storing the raw JWT for this step to ensure functionality.

        // Wait, I can verify the hash if I fetch by user_id.
        // Let's fetch by user_id (which we got from JWT payload).
        // But `AuthRepository` doesn't have `findTokenByUserId`.
        // I'll use `findPasswordResetToken` with the token string.
        // So I must store the token string.

        // Correction: I will verify the JWT, then find the token in DB by `token` (the JWT string).
        // If found, proceed.

        // But wait, `createPasswordResetToken` hashes it in my previous thought? 
        // "const hashedToken = await bcrypt.hash(token, 10);" -> I will REMOVE this hashing to allow lookup.
        // Or I will use `findFirst` on `passwordResetTokens` where `user_id` matches, then compare hash.
        // Let's do the latter for "Enterprise" security.

        const tokens = await this.authRepository.findPasswordResetTokensByUserId(user.id);
        let validTokenRecord = null;
        for (const t of tokens) {
            if (await bcrypt.compare(dto.token, t.token)) {
                validTokenRecord = t;
                break;
            }
        }

        if (!validTokenRecord) {
            throw new UnauthorizedException('Invalid or expired reset token (db)');
        }

        if (validTokenRecord.used) {
            throw new UnauthorizedException('Token already used');
        }

        if (new Date() > validTokenRecord.expiresAt) {
            throw new UnauthorizedException('Token expired');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        await this.authRepository.updateUserPassword(user.id, hashedPassword);

        // Mark as used
        await this.authRepository.markPasswordResetTokenAsUsed(validTokenRecord.id);

        // Revoke all sessions
        await this.sessionService.revokeAllUserSessions(user.id);

        await this.auditService.log(user.id, 'PASSWORD_RESET_SUCCESS', 'AUTH');
        return true;
    }

    /**
     * Get all organizations the user has access to
     * SUPERADMIN can access all organizations
     * Regular users can only access their own organization
     */
    async getUserOrganizations(user_id: string) {
        const user = await this.authRepository.findUserById(user_id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const isSuperadmin = user.roles?.name === 'Superadmin';

        if (isSuperadmin) {
            // SUPERADMIN can see all organizations
            // Ensure UserContext is set to bypass tenant filtering
            const { UserContext } = await import('../../common/context/user.context');
            const { TenantContext } = await import('../../common/context/tenant.context');

            UserContext.setUser({
                id: user.id,
                roles: user.roles.name,
                isSuperadmin: true,
            });

            // Temporarily clear tenant context to allow querying all organizations
            const originalTenant = TenantContext.getTenantId();
            TenantContext.setTenantId(undefined as any);

            this.logger.log(`[getUserOrganizations] SUPERADMIN querying all organizations (tenant cleared)`);

            try {
                // For SUPERADMIN, query all organizations directly
                // Bypass tenant filtering by using PrismaClient without extension
                const directPrisma = this.directPrisma;

                const organizations = await directPrisma.organizations.findMany({
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        is_active: true,
                        created_at: true,
                        updated_at: true,
                    },
                    orderBy: {
                        name: 'asc',
                    },
                });

                this.logger.log(`[getUserOrganizations] SUPERADMIN found ${organizations.length} organizations: ${organizations.map(o => o.name).join(', ')}`);
                return organizations;
            } finally {
                // Restore tenant context
                if (originalTenant) {
                    TenantContext.setTenantId(originalTenant);
                }
            }
        }

        // Regular users can only see their own organization
        const organization = await this.prisma.organizations.findUnique({
            where: { id: user.organization_id },
            select: {
                id: true,
                name: true,
                slug: true,
                is_active: true,
                created_at: true, // Fixed: snake_case
                updated_at: true, // Fixed: snake_case
            },
        });

        if (!organization) {
            throw new NotFoundException('Organization not found');
        }

        return [organization];
    }

    /**
     * Switch user to a different organization
     * This updates the user's organization_id and generates new tokens
     */
    async switchOrganization(user_id: string, dto: SwitchOrganizationDto) {
        this.logger.log(`[switchOrganization] User ${user_id} switching to org ${dto.organization_id}`);

        // Verify user exists
        const user = await this.authRepository.findUserById(user_id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Check if user is SUPERADMIN
        const isSuperadmin = user.roles?.name === 'Superadmin';
        this.logger.log(`[switchOrganization] User is SUPERADMIN: ${isSuperadmin}`);

        // For SUPERADMIN, use direct PrismaClient to bypass tenant filtering
        let targetOrg;
        if (isSuperadmin) {
            const directPrisma = this.directPrisma;
            targetOrg = await directPrisma.organizations.findUnique({
                where: { id: dto.organization_id },
            });
        } else {
            // Verify target organization exists and is active
            targetOrg = await this.prisma.organizations.findUnique({
                where: { id: dto.organization_id },
            });
        }

        if (!targetOrg) {
            throw new NotFoundException('Organization not found');
        }

        if (!targetOrg.is_active) {
            throw new ForbiddenException('Organization is not active');
        }

        // Verify user belongs to this organization (unless SUPERADMIN)
        // SUPERADMIN can switch to any organization
        if (!isSuperadmin && user.organization_id !== dto.organization_id) {
            throw new ForbiddenException('You do not have access to this organization');
        }

        // If switching to the same organization, we still refresh tokens for security
        // This is useful for refreshing the session context

        // Get user's role in the target organization
        // For SUPERADMIN, try to find a Superadmin role in the target org, or use their current role
        let role;
        if (isSuperadmin) {
            // For SUPERADMIN, use direct PrismaClient to bypass tenant filtering
            const directPrisma = this.directPrisma;
            // Try to find Superadmin role in target organization
            role = await directPrisma.roles.findFirst({
                where: {
                    name: 'Superadmin',
                    organization_id: dto.organization_id,
                },
                include: {
                    role_permissions: {
                        include: {
                            permissions: true,
                        },
                    },
                },
            });

            // If no Superadmin role in target org, use user's current role (they're still SUPERADMIN)
            if (!role) {
                role = await directPrisma.roles.findFirst({
                    where: {
                        id: user.role_id,
                    },
                    include: {
                        role_permissions: {
                            include: {
                                permissions: true,
                            },
                        },
                    },
                });
            }
        } else {
            role = await this.prisma.roles.findFirst({
                where: {
                    id: user.role_id,
                    organization_id: dto.organization_id,
                },
                include: {
                    role_permissions: {
                        include: {
                            permissions: true,
                        },
                    },
                },
            });
        }

        if (!role) {
            // For SUPERADMIN, create a temporary role object if needed
            if (isSuperadmin) {
                this.logger.warn(`[switchOrganization] No role found for SUPERADMIN in org ${dto.organization_id}, using current role`);
                // Use user's current role but update organization context
                role = await this.prisma.roles.findFirst({
                    where: {
                        id: user.role_id,
                    },
                    include: {
                        role_permissions: {
                            include: {
                                permissions: true,
                            },
                        },
                    },
                });
            }

            if (!role) {
                throw new ForbiddenException('User does not have a role in this organization');
            }
        }

        // Revoke all existing sessions for security
        await this.sessionService.revokeAllUserSessions(user_id);

        // Create new session - Use unique UUID for pending token to avoid unique constraint violations
        const pendingToken = `PENDING_${require('crypto').randomUUID()}`;
        const newSession = await this.sessionService.createSession(user_id, pendingToken);

        // Generate new tokens with updated organization context
        const tokens = await this.tokenService.generateTokens({
            sub: user.id,
            email: user.email,
            roles: role.name,
            sid: newSession.id,
            orgId: dto.organization_id,
        });

        const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
        await this.sessionService.updateSessionToken(newSession.id, hashedRefreshToken);

        // Log the organization switch
        await this.auditService.log(user_id, 'SWITCH_ORGANIZATION', 'AUTH', {
            fromOrgId: user.organization_id,
            toOrgId: dto.organization_id,
        });

        return {
            organization: targetOrg,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        };
    }
}
