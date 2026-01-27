import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../context/tenant.context';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
    constructor(private readonly jwtService: JwtService) { }

    use(req: Request, res: Response, next: NextFunction) {
        const tenantHeader = (req.headers['x-org-id'] || req.headers['x-tenant-id']) as string;
        const authHeader = req.headers.authorization;

        let tenantId = tenantHeader;
        let isSuperadmin = false;

        // If no header, try to extract from JWT (if present)
        if (!tenantId && authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const payload = this.jwtService.decode(token) as any;
                // Check if user is SuperAdmin
                isSuperadmin = payload?.roles === 'Superadmin';

                if (payload && payload.orgId) {
                    tenantId = payload.orgId;
                }
            } catch (e) {
                // Ignore invalid token here, let Guard handle it
            }
        }

        // Always set tenant context if we have a value
        // Header takes priority over JWT (allows SUPERADMIN to switch orgs)
        if (tenantHeader) {
            TenantContext.setTenantId(tenantHeader);
            if (process.env.NODE_ENV === 'development') {
                console.log(`[TenantMiddleware] Set tenant from header: ${tenantHeader}`);
            }
        } else if (tenantId) {
            TenantContext.setTenantId(tenantId);
            if (process.env.NODE_ENV === 'development') {
                console.log(`[TenantMiddleware] Set tenant from JWT: ${tenantId}`);
            }
        } else if (isSuperadmin) {
            // CRITICAL: SuperAdmin global without org - allow access without tenant
            if (process.env.NODE_ENV === 'development') {
                console.log(`[TenantMiddleware] SuperAdmin global access - no tenant context`);
            }
        } else {
            // Regular user without tenant context - log warning
            if (process.env.NODE_ENV === 'development') {
                console.warn(`[TenantMiddleware] WARNING: No tenant context for regular user`);
            }
        }

        next();
    }
}
