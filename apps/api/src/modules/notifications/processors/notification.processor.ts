import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../database/prisma.service';
import { InAppNotificationPayload } from '../notifications.service';

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
    private readonly logger = new Logger(NotificationProcessor.name);

    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async process(job: Job<InAppNotificationPayload>): Promise<any> {
        this.logger.log(`Processing notification job ${job.id} for user ${job.data.user_id}`);

        try {
            const notification = await this.prisma.notifications.create({
                data: {
                    user_id: job.data.user_id,
                    title: job.data.title,
                    message: job.data.message,
                    type: job.data.type as any,
                    link: job.data.link,
                    organization_id: job.data.organization_id,
                    metadata: job.data.metadata || {},
                },
            });

            this.logger.log(`Notification created: ${notification.id}`);
            return notification;
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Failed to create notification: ${err.message}`);
            throw error;
        }
    }
}

