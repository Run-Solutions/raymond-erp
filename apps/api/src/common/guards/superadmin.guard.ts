import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Guard que verifica que el usuario sea Superadmin GLOBAL
 * Solo SuperAdmin puede acceder a endpoints globales del sistema
 */
@Injectable()
export class SuperadminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('Authentication required');
        }

        // Verificar que el usuario sea Superadmin
        const isSuperadmin = user.isSuperadmin === true || user.roles === 'Superadmin';

        if (!isSuperadmin) {
            throw new ForbiddenException('SuperAdmin access required. Only global SuperAdmin can access this resource.');
        }

        if (process.env.NODE_ENV === 'development') {
            console.log(`[SuperadminGuard] SuperAdmin access granted for user: ${user.id}`);
        }

        return true;
    }
}
