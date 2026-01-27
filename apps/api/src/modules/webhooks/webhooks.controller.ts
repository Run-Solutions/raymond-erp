import { Controller, Post, Body, Get, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class WebhooksController {
    constructor(private readonly webhooksService: WebhooksService) { }

    @Post()
    @ApiOperation({ summary: 'Register a new Webhook' })
    create(@Request() req, @Body() body: { url: string; event: string; secret?: string }) {
        return this.webhooksService.registerWebhook(
            req.user.organization_id,
            body.url,
            body.event,
            body.secret
        );
    }

    @Get()
    @ApiOperation({ summary: 'List Webhooks' })
    findAll(@Request() req) {
        return this.webhooksService.listWebhooks(req.user.organization_id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a Webhook' })
    remove(@Request() req, @Param('id') id: string) {
        return this.webhooksService.deleteWebhook(id, req.user.organization_id);
    }
}
