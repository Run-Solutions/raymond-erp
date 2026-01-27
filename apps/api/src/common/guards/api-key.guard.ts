import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private readonly apiKeysService: ApiKeysService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];

        if (!apiKey) {
            // Security: If this guard is used, API key is required
            // Don't allow fallthrough to avoid confusion about authentication requirements
            throw new UnauthorizedException('API Key required');
        }

        try {
            const keyRecord = await this.apiKeysService.validateApiKey(apiKey);

            // Attach user to request, similar to JWT strategy
            request.user = {
                id: keyRecord.user.id,
                email: keyRecord.user.email,
                roles: keyRecord.user.roles.name,
                organization_id: keyRecord.organization_id,
                isApiKey: true,
                scopes: keyRecord.scopes,
            };

            return true;
        } catch (error) {
            throw new UnauthorizedException('Invalid API Key');
        }
    }
}
