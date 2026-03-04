import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { SprintsModule } from './modules/sprints/sprints.module';
import { FinanceModule } from './modules/finance/finance.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CoreModule } from './modules/core/core.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ProspectsModule } from './modules/prospects/prospects.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { OrganizationModulesModule } from './modules/organization-modules/organization-modules.module';
import { DispatchesModule } from './modules/dispatches/dispatches.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { SuperadminModule } from './modules/superadmin/superadmin.module';
import { PhasesModule } from './modules/phases/phases.module';
import { TallerR1Module } from './modules/taller-r1/taller-r1.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';

@Module({
    imports: [
        ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'uploads'),
            serveRoot: '/uploads',
        }),
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema,
            load: [configuration],
        }),
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 10,
        }]),
        BullModule.forRoot({
            connection: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
                family: 4, // Fuerza a Node.js a usar IPv4 para evitar DNS 'ENOTFOUND' en Docker/Alpine
            },
        }),
        // The following modules require PostgreSQL which is now active
        AuthModule,
        HealthModule,
        UsersModule,
        RolesModule,
        PermissionsModule,
        ProjectsModule,
        TasksModule,
        SprintsModule,
        FinanceModule,
        AnalyticsModule,
        NotificationsModule,
        CoreModule,
        ClientsModule,
        ProspectsModule,
        SuppliersModule,
        OrganizationModulesModule,
        DispatchesModule,
        ApiKeysModule,
        WebhooksModule,
        SuperadminModule,
        PhasesModule,
        TallerR1Module,
    ],
    controllers: [AppController],
    providers: [AppService, PrismaService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(TenantMiddleware)
            .forRoutes('*');
    }
}
