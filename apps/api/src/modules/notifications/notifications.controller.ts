import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get()
    @ApiOperation({ summary: 'Get all notifications for the current user' })
    @ApiResponse({ status: 200, description: 'List of notifications' })
    findAll(@Request() req, @Query() query: QueryNotificationDto) {
        return this.notificationsService.findAll(
            req.user.id,
            req.user.organization_id,
            query,
        );
    }

    @Get('unread/count')
    @ApiOperation({ summary: 'Get unread notifications count' })
    @ApiResponse({ status: 200, description: 'Unread count' })
    getUnreadCount(@Request() req) {
        return this.notificationsService.getUnreadCount(
            req.user.id,
            req.user.organization_id,
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a notification by ID' })
    @ApiResponse({ status: 200, description: 'Notification details' })
    findOne(@Request() req, @Param('id') id: string) {
        return this.notificationsService.findOne(req.user.id, id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new notification' })
    @ApiResponse({ status: 201, description: 'Notification created' })
    create(@Request() req, @Body() createNotificationDto: CreateNotificationDto) {
        // Only allow creating notifications for the current user or if user is admin
        if (createNotificationDto.user_id !== req.user.id && !req.user.isSuperadmin) {
            createNotificationDto.user_id = req.user.id;
        }
        if (!createNotificationDto.organization_id) {
            createNotificationDto.organization_id = req.user.organization_id;
        }
        return this.notificationsService.createInAppNotification(createNotificationDto);
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Mark a notification as read' })
    @ApiResponse({ status: 200, description: 'Notification marked as read' })
    markAsRead(@Request() req, @Param('id') id: string) {
        return this.notificationsService.markAsRead(req.user.id, id);
    }

    @Patch('read-all')
    @ApiOperation({ summary: 'Mark all notifications as read' })
    @ApiResponse({ status: 200, description: 'All notifications marked as read' })
    markAllAsRead(@Request() req) {
        return this.notificationsService.markAllAsRead(
            req.user.id,
            req.user.organization_id,
        );
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a notification' })
    @ApiResponse({ status: 204, description: 'Notification deleted' })
    remove(@Request() req, @Param('id') id: string) {
        return this.notificationsService.delete(req.user.id, id);
    }
}

