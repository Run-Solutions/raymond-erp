import { Module, Global, forwardRef } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { SlowRequestInterceptor } from './interceptors/slow-request.interceptor';
import { PermissionService } from '../../common/services/permission.service';
import { PrismaService } from '../../database/prisma.service';
import { OrganizationController } from './organization.controller';
import { AuditController } from './audit.controller';
// TODO: './logs/logs.controller' nunca se subió a git — el .gitignore tenía una regla
// genérica `logs/` que lo descartaba silenciosamente (ver .gitignore). Comentado para que
// el build no truene; pedirle a Gabo que haga `git add -f` del archivo real y restaurar esto.
// import { LogsController } from './logs/logs.controller';

@Global()
@Module({
    imports: [],
    controllers: [OrganizationController, AuditController /*, LogsController */],
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
        {
            provide: APP_INTERCEPTOR,
            useClass: SlowRequestInterceptor,
        },
    ],
    exports: [PrismaService, PermissionService],
})
export class CoreModule { }
