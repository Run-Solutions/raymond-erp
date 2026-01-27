import { SetMetadata } from '@nestjs/common';

/**
 * Advanced Permission Decorators
 * Supports 8 permission levels: Read, Create, Update, Delete, Export, Approve, Manage, Admin
 */

export enum PermissionAction {
    READ = 'read',
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    EXPORT = 'export',
    APPROVE = 'approve',
    MANAGE = 'manage',
    ADMIN = 'admin',
}

export enum PermissionScope {
    OWN = 'own',       // Only own resources
    TEAM = 'team',     // Team resources
    DEPARTMENT = 'department', // Department resources
    ALL = 'all',       // All resources
}

export interface PermissionConfig {
    resource: string;
    action: PermissionAction;
    scope?: PermissionScope;
    conditions?: Record<string, any>;
}

/**
 * Basic Permissions Decorator
 * @example @Permissions('projects:create', 'projects:update')
 */
export const Permissions = (...permissions: string[]) =>
    SetMetadata('permissions', permissions);

/**
 * Advanced Permissions Decorator with Scope
 * @example @RequirePermissions({ resource: 'projects', action: PermissionAction.UPDATE, scope: PermissionScope.OWN })
 */
export const RequirePermissions = (...configs: PermissionConfig[]) =>
    SetMetadata('permission_configs', configs);

/**
 * Financial Access Decorator
 * Shorthand for financial module access
 */
export const RequireFinancialAccess = () =>
    SetMetadata('require_financial_access', true);

/**
 * Minimum Role Level Decorator
 * @example @MinimumRoleLevel(7) // Requires level 7 or higher
 */
export const MinimumRoleLevel = (level: number) =>
    SetMetadata('minimum_role_level', level);

/**
 * Role Category Decorator
 * @example @RequireRoleCategory('financial', 'executive')
 */
export const RequireRoleCategory = (...categories: string[]) =>
    SetMetadata('required_role_categories', categories);

/**
 * Scope-based Access Decorator
 * @example @ScopeAccess(PermissionScope.OWN)
 */
export const ScopeAccess = (scope: PermissionScope) =>
    SetMetadata('access_scope', scope);

/**
 * Skip Permissions Check Decorator
 * Use this decorator to bypass permission checks for endpoints that should be accessible
 * to all authenticated users (e.g., updating own profile)
 * @example @SkipPermissions()
 */
export const SkipPermissions = () =>
    SetMetadata('skip_permissions', true);
