import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../database/prisma.service';
import { lastValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
    private readonly logger = new Logger(WebhooksService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly httpService: HttpService,
    ) { }

    async registerWebhook(organization_id: string, url: string, event: string, secret?: string) {
        return this.prisma.webhooks.create({ // Fixed: plural
            data: {
                id: require('crypto').randomUUID(),
                organization_id,
                url,
                event,
                secret,
            } as any,
        });
    }

    async listWebhooks(organization_id: string) {
        return this.prisma.webhooks.findMany({ // Fixed: plural
            where: { organization_id },
        });
    }

    async deleteWebhook(id: string, organization_id: string) {
        return this.prisma.webhooks.deleteMany({ // Fixed: plural
            where: { id, organization_id },
        });
    }

    async triggerWebhook(event: string, payload: any, organization_id: string) {
        // Find all active webhooks for this event and org
        const webhooks = await this.prisma.webhooks.findMany({ // Fixed: plural
            where: {
                organization_id,
                event,
                is_active: true,
            },
        });

        if (webhooks.length === 0) return;

        this.logger.log(`Triggering ${webhooks.length} webhooks for event ${event}`);

        const promises = webhooks.map(async (webhook) => {
            try {
                const signature = webhook.secret
                    ? crypto.createHmac('sha256', webhook.secret).update(JSON.stringify(payload)).digest('hex')
                    : undefined;

                const headers: any = {
                    'Content-Type': 'application/json',
                    'X-Raymond-Event': event,
                };

                if (signature) {
                    headers['X-Raymond-Signature'] = signature;
                }

                await lastValueFrom(
                    this.httpService.post(webhook.url, payload, { headers })
                );

                this.logger.log(`Webhook ${webhook.id} sent successfully`);
            } catch (error) {
                this.logger.error(`Failed to send webhook ${webhook.id}: ${(error as Error).message}`);
                // In a real system, we would retry or log the failure to a separate table
            }
        });

        // Fire and forget (don't block the main flow)
        // Using void to explicitly indicate intentional unhandled promise
        void Promise.allSettled(promises);
    }
}
