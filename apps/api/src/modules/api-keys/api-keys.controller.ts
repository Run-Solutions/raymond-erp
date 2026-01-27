import { Controller, Post, Body, Get, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('API Keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class ApiKeysController {
    constructor(private readonly apiKeysService: ApiKeysService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new API Key' })
    create(@Request() req, @Body() body: { name: string; scopes?: string[] }) {
        return this.apiKeysService.createApiKey(
            req.user.id,
            req.user.organization_id,
            body.name,
            body.scopes
        );
    }

    @Get()
    @ApiOperation({ summary: 'List API Keys' })
    findAll(@Request() req) {
        return this.apiKeysService.listKeys(req.user.organization_id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Revoke an API Key' })
    remove(@Request() req, @Param('id') id: string) {
        return this.apiKeysService.revokeKey(id, req.user.organization_id);
    }
}
