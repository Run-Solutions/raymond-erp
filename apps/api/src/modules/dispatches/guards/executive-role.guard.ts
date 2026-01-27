import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { hasCommandCenterAccess } from '../../../common/constants/roles.constants';

@Injectable()
export class ExecutiveRoleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.roles) {
            throw new ForbiddenException('User role not found');
        }

        // Check if user has Command Center access (Executives + Project Managers)
        const roleName = typeof user.roles === 'string' ? user.roles : user.roles?.name || '';
        if (!hasCommandCenterAccess(roleName)) {
            throw new ForbiddenException('Access denied. Command Center is only available to executives and project managers.');
        }

        return true;
    }
}
