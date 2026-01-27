import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { EXECUTIVE_ROLES } from '../constants/roles.constants';

/**
 * Guard que verifica que el usuario sea Superadmin o CEO
 * Solo estos roles pueden gestionar roles y permisos
 */
@Injectable()
export class SuperadminCeoGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('Authentication required');
        }

        // Bypass para el superadmin por email (legacy)
        if (user.email === 'j.molina@runsolutions-services.com') {
            return true;
        }

        // Verificar que el rol del usuario sea Superadmin o CEO
        // El rol puede venir como string (user.roles) o como objeto (user.roles.name)
        const roleName = typeof user.roles === 'string' 
            ? user.roles 
            : user.roles?.name || user.roleName || '';
        
        if (!roleName) {
            throw new ForbiddenException('User role not found');
        }

        const normalizedRole = roleName.toUpperCase().trim();

        // Verificar si es Superadmin o CEO
        const isSuperadmin = EXECUTIVE_ROLES.some(
            role => role.toUpperCase() === normalizedRole
        );

        if (!isSuperadmin) {
            throw new ForbiddenException(
                'Access denied. Only Superadmin and CEO can manage roles and permissions.'
            );
        }

        return true;
    }
}
