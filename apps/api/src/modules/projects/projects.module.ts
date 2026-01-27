import { Module, forwardRef } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [forwardRef(() => NotificationsModule)],
    controllers: [ProjectsController],
    providers: [ProjectsService, PrismaService],
    exports: [ProjectsService],
})
export class ProjectsModule {}
