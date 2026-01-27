import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { hasFinancialAccess } from '../constants/roles.constants';

/**
 * Financial Guard
 * Layer 2: NestJS Controller-level protection for financial modules
 * 
 * This guard ensures only authorized roles can access financial controllers.
 * Apply this to ALL financial controllers with @UseGuards(FinancialGuard)
 */

@Injectable()
export class FinancialGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.roles) {
            throw new ForbiddenException('Authentication required for financial access');
        }

        const userRole = typeof user.roles === 'object' ? user.roles.name : user.roles;
        const hasAccess = hasFinancialAccess(userRole);

        if (!hasAccess) {
            throw new ForbiddenException(
                `Access Denied: Financial module access is restricted. Your role '${userRole}' does not have financial permissions.`
            );
        }

        return true;
    }
}
