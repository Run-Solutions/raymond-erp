import { Module, forwardRef } from '@nestjs/common';
import { DispatchesService } from './dispatches.service';
import { DispatchesController } from './dispatches.controller';
import { PrismaService } from '../../database/prisma.service';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [WebhooksModule, forwardRef(() => NotificationsModule)],
    controllers: [DispatchesController],
    providers: [DispatchesService, PrismaService],
    exports: [DispatchesService],
})
export class DispatchesModule { }
