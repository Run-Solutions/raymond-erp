import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { TimeEntryStatus } from '@prisma/client';

@ApiTags('Time Entries')
@Controller('time-entries')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class TimeEntriesController {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => NotificationsService))
        private readonly notificationsService: NotificationsService,
    ) { }

    @Get()
    @Permissions('time-tracking:read')
    @ApiOperation({ summary: 'Get all time entries' })
    @ApiResponse({ status: 200, description: 'Time entries retrieved successfully' })
    async getTimeEntries(
        @Request() req,
        @Query('limit') limit?: string,
        @Query('status') status?: string,
        @Query('project_id') project_id?: string,
        @Query('task_id') task_id?: string,
    ) {
        const take = limit ? parseInt(limit, 10) : 50;

        const where: any = {
            organization_id: req.user.organization_id,
        };

        if (status) {
            where.status = status;
        }

        if (project_id) {
            where.project_id = project_id;
        }

        if (task_id) {
            where.task_id = task_id;
        }

        const timeEntries = await this.prisma.time_entries.findMany({
            where,
            take,
            orderBy: { date: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                    },
                },
                projects: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        return timeEntries;
    }

    @Post()
    @Permissions('time-tracking:create')
    @ApiOperation({ summary: 'Create a new time entry' })
    @ApiResponse({ status: 201, description: 'Time entry created successfully' })
    async createTimeEntry(@Request() req, @Body() createData: any) {
        const timeEntry = await this.prisma.time_entries.create({
            data: {
                id: require('crypto').randomUUID(),
                ...createData,
                user_id: req.user.id,
                organization_id: req.user.organization_id,
            } as any,
            include: {
                user: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                    },
                },
                projects: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        // Notify if status is SUBMITTED
        if (timeEntry.status === TimeEntryStatus.SUBMITTED) {
            try {
                await this.notificationsService.notifyTimeEntryStatusChanged(
                    timeEntry.id,
                    req.user.id,
                    timeEntry.hours,
                    'SUBMITTED',
                    req.user.organization_id,
                );
            } catch (error) {
                console.error('Failed to send time entry notification:', error);
            }
        }

        return timeEntry;
    }

    @Get(':id')
    @Permissions('time-tracking:read')
    @ApiOperation({ summary: 'Get time entry by ID' })
    @ApiResponse({ status: 200, description: 'Time entry retrieved successfully' })
    async getTimeEntry(@Param('id') id: string, @Request() req) {
        const timeEntry = await this.prisma.time_entries.findFirst({
            where: {
                id,
                organization_id: req.user.organization_id,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                    },
                },
                projects: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        return timeEntry;
    }

    @Patch(':id')
    @Permissions('time-tracking:update')
    @ApiOperation({ summary: 'Update time entry' })
    @ApiResponse({ status: 200, description: 'Time entry updated successfully' })
    async updateTimeEntry(@Param('id') id: string, @Request() req, @Body() updateData: any) {
        // Get current time entry to check status change
        const currentTimeEntry = await this.prisma.time_entries.findFirst({
            where: {
                id,
                organization_id: req.user.organization_id,
            },
        });

        if (!currentTimeEntry) {
            throw new Error('Time entry not found');
        }

        const timeEntry = await this.prisma.time_entries.updateMany({
            where: {
                id,
                organization_id: req.user.organization_id,
            },
            data: updateData,
        });

        // Notify if status changed
        if (updateData.status && updateData.status !== currentTimeEntry.status) {
            try {
                const status = updateData.status as TimeEntryStatus;
                if (status === TimeEntryStatus.APPROVED || status === TimeEntryStatus.REJECTED) {
                    await this.notificationsService.notifyTimeEntryStatusChanged(
                        id,
                        currentTimeEntry.user_id,
                        currentTimeEntry.hours,
                        status === TimeEntryStatus.APPROVED ? 'APPROVED' : 'REJECTED',
                        req.user.organization_id,
                    );
                } else if (status === TimeEntryStatus.SUBMITTED) {
                    await this.notificationsService.notifyTimeEntryStatusChanged(
                        id,
                        currentTimeEntry.user_id,
                        currentTimeEntry.hours,
                        'SUBMITTED',
                        req.user.organization_id,
                    );
                }
            } catch (error) {
                console.error('Failed to send time entry notification:', error);
            }
        }

        return timeEntry;
    }

    @Delete(':id')
    @Permissions('time-tracking:delete')
    @ApiOperation({ summary: 'Delete time entry' })
    @ApiResponse({ status: 200, description: 'Time entry deleted successfully' })
    async deleteTimeEntry(@Param('id') id: string, @Request() req) {
        await this.prisma.time_entries.deleteMany({
            where: {
                id,
                organization_id: req.user.organization_id,
            },
        });

        return { success: true };
    }
}

