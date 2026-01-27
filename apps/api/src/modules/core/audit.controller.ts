import { Controller, Get, UseGuards, Request, Query, BadRequestException, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Response } from 'express';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class AuditController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    @Permissions('audit-logs:read')
    @ApiOperation({ summary: 'Get audit logs with filtering and pagination' })
    @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of logs to return (default: 50, max: 500)' })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of logs to skip (default: 0)' })
    @ApiQuery({ name: 'resource', required: false, type: String, description: 'Filter by resource type' })
    @ApiQuery({ name: 'action', required: false, type: String, description: 'Filter by action type' })
    @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status (SUCCESS, FAILED)' })
    @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID' })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in action, resource, or user details' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO format)' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO format)' })
    async getAuditLogs(
        @Request() req,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Query('resource') resource?: string,
        @Query('action') action?: string,
        @Query('status') status?: string,
        @Query('userId') userId?: string,
        @Query('search') search?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        // Validate and parse limit - handle empty strings
        const limitNum = limit && limit.trim() !== '' ? parseInt(limit.trim(), 10) : 50;
        const take = !isNaN(limitNum) && limitNum > 0 ? Math.min(limitNum, 500) : 50;

        // Validate and parse offset - handle empty strings
        const offsetNum = offset && offset.trim() !== '' ? parseInt(offset.trim(), 10) : 0;
        const skip = !isNaN(offsetNum) && offsetNum >= 0 ? offsetNum : 0;

        // CRITICAL: Handle SuperAdmin without organization context
        const isSuperadmin = req.user.isSuperadmin === true || req.user.roles === 'Superadmin';
        const organizationId = req.user.organization_id;

        // For SuperAdmin without organization, show all audit logs (or return message)
        if (isSuperadmin && !organizationId) {
            // Option 1: Return message asking to select organization
            // Option 2: Show all logs (less secure but more useful)
            // We'll go with Option 2 but log it
            console.warn('[AuditController] SuperAdmin accessing audit logs without organization context - showing all logs');
        }

        // Get all user IDs in the organization (for tenant isolation)
        // For SuperAdmin without org, we'll query all users (or handle differently)
        let user_ids: string[] = [];
        
        if (isSuperadmin && !organizationId) {
            // SuperAdmin without org - get all users (or return empty for now)
            // For security, we'll return empty and ask to select an org
            return {
                success: true,
                data: [],
                total: 0,
                limit: take,
                offset: skip,
                message: 'SuperAdmin - Please select an organization to view audit logs',
            };
        } else if (organizationId) {
            // Regular user or SuperAdmin with org - get users from that organization
            try {
                const orgUsers = await this.prisma.users.findMany({
                    where: { organization_id: organizationId },
                    select: { id: true },
                });
                user_ids = orgUsers.map(u => u.id);
            } catch (error) {
                console.error('[AuditController] Error fetching organization users:', error);
                throw new BadRequestException('Error fetching organization users');
            }
        } else {
            // Regular user without organization (should not happen due to TenantGuard)
            throw new BadRequestException('User has no organization assigned');
        }

        // If no users in organization, return empty result (but don't throw error)
        if (user_ids.length === 0) {
            return {
                success: true,
                data: [],
                total: 0,
                limit: take,
                offset: skip,
            };
        }

        // Build where clause - start with user filter
        // If specific userId is provided, use only that user
        // Otherwise, include all users from organization OR system events (user_id = null)
        let userFilter: any;
        if (userId && userId.trim() !== '') {
            const targetUserId = userId.trim();
            // Validate that userId belongs to the organization
            if (!user_ids.includes(targetUserId)) {
                throw new BadRequestException('User ID does not belong to your organization');
            }
            userFilter = { user_id: targetUserId };
        } else {
            // Include logs from organization users OR system events
            userFilter = {
                OR: [
                    { user_id: { in: user_ids } },
                    { user_id: null }, // System events
                ],
            };
        }

        // Build all filter conditions
        const filterConditions: any[] = [userFilter];

        // Resource filter
        if (resource && resource.trim() !== '') {
            filterConditions.push({
                resource: { contains: resource.trim(), mode: 'insensitive' },
            });
        }

        // Action filter
        if (action && action.trim() !== '') {
            filterConditions.push({
                action: { contains: action.trim(), mode: 'insensitive' },
            });
        }

        // Status filter
        if (status && status.trim() !== '') {
            filterConditions.push({
                status: status.trim().toUpperCase(),
            });
        }

        // Date range filters
        if (startDate && startDate.trim() !== '') {
            const start = new Date(startDate.trim());
            if (isNaN(start.getTime())) {
                throw new BadRequestException('Invalid startDate format. Use ISO format (YYYY-MM-DD).');
            }
            filterConditions.push({
                created_at: { gte: start },
            });
        }

        if (endDate && endDate.trim() !== '') {
            const end = new Date(endDate.trim());
            if (isNaN(end.getTime())) {
                throw new BadRequestException('Invalid endDate format. Use ISO format (YYYY-MM-DD).');
            }
            // Add one day to include the entire end date
            end.setHours(23, 59, 59, 999);
            filterConditions.push({
                created_at: { lte: end },
            });
        }

        // Search filter (searches in action or resource)
        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            filterConditions.push({
                OR: [
                    { action: { contains: searchTerm, mode: 'insensitive' } },
                    { resource: { contains: searchTerm, mode: 'insensitive' } },
                ],
            });
        }

        // Build final where clause
        const where: any = filterConditions.length === 1 
            ? filterConditions[0]  // If only user filter, use it directly
            : { AND: filterConditions };  // Otherwise, combine all with AND

        try {
            // Try to include user relation, but handle gracefully if relation doesn't exist yet
            let logs, total;
            try {
                [logs, total] = await Promise.all([
                    this.prisma.audit_logs.findMany({
                        where,
                        take,
                        skip,
                        orderBy: { created_at: 'desc' },
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    first_name: true,
                                    last_name: true,
                                    email: true,
                                },
                            },
                        },
                    }),
                    this.prisma.audit_logs.count({ where }),
                ]);
            } catch (relationError: any) {
                // If relation doesn't exist (Prisma client not regenerated), fetch without include
                if (relationError.message?.includes('Unknown arg `user`') || relationError.message?.includes('relation')) {
                    console.warn('[AuditController] User relation not available, fetching without include. Run: npx prisma generate');
                    [logs, total] = await Promise.all([
                        this.prisma.audit_logs.findMany({
                            where,
                            take,
                            skip,
                            orderBy: { created_at: 'desc' },
                        }),
                        this.prisma.audit_logs.count({ where }),
                    ]);
                    // Manually fetch user data for logs that have user_id
                    const userIds = [...new Set(logs.filter(log => log.user_id).map(log => log.user_id))];
                    if (userIds.length > 0) {
                        const users = await this.prisma.users.findMany({
                            where: { id: { in: userIds as string[] } },
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true,
                                email: true,
                            },
                        });
                        const userMap = new Map(users.map(u => [u.id, u]));
                        logs = logs.map(log => ({
                            ...log,
                            user: log.user_id ? userMap.get(log.user_id) || null : null,
                        }));
                    } else {
                        logs = logs.map(log => ({ ...log, user: null }));
                    }
                } else {
                    throw relationError;
                }
            }

            // Transform logs to match frontend expectations
            const transformedLogs = logs.map((log: any) => ({
                id: log.id,
                action: log.action,
                resource: log.resource,
                userId: log.user_id || null,
                organizationId: organizationId || null,
                metadata: log.details || null,
                createdAt: log.created_at.toISOString(),
                ipAddress: log.ip_address || null,
                userAgent: log.user_agent || null,
                status: log.status || 'SUCCESS',
                user: log.user ? {
                    id: log.user.id,
                    firstName: log.user.first_name,
                    lastName: log.user.last_name,
                    email: log.user.email,
                } : null,
            }));

            return {
                success: true,
                data: transformedLogs,
                total,
                limit: take,
                offset: skip,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Error fetching audit logs: ${message}`);
        }
    }

    @Get('export')
    @Permissions('audit-logs:export')
    @ApiOperation({ summary: 'Export audit logs as CSV' })
    @ApiResponse({ status: 200, description: 'Audit logs exported successfully' })
    @ApiQuery({ name: 'resource', required: false, type: String })
    @ApiQuery({ name: 'action', required: false, type: String })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    async exportAuditLogs(
        @Request() req,
        @Res() res: Response,
        @Query('resource') resource?: string,
        @Query('action') action?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        // CRITICAL: Handle SuperAdmin without organization context
        const isSuperadmin = req.user.isSuperadmin === true || req.user.roles === 'Superadmin';
        const organizationId = req.user.organization_id;

        if (isSuperadmin && !organizationId) {
            res.status(400).json({
                success: false,
                message: 'SuperAdmin - Please select an organization to export audit logs',
            });
            return;
        }

        if (!organizationId) {
            res.status(400).json({
                success: false,
                message: 'User has no organization assigned',
            });
            return;
        }

        // Get all user IDs in the organization
        let user_ids: string[] = [];
        try {
            const orgUsers = await this.prisma.users.findMany({
                where: { organization_id: organizationId },
                select: { id: true },
            });
            user_ids = orgUsers.map(u => u.id);
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching organization users',
            });
            return;
        }

        if (user_ids.length === 0) {
            res.status(200).send('No audit logs found');
            return;
        }

        // Build where clause - same logic as getAuditLogs
        const userFilter: any = {
            OR: [
                { user_id: { in: user_ids } },
                { user_id: null }, // Include system events
            ],
        };

        const filterConditions: any[] = [userFilter];

        if (resource && resource.trim() !== '') {
            filterConditions.push({
                resource: { contains: resource.trim(), mode: 'insensitive' },
            });
        }

        if (action && action.trim() !== '') {
            filterConditions.push({
                action: { contains: action.trim(), mode: 'insensitive' },
            });
        }

        if (startDate && startDate.trim() !== '') {
            const start = new Date(startDate.trim());
            if (!isNaN(start.getTime())) {
                filterConditions.push({
                    created_at: { gte: start },
                });
            }
        }

        if (endDate && endDate.trim() !== '') {
            const end = new Date(endDate.trim());
            if (!isNaN(end.getTime())) {
                end.setHours(23, 59, 59, 999);
                filterConditions.push({
                    created_at: { lte: end },
                });
            }
        }

        // Build final where clause
        const where: any = filterConditions.length === 1 
            ? filterConditions[0]
            : { AND: filterConditions };

        // Try to include user relation, but handle gracefully if it doesn't exist
        let logs: any[];
        try {
            logs = await this.prisma.audit_logs.findMany({
                where,
                orderBy: { created_at: 'desc' },
                include: {
                    user: {
                        select: {
                            first_name: true,
                            last_name: true,
                            email: true,
                        },
                    },
                },
                take: 10000, // Limit export to 10k records
            });
        } catch (relationError: any) {
            // If relation doesn't exist, fetch without include and manually join
            if (relationError.message?.includes('Unknown arg `user`') || relationError.message?.includes('relation')) {
                logs = await this.prisma.audit_logs.findMany({
                    where,
                    orderBy: { created_at: 'desc' },
                    take: 10000,
                });
                const userIds = [...new Set(logs.filter(log => log.user_id).map(log => log.user_id))];
                if (userIds.length > 0) {
                    const users = await this.prisma.users.findMany({
                        where: { id: { in: userIds as string[] } },
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            email: true,
                        },
                    });
                    const userMap = new Map(users.map(u => [u.id, u]));
                    logs = logs.map(log => ({
                        ...log,
                        user: log.user_id ? userMap.get(log.user_id) || null : null,
                    }));
                } else {
                    logs = logs.map(log => ({ ...log, user: null }));
                }
            } else {
                throw relationError;
            }
        }

        // Generate CSV
        const headers = ['Fecha', 'Usuario', 'Email', 'Acción', 'Recurso', 'Estado', 'IP', 'Detalles'];
        const rows = logs.map(log => [
            log.created_at.toISOString(),
            log.user ? `${log.user.first_name} ${log.user.last_name}` : 'Sistema',
            log.user?.email || 'N/A',
            log.action,
            log.resource,
            log.status,
            log.ip_address || 'N/A',
            log.details ? JSON.stringify(log.details) : 'N/A',
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send('\ufeff' + csv); // BOM for Excel UTF-8 support
    }
}

