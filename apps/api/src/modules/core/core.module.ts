import { Module, Global, forwardRef } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { PermissionService } from '../../common/services/permission.service';
import { PrismaService } from '../../database/prisma.service';
import { OrganizationController } from './organization.controller';
import { AuditController } from './audit.controller';
import { ExpensesController } from './expenses.controller';
import { TimeEntriesController } from './time-entries.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Global()
@Module({
    imports: [forwardRef(() => NotificationsModule)],
    controllers: [OrganizationController, AuditController, ExpensesController, TimeEntriesController],
    providers: [
        PrismaService,
        PermissionService,
        {
            provide: APP_FILTER,
            useClass: AllExceptionsFilter,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: TransformInterceptor,
        },
    ],
    exports: [PrismaService, PermissionService],
})
export class CoreModule { }
