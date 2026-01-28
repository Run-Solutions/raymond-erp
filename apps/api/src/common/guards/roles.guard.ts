import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthRepository } from '../../modules/auth/auth.repository';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private authRepository: AuthRepository
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // BYPASS FOR DEVELOPMENT
        if (process.env.NODE_ENV === 'development') {
            return true;
        }

        const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
        if (!requiredRoles) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.role_id) {
            throw new ForbiddenException('User role not found');
        }

        // Fetch role name from DB if not in user object (though we put it in JWT usually)
        // Optimization: If role name is in JWT, use it.
        // Assuming role name is in user.roles from JWT strategy

        if (requiredRoles.includes(user.roles)) {
            return true;
        }

        throw new ForbiddenException('Insufficient role permissions');
    }
}
