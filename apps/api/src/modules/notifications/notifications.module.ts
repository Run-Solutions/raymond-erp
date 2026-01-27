import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailProcessor } from './processors/email.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { PrismaService } from '../../database/prisma.service';

@Module({
    imports: [
        BullModule.registerQueue(
            {
                name: 'email',
            },
            {
                name: 'notifications',
            },
        ),
    ],
    controllers: [NotificationsController],
    providers: [NotificationsService, EmailProcessor, NotificationProcessor, PrismaService],
    exports: [NotificationsService],
})
export class NotificationsModule {}
