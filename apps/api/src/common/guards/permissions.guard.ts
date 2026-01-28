import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../services/permission.service';
import { PermissionConfig } from '../decorators/permissions.decorator';

/**
 * Enhanced Permissions Guard
 * Supports RBAC + PBAC + TBAC with scope validation
 */

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly permissionService: PermissionService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            // BYPASS FOR DEVELOPMENT
            if (process.env.NODE_ENV === 'development') {
                console.log('[PermissionsGuard] BYPASS for development (no user)');
                return true;
            }
            throw new ForbiddenException('Authentication required');
        }

        // BYPASS FOR DEVELOPMENT
        if (process.env.NODE_ENV === 'development') {
            console.log(`[PermissionsGuard] BYPASS for development (user: ${user.email})`);
            return true;
        }

        // Check if permissions check should be skipped
        const skipPermissions = this.reflector.get<boolean>(
            'skip_permissions',
            context.getHandler()
        );

        if (skipPermissions) {
            // Endpoint marked to skip permissions check (e.g., updating own profile)
            return true;
        }

        // Super Admin Bypass - Check if user has super admin role instead of hardcoded email
        // TODO: Replace with proper role-based check (e.g., user.roles.name === 'Super Admin')
        // For now, keeping email check but should be moved to database role check
        const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
        if (superAdminEmails.includes(user.email)) {
            // Log super admin access for audit purposes
            if (process.env.NODE_ENV === 'development') {
                console.log(`[PermissionsGuard] Super admin bypass for: ${user.email}`);
            }
            return true;
        }

        // Check basic permissions (legacy support)
        const requiredPermissions = this.reflector.get<string[]>(
            'permissions',
            context.getHandler()
        );

        if (requiredPermissions && requiredPermissions.length > 0) {
            const hasPermissions = await this.permissionService.hasPermissions(
                user.id,
                requiredPermissions
            );

            if (!hasPermissions) {
                throw new ForbiddenException(
                    `Missing required permissions: ${requiredPermissions.join(', ')}`
                );
            }
        }

        // Check advanced permission configs
        const permissionConfigs = this.reflector.get<PermissionConfig[]>(
            'permission_configs',
            context.getHandler()
        );

        if (permissionConfigs && permissionConfigs.length > 0) {
            for (const config of permissionConfigs) {
                const hasPermission = await this.permissionService.hasAdvancedPermission(
                    user.id,
                    config,
                    request.params?.id, // Assume resource ID is in params
                );

                if (!hasPermission) {
                    throw new ForbiddenException(
                        `Missing permission: ${config.resource}:${config.action} with scope ${config.scope || 'all'}`
                    );
                }
            }
        }

        // Check financial access
        const requireFinancialAccess = this.reflector.get<boolean>(
            'require_financial_access',
            context.getHandler()
        );

        if (requireFinancialAccess) {
            const hasFinancialAccess = await this.permissionService.hasFinancialAccess(user.id);

            if (!hasFinancialAccess) {
                throw new ForbiddenException('Financial access required');
            }
        }

        // Check minimum role level
        const minimumRoleLevel = this.reflector.get<number>(
            'minimum_role_level',
            context.getHandler()
        );

        if (minimumRoleLevel) {
            const hasMinimumLevel = await this.permissionService.hasMinimumRoleLevel(
                user.id,
                minimumRoleLevel
            );

            if (!hasMinimumLevel) {
                throw new ForbiddenException(
                    `Requires role level ${minimumRoleLevel} or higher`
                );
            }
        }

        // Check role category
        const requiredCategories = this.reflector.get<string[]>(
            'required_role_categories',
            context.getHandler()
        );

        if (requiredCategories && requiredCategories.length > 0) {
            const hasCategory = await this.permissionService.hasRoleCategory(
                user.id,
                requiredCategories
            );

            if (!hasCategory) {
                throw new ForbiddenException(
                    `Requires role category: ${requiredCategories.join(' or ')}`
                );
            }
        }

        return true;
    }
}
