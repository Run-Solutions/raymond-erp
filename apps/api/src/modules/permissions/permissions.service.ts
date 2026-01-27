import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createDto: CreatePermissionDto, currentUser?: any) {
        // SECURITY: Solo SUPERADMIN puede crear permisos marcados como is_superadmin_only
        if (createDto.is_superadmin_only && (!currentUser || !currentUser.isSuperadmin)) {
            throw new BadRequestException(
                'Only Superadmin can create permissions marked as superadmin-only'
            );
        }
        // Verificar que no exista un permiso con el mismo resource y action
        const existing = await this.prisma.permissions.findFirst({
            where: {
                resource: createDto.resource,
                action: createDto.action,
            },
        });

        if (existing) {
            throw new ConflictException(
                `Permission with resource "${createDto.resource}" and action "${createDto.action}" already exists`
            );
        }

        return this.prisma.permissions.create({
            data: {
                id: require('crypto').randomUUID(),
                ...createDto,
                updated_at: new Date(), // Added missing field
            } as any,
        });
    }

    async findAll() {
        return this.prisma.permissions.findMany({
            include: {
                _count: {
                    select: { role_permissions: true },
                },
            },
            orderBy: [
                { resource: 'asc' },
                { action: 'asc' },
            ],
        });
    }

    async findByResource(resource: string) {
        return this.prisma.permissions.findMany({
            where: { resource },
            include: {
                _count: {
                    select: { role_permissions: true },
                },
            },
            orderBy: { action: 'asc' },
        });
    }

    async findOne(id: string) {
        const permission = await this.prisma.permissions.findUnique({
            where: { id },
            include: {
                role_permissions: {
                    include: {
                        roles: {
                            select: {
                                id: true,
                                name: true,
                                organization_id: true,
                            },
                        },
                    },
                },
            },
        });

        if (!permission) {
            throw new NotFoundException('Permission not found');
        }

        return permission;
    }

    async update(id: string, updateDto: UpdatePermissionDto, currentUser?: any) {
        const permission = await this.findOne(id);

        // SECURITY: Solo SUPERADMIN puede modificar permisos que son is_superadmin_only
        if (permission.is_superadmin_only && (!currentUser || !currentUser.isSuperadmin)) {
            throw new BadRequestException(
                'Only Superadmin can modify superadmin-only permissions'
            );
        }

        // SECURITY: Solo SUPERADMIN puede cambiar is_superadmin_only a true
        if (updateDto.is_superadmin_only && (!currentUser || !currentUser.isSuperadmin)) {
            throw new BadRequestException(
                'Only Superadmin can mark permissions as superadmin-only'
            );
        }

        // Si se está cambiando resource o action, verificar que no exista otro con esos valores
        if (updateDto.resource || updateDto.action) {
            const newResource = updateDto.resource || permission.resource;
            const newAction = updateDto.action || permission.action;

            const existing = await this.prisma.permissions.findFirst({
                where: {
                    resource: newResource,
                    action: newAction,
                },
            });

            if (existing && existing.id !== id) {
                throw new ConflictException(
                    `Permission with resource "${newResource}" and action "${newAction}" already exists`
                );
            }
        }

        return this.prisma.permissions.update({
            where: { id },
            data: updateDto,
        });
    }

    async remove(id: string, currentUser?: any) {
        const permission = await this.findOne(id);

        // SECURITY: Solo SUPERADMIN puede eliminar permisos is_superadmin_only
        if (permission.is_superadmin_only && (!currentUser || !currentUser.isSuperadmin)) {
            throw new BadRequestException(
                'Only Superadmin can delete superadmin-only permissions'
            );
        }

        // Verificar que no esté asignado a ningún rol
        const roleCount = await this.prisma.role_permissions.count({
            where: { permission_id: id }, // Fixed: snake_case
        });

        if (roleCount > 0) {
            throw new ConflictException(
                `Cannot delete permission. It is assigned to ${roleCount} role(s). Please remove it from roles first.`
            );
        }

        return this.prisma.permissions.delete({
            where: { id },
        });
    }

    async getResources() {
        try {
            // Get all permissions and extract unique resources
            // Note: Permission is a global model (not tenant-specific)
            const permissions = await this.prisma.permissions.findMany({
                select: { resource: true },
            });

            // Extract unique resources and sort
            const uniqueResources = Array.from(
                new Set(permissions.map(p => p.resource))
            ).sort();

            console.log(`[PermissionsService] Found ${uniqueResources.length} unique resources`);
            return uniqueResources;
        } catch (error) {
            console.error('[PermissionsService] Error in getResources:', error);
            if (error instanceof Error) {
                console.error('[PermissionsService] Error details:', {
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                });
            }
            throw error;
        }
    }
}
