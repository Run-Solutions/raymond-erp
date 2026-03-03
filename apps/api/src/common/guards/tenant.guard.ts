import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TenantContext } from '../context/tenant.context';
import { UserContext } from '../context/user.context';

@Injectable()
export class TenantGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();

        const user = request.user;
        console.log(`[TenantGuard] User: ${JSON.stringify(user)}`);

        if (!user) {
            console.log(`[TenantGuard] User missing`);
            throw new UnauthorizedException('Authentication required');
        }
        // CRITICAL: SUPERADMIN can have organization_id = NULL (global access)
        const isSuperadmin = user.roles === 'Superadmin' || user.isSuperadmin === true;

        // For global SuperAdmin, organization_id can be NULL
        if (!isSuperadmin && !user.organization_id) {
            console.log(`[TenantGuard] Regular user has no organization_id`);
            throw new UnauthorizedException('User has no organization assigned');
        }

        // Set user context for Prisma extension
        UserContext.setUser({
            id: user.id,
            roles: user.roles,
            isSuperadmin,
        });

        // Optional: Validate x-org-id/x-tenant-id header matches user.organization_id if strict header check is required
        const tenantHeader = (request.headers['x-org-id'] || request.headers['x-tenant-id']);
        if (tenantHeader) {
            // For SUPERADMIN, allow any organization header
            // For regular users, header must match their organization
            if (!isSuperadmin && tenantHeader !== user.organization_id) {
                throw new UnauthorizedException('Tenant mismatch');
            }
            // For SUPERADMIN, use the header org if provided
            if (isSuperadmin && tenantHeader) {
                user.organization_id = tenantHeader;
            }
        }

        // Ensure CLS context is set (Double check)
        const ctxTenant = TenantContext.getTenantId();
        // For SUPERADMIN, prioritize header over token orgId (allows switching orgs)
        // For regular users, use their assigned organization_id
        // For global SuperAdmin without header, targetOrgId can be NULL
        const targetOrgId = isSuperadmin && tenantHeader ? tenantHeader : user.organization_id;

        console.log(`[TenantGuard] Setting tenant context - isSuperadmin: ${isSuperadmin}, tenantHeader: ${tenantHeader}, user.orgId: ${user.organization_id}, targetOrgId: ${targetOrgId}`);

        if (targetOrgId) {
            // Only set tenant context if we have a target org
            if (!ctxTenant || ctxTenant !== targetOrgId) {
                // If middleware didn't set it (e.g. public route becoming protected), set it now
                TenantContext.setTenantId(targetOrgId);
                console.log(`[TenantGuard] TenantContext updated to: ${targetOrgId}`);
            } else {
                console.log(`[TenantGuard] TenantContext already set to: ${ctxTenant}`);
            }
        } else if (isSuperadmin) {
            // Global SuperAdmin without specific org - no tenant context needed
            console.log(`[TenantGuard] Global SuperAdmin - no tenant context`);
        }

        return true;
    }
}
