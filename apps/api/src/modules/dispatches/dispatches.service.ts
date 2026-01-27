import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { PatchDispatchDto } from './dto/patch-dispatch.dto';
import { QueryDispatchDto } from './dto/query-dispatch.dto';
import { $Enums, Prisma } from '@prisma/client';
import { EXECUTIVE_ROLES } from '../../common/constants/roles.constants';
import { WebhooksService } from '../webhooks/webhooks.service';
import { NotificationsService } from '../notifications/notifications.service';
import { randomUUID } from 'crypto';

// Types and values for enums (needed for both type checking and runtime values)
type DispatchStatus = $Enums.DispatchStatus;
const DispatchStatus = $Enums.DispatchStatus;

type TaskPriority = $Enums.TaskPriority;
const TaskPriority = $Enums.TaskPriority;

type UrgencyLevel = $Enums.UrgencyLevel;
const UrgencyLevel = $Enums.UrgencyLevel;

// Types
type RequestUser = {
    id: string;
    organization_id: string | null;
    roles: {
        id: string;
        name: string;
    };
    [key: string]: any;
};

// Constants
// Constants
// EXECUTIVE_ROLES imported from constants

const USER_SELECT = {
    id: true,
    first_name: true,
    last_name: true,
    email: true,
    avatar_url: true,
    roles: {
        select: {
            name: true,
        },
    },
};

@Injectable()
export class DispatchesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly webhooksService: WebhooksService,
        @Inject(forwardRef(() => NotificationsService))
        private readonly notificationsService: NotificationsService,
    ) { }

    async create(user: RequestUser, createDispatchDto: CreateDispatchDto) {
        const { id: user_id } = user;

        // CRITICAL: Use TenantContext for multi-tenant support (Superadmin can switch orgs)
        const { TenantContext } = await import('../../common/context/tenant.context');
        const organization_id = TenantContext.getTenantId() || user.organization_id;

        // Verify recipient exists and is in same organization
        const recipient = await this.prisma.users.findFirst({
            where: {
                id: createDispatchDto.recipient_id,
                organization_id,
                is_active: true,
            },
        });

        if (!recipient) {
            throw new BadRequestException('Recipient not found or inactive');
        }

        // Create dispatch
        const dispatch = await this.prisma.dispatches.create({
            data: {
                id: randomUUID(),
                content: createDispatchDto.content,
                description: createDispatchDto.description,
                link: createDispatchDto.link,
                urgency_level: createDispatchDto.urgency_level || UrgencyLevel.NORMAL,
                due_date: createDispatchDto.due_date
                    ? new Date(createDispatchDto.due_date)
                    : null,
                sender_id: user_id,
                recipient_id: createDispatchDto.recipient_id,
                organization_id,
                status: DispatchStatus.SENT,
                updated_at: new Date(),
            },
            include: {
                sender: { select: USER_SELECT },
                recipient: { select: USER_SELECT },
                dispatch_attachments: true,
            },
        });

        // Trigger Webhook
        this.webhooksService.triggerWebhook('dispatch.created', dispatch, organization_id);

        // Send notification to recipient
        try {
            await this.notificationsService.notifyDispatchReceived(
                dispatch.id,
                dispatch.recipient_id,
                `${dispatch.sender.first_name} ${dispatch.sender.last_name}`,
                organization_id,
            );
        } catch (error) {
            // Don't fail dispatch creation if notification fails
            console.error('Failed to send dispatch notification:', error);
        }

        return dispatch;
    }

    async findAll(user: RequestUser, query: QueryDispatchDto) {
        const { id: user_id } = user;
        const { page = 1, limit = 20, status, urgency_level, type } = query;

        // CRITICAL: Use TenantContext for multi-tenant support (Superadmin can switch orgs)
        const { TenantContext } = await import('../../common/context/tenant.context');
        const organization_id = TenantContext.getTenantId() || user.organization_id;

        const skip = (page - 1) * limit;

        const where: Prisma.dispatchesWhereInput = {
            organization_id,
        };

        // Filter by type (sent or received)
        if (type === 'sent') {
            where.sender_id = user_id;
        } else if (type === 'received') {
            where.recipient_id = user_id;
        } else {
            // Default: show both sent and received
            where.OR = [{ sender_id: user_id }, { recipient_id: user_id }];
        }

        // Filter by status
        if (status) {
            where.status = status;
        }

        // Filter by urgency
        if (urgency_level) {
            where.urgency_level = urgency_level;
        }

        const [dispatches, total] = await Promise.all([
            this.prisma.dispatches.findMany({
                where,
                skip,
                take: limit,
            include: {
                sender: { select: USER_SELECT },
                recipient: { select: USER_SELECT },
                tasks: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                    },
                },
                _count: {
                    select: {
                        dispatch_attachments: true,
                    },
                },
            },
                orderBy: [
                    { urgency_level: 'desc' }, // CRITICAL first
                    { created_at: 'desc' }, // Fixed: snake_case
                ],
            }),
            this.prisma.dispatches.count({ where }),
        ]);

        return {
            data: dispatches,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string, user: RequestUser) {
        const { id: user_id } = user;

        // CRITICAL: Use TenantContext for multi-tenant support (Superadmin can switch orgs)
        const { TenantContext } = await import('../../common/context/tenant.context');
        const organization_id = TenantContext.getTenantId() || user.organization_id;

        const dispatch = await this.prisma.dispatches.findFirst({
            where: {
                id,
                organization_id,
            },
            include: {
                sender: { select: USER_SELECT },
                recipient: { select: USER_SELECT },
                tasks: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                    },
                },
                dispatch_attachments: true,
            },
        });

        if (!dispatch) {
            throw new NotFoundException('Dispatch not found');
        }

        // RBAC: Only sender or recipient can view
        if (dispatch.sender_id !== user_id && dispatch.recipient_id !== user_id) {
            throw new ForbiddenException('You do not have permission to view this dispatch');
        }

        return dispatch;
    }

    async patch(id: string, user: RequestUser, patchDispatchDto: PatchDispatchDto) {
        const dispatch = await this.findOne(id, user);

        // Only recipient can update status
        if (dispatch.recipient_id !== user.id) {
            throw new ForbiddenException('Only the recipient can update dispatch status');
        }

        const updateData: any = {
            status: patchDispatchDto.status,
        };

        if (patchDispatchDto.due_date) {
            updateData.due_date = new Date(patchDispatchDto.due_date);
        }

        if (patchDispatchDto.resolutionNote !== undefined) {
            updateData.resolution_note = patchDispatchDto.resolutionNote;
        }

        return this.prisma.dispatches.update({
            where: { id },
            data: updateData,
            include: {
                sender: { select: USER_SELECT },
                recipient: { select: USER_SELECT },
                dispatch_attachments: true,
            },
        });
    }

    async remove(id: string, user: RequestUser) {
        const dispatch = await this.findOne(id, user);

        // Check if user is Super Admin
        const isSuperAdmin = EXECUTIVE_ROLES.includes(
            user.roles?.name?.toUpperCase() || ''
        );

        // Super Admin can delete any dispatch
        if (isSuperAdmin) {
            await this.prisma.dispatches.delete({
                where: { id },
            });
            return { message: 'Dispatch deleted successfully by Super Admin' };
        }

        // Regular users: only sender can delete
        if (dispatch.sender_id !== user.id) {
            throw new ForbiddenException('Only the sender can delete this dispatch');
        }

        await this.prisma.dispatches.delete({
            where: { id },
        });

        return { message: 'Dispatch deleted successfully' };
    }

    async markAsRead(id: string, user: RequestUser) {
        const dispatch = await this.findOne(id, user);

        if (dispatch.recipient_id !== user.id) {
            throw new ForbiddenException('Only the recipient can mark as read');
        }

        if (dispatch.status !== DispatchStatus.SENT) {
            throw new BadRequestException('Dispatch has already been read');
        }

        return this.prisma.dispatches.update({
            where: { id },
            data: {
                status: DispatchStatus.READ,
                read_at: new Date(),
            },
            include: {
                sender: { select: USER_SELECT },
                recipient: { select: USER_SELECT },
            },
        });
    }

    async markInProgress(id: string, user: RequestUser) {
        const dispatch = await this.findOne(id, user);

        if (dispatch.recipient_id !== user.id) {
            throw new ForbiddenException('Only the recipient can mark as in progress');
        }

        if (dispatch.status === DispatchStatus.RESOLVED || dispatch.status === DispatchStatus.CONVERTED_TO_TASK) {
            throw new BadRequestException('Cannot change status of resolved or converted dispatch');
        }

        return this.prisma.dispatches.update({
            where: { id },
            data: {
                status: DispatchStatus.IN_PROGRESS,
                in_progress_at: new Date(),
                read_at: dispatch.read_at || new Date(), // Auto-mark as read if not already
            },
            include: {
                sender: { select: USER_SELECT },
                recipient: { select: USER_SELECT },
            },
        });
    }

    async resolve(id: string, user: RequestUser, resolutionNote?: string) {
        const dispatch = await this.findOne(id, user);

        if (dispatch.recipient_id !== user.id) {
            throw new ForbiddenException('Only the recipient can resolve a dispatch');
        }

        if (dispatch.status === DispatchStatus.CONVERTED_TO_TASK) {
            throw new BadRequestException('Cannot resolve a dispatch that was converted to a task');
        }

        const updatedDispatch = await this.prisma.dispatches.update({
            where: { id },
            data: {
                status: DispatchStatus.RESOLVED,
                resolved_at: new Date(),
                resolution_note: resolutionNote,
                read_at: dispatch.read_at || new Date(),
            },
            include: {
                sender: { select: USER_SELECT },
                recipient: { select: USER_SELECT },
            },
        });

        // Notify sender that dispatch was resolved
        try {
            await this.notificationsService.notifyDispatchResolved(
                id,
                dispatch.sender_id,
                `${user.first_name} ${user.last_name}`,
                dispatch.organization_id,
            );
        } catch (error) {
            console.error('Failed to send dispatch resolved notification:', error);
        }

        return updatedDispatch;
    }

    async convertToTask(id: string, user: RequestUser, project_id?: string) {
        const dispatch = await this.findOne(id, user);

        // CRITICAL: Use TenantContext for multi-tenant support (Superadmin can switch orgs)
        const { TenantContext } = await import('../../common/context/tenant.context');
        const organization_id = TenantContext.getTenantId() || user.organization_id;

        if (dispatch.recipient_id !== user.id && dispatch.sender_id !== user.id) {
            throw new ForbiddenException('Only sender or recipient can convert to task');
        }

        if (dispatch.status === DispatchStatus.CONVERTED_TO_TASK) {
            throw new BadRequestException('Dispatch has already been converted to a task');
        }

        if (dispatch.task_id) {
            throw new BadRequestException('Dispatch is already linked to a task');
        }

        // Map urgency to priority
        const priorityMap: Record<string, TaskPriority> = {
            [UrgencyLevel.CRITICAL]: TaskPriority.CRITICAL,
            [UrgencyLevel.URGENT]: TaskPriority.HIGH,
            [UrgencyLevel.NORMAL]: TaskPriority.MEDIUM,
        };

        const isExecutive = EXECUTIVE_ROLES.includes(
            user.roles?.name?.toUpperCase() || ''
        );

        // Build project query
        const projectWhere: Prisma.projectsWhereInput = {
            organization_id,
            deleted_at: null,
        };

        if (project_id) {
            projectWhere.id = project_id;
        }

        if (!isExecutive) {
            // Regular users: verify recipient is member of the project
            projectWhere.OR = [
                { owner_id: dispatch.recipient_id },
                // Note: members relation may not exist in schema
            ];
        }

        const selectedProject = await this.prisma.projects.findFirst({
            where: projectWhere,
        });

        if (!selectedProject) {
            if (project_id) {
                throw new BadRequestException(
                    isExecutive
                        ? 'Invalid project'
                        : 'Invalid project or recipient is not a member of the selected project'
                );
            } else {
                throw new BadRequestException(
                    isExecutive
                        ? 'No projects available in organization'
                        : 'Recipient must be assigned to at least one project to convert dispatch to task'
                );
            }
        }

        // Create task and update dispatch in a transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // Create task
            const task = await tx.tasks.create({
                data: {
                    id: randomUUID(),
                    title: dispatch.content.substring(0, 100), // Limit title length
                    description: dispatch.content,
                    status: 'TODO',
                    priority: priorityMap[dispatch.urgency_level] || TaskPriority.MEDIUM,
                    project_id: selectedProject.id,
                    assignee_id: dispatch.recipient_id,
                    reporter_id: dispatch.sender_id,
                    due_date: dispatch.due_date,
                    organization_id,
                    source_dispatch_id: dispatch.id,
                } as any,
            });

            // Update dispatch
            const updatedDispatch = await tx.dispatches.update({
                where: { id },
                data: {
                    status: DispatchStatus.CONVERTED_TO_TASK,
                    task_id: task.id,
                },
                include: {
                    tasks: true, // Relation name is 'tasks' in schema
                },
            });

            return { task, dispatch: updatedDispatch };
        });

        // Notify recipient that dispatch was converted to task
        try {
            await this.notificationsService.notifyDispatchConvertedToTask(
                id,
                result.task.id,
                dispatch.recipient_id,
                dispatch.organization_id,
            );
        } catch (error) {
            console.error('Failed to send dispatch converted notification:', error);
        }

        return result;
    }

    async getStats(user: RequestUser) {
        const { id: user_id } = user;

        // CRITICAL: Use TenantContext for multi-tenant support (Superadmin can switch orgs)
        const { TenantContext } = await import('../../common/context/tenant.context');
        const organization_id = TenantContext.getTenantId() || user.organization_id;

        const [totalSent, totalReceived, unreadCount, urgentCount] = await Promise.all([
            this.prisma.dispatches.count({
                where: {
                    sender_id: user_id,
                    organization_id,
                },
            }),
            this.prisma.dispatches.count({
                where: {
                    recipient_id: user_id,
                    organization_id,
                },
            }),
            this.prisma.dispatches.count({
                where: {
                    recipient_id: user_id,
                    organization_id,
                    status: DispatchStatus.SENT,
                },
            }),
            this.prisma.dispatches.count({
                where: {
                    recipient_id: user_id,
                    organization_id,
                    urgency_level: UrgencyLevel.URGENT,
                    status: {
                        in: [DispatchStatus.SENT, DispatchStatus.READ, DispatchStatus.IN_PROGRESS],
                    },
                },
            }),
        ]);

        return {
            totalSent,
            totalReceived,
            unreadCount,
            urgentCount,
        };
    }
}
