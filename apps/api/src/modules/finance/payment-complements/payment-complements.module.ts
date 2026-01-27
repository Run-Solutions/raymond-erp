import { Module, forwardRef } from '@nestjs/common';
import { PaymentComplementsService } from './payment-complements.service';
import { PaymentComplementsController } from './payment-complements.controller';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
    imports: [forwardRef(() => NotificationsModule)],
    controllers: [PaymentComplementsController],
    providers: [PaymentComplementsService, PrismaService],
    exports: [PaymentComplementsService],
})
export class PaymentComplementsModule { }
