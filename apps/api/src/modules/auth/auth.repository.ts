import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findUserByEmail(email: string) {
        // Use findFirst since email is part of composite unique key (email_organization_id)
        // During login, we don't know organization_id yet
        return this.prisma.users.findFirst({
            where: { email },
            include: { roles: { include: { role_permissions: { include: { permissions: true } } } } },
        });
    }

    async findUserById(id: string) {
        return this.prisma.users.findUnique({
            where: { id },
            include: { roles: { include: { role_permissions: { include: { permissions: true } } } } },
        });
    }

    async updateUserPassword(user_id: string, password: string) {
        return this.prisma.users.update({
            where: { id: user_id },
            data: { password },
        });
    }

    async createPasswordResetToken(user_id: string, token: string, expiresAt: Date) {
        // Invalidate existing tokens
        await this.prisma.password_reset_tokens.deleteMany({ where: { user_id } });

        return this.prisma.password_reset_tokens.create({
            data: {
                id: randomUUID(),
                user_id,
                token,
                expires_at: expiresAt,
            },
        });
    }

    async findPasswordResetToken(token: string) {
        return this.prisma.password_reset_tokens.findUnique({
            where: { token },
            include: { user: true },
        });
    }

    async findPasswordResetTokensByUserId(user_id: string) {
        return this.prisma.password_reset_tokens.findMany({
            where: { user_id },
        });
    }

    async markPasswordResetTokenAsUsed(id: string) {
        return this.prisma.password_reset_tokens.update({
            where: { id },
            data: { used: true },
        });
    }

    async deletePasswordResetToken(id: string) {
        return this.prisma.password_reset_tokens.delete({
            where: { id },
        });
    }

    async createOrganizationWithAdmin(dto: RegisterDto & { password: string; organizationName: string }) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Create Organization
            const org = await tx.organizations.create({
                data: {
                    id: randomUUID(),
                    name: dto.organizationName,
                    slug: `${dto.organizationName.toLowerCase().replace(/ /g, '-')}-${Date.now()}`,
                    updated_at: new Date(),
                } as any,
            });

            // 2. Create Admin Role for this Org
            const adminRoleId = randomUUID();
            const adminRole = await tx.roles.create({
                data: {
                    id: adminRoleId,
                    name: 'ADMIN',
                    description: 'Organization Administrator',
                    is_system: true,
                    organization_id: org.id,
                } as any,
            });

            // 3. Create User
            const userId = randomUUID();
            const user = await tx.users.create({
                data: {
                    id: userId,
                    email: dto.email,
                    password: dto.password,
                    first_name: dto.first_name,
                    last_name: dto.last_name,
                    organization_id: org.id,
                    role_id: adminRole.id,
                } as any,
                include: { roles: true },
            });

            return { user, organization: org };
        });
    }

    async createUser(dto: RegisterDto, hashedPassword: string, role_id: string) {
        // Deprecated or needs update for invites
        throw new Error('Use createOrganizationWithAdmin or inviteUser');
    }

    async findRoleByName(name: string, organization_id: string) {
        return this.prisma.roles.findUnique({
            where: { name_organization_id: { name, organization_id } },
        });
    }
}
