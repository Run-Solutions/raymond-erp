import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        // BYPASS AUTH FOR DEVELOPMENT
        if (process.env.NODE_ENV === 'development') {
            const request = context.switchToHttp().getRequest();
            // Inject a mock admin user if no real token/user
            if (!request.user) {
                request.user = {
                    id: 'dev-user-id',
                    email: 'admin@raymond-erp.com',
                    organization_id: '1',
                    roles: 'Superadmin',
                    isSuperadmin: true
                };
            }
            console.log('[JwtAuthGuard] BYPASS for development with mock user');
            return true;
        }

        const request = context.switchToHttp().getRequest();
        return super.canActivate(context);
    }

    handleRequest(err, user, info) {
        // BYPASS FOR DEVELOPMENT
        if (process.env.NODE_ENV === 'development') {
            return user || {
                id: 'dev-user-id',
                email: 'admin@raymond-erp.com',
                organization_id: '1',
                roles: 'Superadmin',
                isSuperadmin: true
            };
        }

        if (err || !user) {
            throw err || new UnauthorizedException('Unauthorized');
        }
        return user;
    }
}
