import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

@Injectable()
export class RolesService {
    constructor(private prisma: PrismaService) { }

    async create(createRoleDto: CreateRoleDto, organization_id: string, currentUser?: any) {
        const existing = await this.prisma.roles.findUnique({
            where: { name_organization_id: { name: createRoleDto.name, organization_id } },
        });
        if (existing) throw new ConflictException('Role already exists');

        // SECURITY: Solo SUPERADMIN puede crear roles con nivel >= 100
        const roleLevel = createRoleDto.level || 1;
        if (roleLevel >= 100 && (!currentUser || !currentUser.isSuperadmin)) {
            throw new BadRequestException(
                'Only Superadmin can create roles with level 100 or higher'
            );
        }

        // SECURITY: CEO no puede crear roles de su nivel o superior (nivel > 90)
        if (currentUser && currentUser.isCEO && !currentUser.isSuperadmin && roleLevel > 90) {
            throw new BadRequestException(
                'CEO cannot create roles with level higher than 90'
            );
        }

        return this.prisma.roles.create({
            data: {
                id: require('crypto').randomUUID(),
                ...createRoleDto,
                organization_id, // Fixed: use scalar field
            } as any,
            include: {
                role_permissions: { // Fixed: permissions -> role_permissions
                    include: { permissions: true }, // Fixed: permission -> permissions
                },
                _count: { select: { users: true } },
            },
        });
    }

    async findAll(organization_id: string, currentUser?: any) {
        const roles = await this.prisma.roles.findMany({
            where: { organization_id },
            include: {
                _count: { select: { users: true } },
                role_permissions: { // Fixed: permissions -> role_permissions
                    include: { permissions: true }, // Fixed: permission -> permissions
                },
            },
            orderBy: { level: 'desc' },
        });

        // CRITICAL SECURITY: Filter roles based on user level
        if (!currentUser) {
            // No user context - show only basic roles
            return roles.filter(role => role.name !== 'Superadmin' && role.level <= 90);
        }

        if (!currentUser.isSuperadmin) {
            // Non-Superadmin users cannot see Superadmin role
            let filteredRoles = roles.filter(role => role.name !== 'Superadmin');

            // CEO can only see roles with level <= 90
            if (currentUser.isCEO) {
                filteredRoles = filteredRoles.filter(role => role.level <= 90);
            }

            return filteredRoles;
        }

        // Superadmin sees all roles
        return roles;
    }

    async findOne(id: string, organization_id: string) {
        const role = await this.prisma.roles.findFirst({
            where: { id, organization_id },
            include: {
                role_permissions: { // Fixed: permissions -> role_permissions
                    include: { permissions: true }, // Fixed: permission -> permissions
                    orderBy: { permissions: { resource: 'asc' } }, // Fixed: permission -> permissions
                },
                _count: { select: { users: true } },
            },
        });
        if (!role) throw new NotFoundException('Role not found');
        return role;
    }

    async update(id: string, organization_id: string, updateRoleDto: UpdateRoleDto, currentUser?: any) {
        const role = await this.findOne(id, organization_id);

        // CRITICAL SECURITY: Only Superadmin can modify Superadmin role
        if (role.name === 'Superadmin' && (!currentUser || !currentUser.isSuperadmin)) {
            throw new BadRequestException('Only Superadmin can modify the Superadmin role');
        }

        // SECURITY: Solo SUPERADMIN puede modificar roles de nivel >= 100
        if (role.level >= 100 && (!currentUser || !currentUser.isSuperadmin)) {
            throw new BadRequestException(
                'Only Superadmin can modify roles with level 100 or higher'
            );
        }

        // SECURITY: CEO no puede modificar roles de nivel superior al suyo
        if (currentUser && currentUser.isCEO && !currentUser.isSuperadmin && role.level > 90) {
            throw new BadRequestException(
                'CEO cannot modify roles with level higher than 90'
            );
        }

        // SECURITY: CEO no puede cambiar el nivel a un valor superior a 90
        if (updateRoleDto.level && updateRoleDto.level > 90 && currentUser && currentUser.isCEO && !currentUser.isSuperadmin) {
            throw new BadRequestException(
                'CEO cannot set role level higher than 90'
            );
        }

        // No permitir cambiar is_system si es un rol del sistema
        if (role.is_system && updateRoleDto.is_system === false) {
            throw new BadRequestException('Cannot change is_system flag for system roles');
        }

        return this.prisma.roles.update({
            where: { id },
            data: updateRoleDto,
            include: {
                role_permissions: { // Fixed: permissions -> role_permissions
                    include: { permissions: true }, // Fixed: permission -> permissions
                },
                _count: { select: { users: true } },
            },
        });
    }

    async remove(id: string, organization_id: string, currentUser?: any) {
        const role = await this.findOne(id, organization_id);

        // CRITICAL SECURITY: Only Superadmin can delete Superadmin role
        if (role.name === 'Superadmin' && (!currentUser || !currentUser.isSuperadmin)) {
            throw new BadRequestException('Only Superadmin can delete the Superadmin role');
        }

        // SECURITY: Solo SUPERADMIN puede eliminar roles de nivel >= 100
        if (role.level >= 100 && (!currentUser || !currentUser.isSuperadmin)) {
            throw new BadRequestException(
                'Only Superadmin can delete roles with level 100 or higher'
            );
        }

        // SECURITY: CEO no puede eliminar roles de nivel superior a 90
        if (currentUser && currentUser.isCEO && !currentUser.isSuperadmin && role.level > 90) {
            throw new BadRequestException(
                'CEO cannot delete roles with level higher than 90'
            );
        }

        if (role.is_system) {
            throw new ConflictException('Cannot delete system role');
        }

        // Verificar que no tenga usuarios asignados
        const userCount = await this.prisma.users.count({
            where: { role_id: id },
        });

        if (userCount > 0) {
            throw new ConflictException(
                `Cannot delete role. It has ${userCount} user(s) assigned. Please reassign users first.`
            );
        }

        return this.prisma.roles.delete({
            where: { id },
        });
    }

    async assignPermissions(id: string, organization_id: string, assignDto: AssignPermissionsDto, currentUser?: any) {
        const role = await this.findOne(id, organization_id);

        // CRITICAL SECURITY: Only Superadmin can modify Superadmin role permissions
        if (role.name === 'Superadmin' && (!currentUser || !currentUser.isSuperadmin)) {
            throw new BadRequestException('Only Superadmin can modify Superadmin role permissions');
        }

        // SECURITY: Solo SUPERADMIN puede modificar permisos de roles de nivel >= 100
        if (role.level >= 100 && (!currentUser || !currentUser.isSuperadmin)) {
            throw new BadRequestException(
                'Only Superadmin can modify permissions for roles with level 100 or higher'
            );
        }

        // SECURITY: CEO no puede modificar permisos de roles de nivel superior a 90
        if (currentUser && currentUser.isCEO && !currentUser.isSuperadmin && role.level > 90) {
            throw new BadRequestException(
                'CEO cannot modify permissions for roles with level higher than 90'
            );
        }

        // Verificar que todos los permisos existan
        const permissions = await this.prisma.permissions.findMany({
            where: { id: { in: assignDto.permissionIds } },
        });

        if (permissions.length !== assignDto.permissionIds.length) {
            throw new NotFoundException('One or more permissions not found');
        }

        // CRITICAL SECURITY: Solo SUPERADMIN puede asignar permisos is_superadmin_only
        const superadminOnlyPermissions = permissions.filter(p => p.is_superadmin_only);
        if (superadminOnlyPermissions.length > 0 && (!currentUser || !currentUser.isSuperadmin)) {
            const permissionNames = superadminOnlyPermissions.map(p => `${p.resource}:${p.action}`).join(', ');
            throw new BadRequestException(
                `Only Superadmin can assign superadmin-only permissions: ${permissionNames}`
            );
        }

        // Eliminar permisos actuales
        await this.prisma.role_permissions.deleteMany({
            where: { role_id: id },
        });

        // Asignar nuevos permisos
        if (assignDto.permissionIds.length > 0) {
            await this.prisma.role_permissions.createMany({
                data: assignDto.permissionIds.map(permission_id => ({ // Fixed: snake_case
                    role_id: id,
                    permission_id, // Fixed: snake_case
                })),
            });
        }

        return this.findOne(id, organization_id);
    }

    async removePermission(id: string, organization_id: string, permissionId: string, currentUser?: any) {
        const role = await this.findOne(id, organization_id);

        // CRITICAL SECURITY: Only Superadmin can modify Superadmin role permissions
        if (role.name === 'Superadmin' && (!currentUser || !currentUser.isSuperadmin)) {
            throw new BadRequestException('Only Superadmin can modify Superadmin role permissions');
        }

        // SECURITY: Solo SUPERADMIN puede modificar permisos de roles de nivel >= 100
        if (role.level >= 100 && (!currentUser || !currentUser.isSuperadmin)) {
            throw new BadRequestException(
                'Only Superadmin can modify permissions for roles with level 100 or higher'
            );
        }

        // SECURITY: CEO no puede modificar permisos de roles de nivel superior a 90
        if (currentUser && currentUser.isCEO && !currentUser.isSuperadmin && role.level > 90) {
            throw new BadRequestException(
                'CEO cannot modify permissions for roles with level higher than 90'
            );
        }

        // Verificar que el permiso exista y obtener sus datos
        const permission = await this.prisma.permissions.findUnique({
            where: { id: permissionId },
        });

        if (!permission) {
            throw new NotFoundException('Permission not found');
        }

        // CRITICAL SECURITY: Solo SUPERADMIN puede remover permisos is_superadmin_only
        if (permission.is_superadmin_only && (!currentUser || !currentUser.isSuperadmin)) {
            throw new BadRequestException(
                `Only Superadmin can remove superadmin-only permission: ${permission.resource}:${permission.action}`
            );
        }

        await this.prisma.role_permissions.delete({
            where: {
                role_id_permission_id: { // Fixed: snake_case
                    role_id: id,
                    permission_id: permissionId, // Fixed: snake_case
                },
            },
        });

        return this.findOne(id, organization_id);
    }
}
