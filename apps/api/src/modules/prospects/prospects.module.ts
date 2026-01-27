import { Module, forwardRef } from '@nestjs/common';
import { ProspectsService } from './prospects.service';
import { ProspectsController } from './prospects.controller';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [forwardRef(() => NotificationsModule)],
    controllers: [ProspectsController],
    providers: [ProspectsService, PrismaService],
    exports: [ProspectsService],
})
export class ProspectsModule { }

