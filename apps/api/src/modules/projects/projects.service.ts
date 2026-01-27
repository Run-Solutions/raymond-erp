import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import { ChangeProjectStatusDto } from './dto/change-status.dto';
import { ProjectStatus } from '@prisma/client';
import { EXECUTIVE_ROLES } from '../../common/constants/roles.constants';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProjectsService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => NotificationsService))
        private readonly notificationsService: NotificationsService,
    ) { }

    async create(user: any, createProjectDto: CreateProjectDto) {
        const { id: user_id, organization_id, roles } = user; // Fixed: use 'roles' instead of 'role'

        // RBAC: Only Executives can create projects
        const canCreate = EXECUTIVE_ROLES.includes(roles?.toUpperCase());
        if (!canCreate) {
            throw new ForbiddenException('Only Executives can create new projects');
        }

        // Extract relation fields first before destructuring
        const memberIds = createProjectDto.memberIds;
        const dtoOwnerIds = createProjectDto.owner_ids;
        const dtoOwnerId = createProjectDto.owner_id;
        const dtoStartDate = createProjectDto.start_date;
        const dtoEndDate = createProjectDto.endDate;

        // Exclude fields that are handled separately (relations)
        const { memberIds: _, owner_ids: __, owner_id: ___, start_date: ____, endDate: _____, ...projectData } = createProjectDto;

        const owner_ids = dtoOwnerIds || (dtoOwnerId ? [dtoOwnerId] : [user_id]);

        // Verify owners belong to organization
        const owners = await this.prisma.users.findMany({
            where: {
                id: { in: owner_ids },
                organization_id,
                is_active: true,
            },
        });

        if (owners.length === 0) {
            throw new BadRequestException('No valid owners found in this organization');
        }

        const project = await this.prisma.projects.create({
            data: {
                id: require('crypto').randomUUID(),
                ...projectData,
                start_date: dtoStartDate ? new Date(dtoStartDate) : undefined,
                end_date: dtoEndDate ? new Date(dtoEndDate) : undefined, // Fixed: snake_case
                owner_id: owner_ids[0], // Primary owner (PM)
                // COMMENTED: owners relation doesn't exist in Prisma schema
                // owners: {
                //     connect: owners.map(o => ({ id: o.id }))
                // },
                users: memberIds && memberIds.length > 0 ? { // Renamed from members to match Prisma schema
                    connect: memberIds.map(id => ({ id }))
                } : undefined,
                organization_id,
                updated_at: new Date(),
            } as any,
            include: {
                    // ProjectOwners: {
                    //     select: {
                    //         B: true,
                    //     },
                    // },
                clients: {
                    select: {
                        id: true,
                        nombre: true,
                        contacto: true,
                    },
                },
                _count: {
                    select: {
                        tasks: true,
                        sprints: true,
                    },
                },
            },
        });

        // Send notifications to project owner and members
        try {
            // Notify owner
            if (project.owner_id && project.owner_id !== user_id) {
                await this.notificationsService.createInAppNotification({
                    user_id: project.owner_id,
                    title: 'Project Created',
                    message: `Project "${project.name}" has been created and you are the owner`,
                    type: 'PROJECT_CREATED',
                    link: `/projects/${project.id}`,
                    organization_id: organization_id,
                    metadata: { project_id: project.id },
                });
            }

            // Notify members
            if (memberIds && memberIds.length > 0) {
                const notifications = memberIds
                    .filter(memberId => memberId !== user_id && memberId !== project.owner_id)
                    .map(memberId =>
                        this.notificationsService.createInAppNotification({
                            user_id: memberId,
                            title: 'Added to Project',
                            message: `You have been added to project "${project.name}"`,
                            type: 'PROJECT_CREATED',
                            link: `/projects/${project.id}`,
                            organization_id: organization_id,
                            metadata: { project_id: project.id },
                        })
                    );
                await Promise.all(notifications);
            }
        } catch (error) {
            // Don't fail project creation if notification fails
            console.error('Failed to send notification:', error);
        }

        return project;
    }

    async findAll(user: any, query: QueryProjectDto) {
        const { organization_id, id: user_id, roles, isSuperadmin } = user; // Fixed: use 'roles' instead of 'role'
        const { status, start_dateFrom, start_dateTo, endDateFrom, endDateTo, search, page = 1, limit = 20 } = query;
        console.log(`[ProjectsService.findAll] User: ${user.email}, Role: ${roles}, Org: ${organization_id}, IsSuperadmin: ${isSuperadmin}`);

        // CRITICAL: SuperAdmin without organization_id cannot query projects
        // They must select an organization first
        if (isSuperadmin && !organization_id) {
            console.warn(`[ProjectsService.findAll] SuperAdmin without organization context`);
            return {
                data: [],
                meta: {
                    total: 0,
                    page: 1,
                    limit,
                    totalPages: 0,
                },
            };
        }

        // CRITICAL: Regular users MUST have an organization_id
        if (!isSuperadmin && !organization_id) {
            throw new BadRequestException('User must have an organization assigned');
        }

        const skip = (page - 1) * limit;

        const where: any = {
            organization_id, // This will be enforced by the extension, but we set it here for clarity
            deleted_at: null, // Fixed: snake_case
        };
        
        console.log(`[ProjectsService.findAll] Where clause: ${JSON.stringify(where)}`);

        // RBAC: If not Admin/Super Admin, restrict to assigned projects
        // Project Managers should see all projects in their organization
        const roleName = typeof roles === 'string' ? roles : roles?.name || ''; // Fixed: use 'roles' instead of 'role'
        const normalizedRoleName = roleName ? roleName.toUpperCase().trim() : '';
        const isAdmin = isSuperadmin || (normalizedRoleName ? EXECUTIVE_ROLES.some(r => r.toUpperCase() === normalizedRoleName) : false);
        const isProjectManager = normalizedRoleName === 'PROJECT MANAGER' || normalizedRoleName === 'PM';
        
        // Project Managers can see all projects in their organization
        // Other non-admin users see only projects they are assigned to
        if (!isAdmin && !isProjectManager) {
            where.OR = [
                { owner_id: user_id }, // Primary Project Owner
                // { ProjectOwners: { some: { B: user_id } } }, // COMMENTED: ProjectOwners causing errors
                { users: { some: { id: user_id } } }, // Team Member (users relation from Prisma schema)
                {
                    tasks: {
                        some: {
                            assignee_id: user_id // Assigned to a task
                        }
                    }
                },
            ];
        }

        if (status) {
            where.status = status;
        }

        if (start_dateFrom || start_dateTo) {
            where.start_date = {};
            if (start_dateFrom) where.start_date.gte = new Date(start_dateFrom);
            if (start_dateTo) where.start_date.lte = new Date(start_dateTo);
        }

        if (endDateFrom || endDateTo) {
            where.end_date = {}; // Fixed: snake_case
            if (endDateFrom) where.end_date.gte = new Date(endDateFrom);
            if (endDateTo) where.end_date.lte = new Date(endDateTo);
        }

        if (search) {
            const searchCondition = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];

            if (where.OR) {
                // Combine existing RBAC OR with Search OR using AND
                where.AND = [
                    { OR: where.OR },
                    { OR: searchCondition }
                ];
                delete where.OR;
            } else {
                where.OR = searchCondition;
            }
        }

        console.log(`[ProjectsService.findAll] Executing query with where: ${JSON.stringify(where)}`);
        console.log(`[ProjectsService.findAll] User details - id: ${user_id}, email: ${user.email}, roles: ${roles}, organization_id: ${organization_id}`);
        
        // CRITICAL: Verify tenant context is set correctly
        const { TenantContext } = await import('../../common/context/tenant.context');
        const currentTenant = TenantContext.getTenantId();
        console.log(`[ProjectsService.findAll] ⚠️ TENANT CHECK - Expected org: ${organization_id}, TenantContext: ${currentTenant}`);
        
        if (currentTenant !== organization_id) {
            console.error(`[ProjectsService.findAll] 🚨 CRITICAL: Tenant mismatch! Expected: ${organization_id}, Got: ${currentTenant}`);
        }
        
        const [projects, total] = await Promise.all([
            this.prisma.projects.findMany({
                where,
                skip,
                take: limit,
                include: {
                    // COMMENTED: owner relation not defined in Prisma schema
                    // owner: {
                    //     select: {
                    //         id: true,
                    //         email: true,
                    //         first_name: true,
                    //         last_name: true,
                    //         avatar_url: true,
                    //     },
                    // },
                    // TEMPORARILY COMMENTED: ProjectOwners join table missing foreign key to users
                    // This was causing 500 errors. Will fix schema and re-enable later.
                    // ProjectOwners: {
                    //     select: {
                    //         B: true, // user_id
                    //     },
                    // },
                    users: { // Renamed from members to match Prisma schema
                        select: {
                            id: true,
                            email: true,
                            first_name: true,
                            last_name: true,
                            avatar_url: true,
                        },
                    },
                    clients: {
                        select: {
                            id: true,
                            nombre: true,
                            contacto: true,
                        },
                    },
                    phases: true, // Renamed from phase to match Prisma schema
                    _count: {
                        select: {
                            tasks: true,
                            sprints: true,
                        },
                    },
                },
                orderBy: {
                    created_at: 'desc', // Fixed: snake_case
                },
            }),
            this.prisma.projects.count({ where }),
        ]);

        console.log(`[ProjectsService.findAll] Found ${projects.length} projects, total: ${total}`);

        return {
            data: projects,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string, user: any) {
        const { organization_id, id: user_id, roles } = user; // Fixed: use 'roles' instead of 'role'

        const project = await this.prisma.projects.findFirst({
            where: {
                id,
                organization_id,
                deleted_at: null, // Fixed: snake_case
            },
            include: {
                    // ProjectOwners: {
                    //     select: {
                    //         B: true,
                    //     },
                    // },
                users: { // Renamed from members to match Prisma schema
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        avatar_url: true,
                        roles: { select: { name: true } }
                    },
                },
                sprints: {
                    orderBy: { start_date: 'desc' },
                    take: 5,
                },
                tasks: {
                    where: {},
                    take: 10,
                    orderBy: { created_at: 'desc' }, // Fixed: snake_case
                    include: {
                        assignee: {
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        tasks: true,
                        sprints: true,
                    },
                },
                clients: {
                    select: {
                        id: true,
                        nombre: true,
                        email: true,
                        telefono: true,
                        contacto: true,
                    },
                },
                phases: true, // Renamed from phase to match Prisma schema
            },
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        // Fetch owner if owner_id exists
        let owner = null;
        if (project.owner_id) {
            owner = await this.prisma.users.findUnique({
                where: { id: project.owner_id },
                select: {
                    id: true,
                    email: true,
                    first_name: true,
                    last_name: true,
                    avatar_url: true,
                },
            });
        }

        // RBAC Check
        const isAdmin = EXECUTIVE_ROLES.includes(roles?.toUpperCase());
        if (!isAdmin) {
            // Check if owner (primary or co-owner)
            const isOwner = project.owner_id === user_id; // || project.ProjectOwners.some(po => po.B === user_id); // COMMENTED
            // Check if member
            const isMember = project.users.some(m => m.id === user_id);

            if (!isOwner && !isMember) {
                // Check if has assigned tasks
                const hasAssignedTasks = await this.prisma.tasks.findFirst({
                    where: {
                        project_id: id,
                        assignee_id: user_id,
                    },
                    select: { id: true }
                });

                if (!hasAssignedTasks) {
                    throw new ForbiddenException('You do not have permission to view this project');
                }
            }
        }

        return { ...project, owner };
    }

    async update(id: string, user: any, updateProjectDto: UpdateProjectDto) {
        const { organization_id, roles } = user; // Fixed: use 'roles' instead of 'role'

        // RBAC: Only Executives can edit projects (Name, Description, Dates, Owner, etc.)
        const isExecutive = EXECUTIVE_ROLES.includes(roles?.toUpperCase());
        if (!isExecutive) {
            throw new ForbiddenException('Only Executives can edit projects');
        }

        const project = await this.prisma.projects.findFirst({ where: { id, organization_id } });
        if (!project) throw new NotFoundException('Project not found');

        const { owner_ids, owner_id, start_date, endDate, memberIds, client_id, phase_id, ...rest } = updateProjectDto;
        const data: any = { ...rest };

        if (start_date) data.start_date = new Date(start_date);
        if (endDate) data.end_date = new Date(endDate); // Fixed: snake_case

        if (owner_ids) {
            const owners = await this.prisma.users.findMany({
                where: {
                    id: { in: owner_ids },
                    organization_id,
                    is_active: true,
                },
            });

            if (owners.length === 0) {
                throw new BadRequestException('No valid owners found in this organization');
            }

            data.owners = {
                set: owners.map(o => ({ id: o.id }))
            };
            // Do not set owner_id directly to avoid "Unknown argument" error
            // The relation update might handle it or we might need to connect 'owner' relation separately
            // However, since 'owner' relation uses 'owner_id' field, setting 'owner_id' should work IF 'owner' relation is not also being set?
            // Actually, the error suggests owner_id is NOT in the update input.
            // Let's try connecting the single owner relation if we want to update the primary owner.
            data.owner = { connect: { id: owners[0].id } };
        } else if (owner_id) {
            // Fallback for single owner update
            const owner = await this.prisma.users.findFirst({
                where: { id: owner_id, organization_id, is_active: true }
            });
            if (!owner) throw new BadRequestException('Owner not found');

            // data.owner_id = owner_id; // Remove this
            data.owner = { connect: { id: owner_id } };
            data.owners = {
                set: [{ id: owner_id }]
            };
        }

        if (memberIds) {
            data.members = {
                set: memberIds.map(id => ({ id }))
            };
        }

        if (client_id) {
            data.client = { connect: { id: client_id } };
        }

        // Handle phase_id: connect if provided, disconnect if explicitly null/undefined
        if (phase_id !== undefined) {
            if (phase_id) {
                // Validate phase exists in organization
                const phase = await this.prisma.phases.findFirst({
                    where: { id: phase_id, organization_id },
                });
                if (!phase) {
                    throw new BadRequestException('Phase not found in this organization');
                }
                data.phase = { connect: { id: phase_id } };
            } else {
                // Disconnect phase if phase_id is null or empty string
                data.phase = { disconnect: true };
            }
        }

        return this.prisma.projects.update({
            where: { id },
            data,
            include: {
                    // ProjectOwners: {
                    //     select: {
                    //         B: true,
                    //     },
                    // },
                clients: {
                    select: {
                        id: true,
                        nombre: true,
                        contacto: true,
                    },
                },
                _count: {
                    select: {
                        tasks: true,
                        sprints: true,
                    },
                },
            },
        });
    }

    async remove(id: string, organization_id: string) {
        const project = await this.prisma.projects.findFirst({ where: { id, organization_id } });
        if (!project) throw new NotFoundException('Project not found');

        // Soft delete
        return this.prisma.projects.update({
            where: { id },
            data: {
                deleted_at: new Date(), // Fixed: snake_case
            },
        });
    }

    async changeStatus(id: string, organization_id: string, changeStatusDto: ChangeProjectStatusDto, user: any) {
        const project = await this.prisma.projects.findFirst({
            where: { id, organization_id },
            include: {
                users: {
                    select: { id: true },
                },
            },
        });
        if (!project) throw new NotFoundException('Project not found');

        const updatedProject = await this.prisma.projects.update({
            where: { id },
            data: {
                status: changeStatusDto.status,
            },
        });

        // Send notifications for status changes
        if (changeStatusDto.status === ProjectStatus.COMPLETED) {
            try {
                const notifications = [
                    // Notify owner
                    project.owner_id && project.owner_id !== user.id
                        ? this.notificationsService.createInAppNotification({
                              user_id: project.owner_id,
                              title: 'Project Completed',
                              message: `Project "${project.name}" has been marked as completed`,
                              type: 'PROJECT_COMPLETED',
                              link: `/projects/${id}`,
                              organization_id: organization_id,
                              metadata: { project_id: id },
                          })
                        : null,
                    // Notify members
                    ...project.users
                        .filter(member => member.id !== user.id && member.id !== project.owner_id)
                        .map(member =>
                            this.notificationsService.createInAppNotification({
                                user_id: member.id,
                                title: 'Project Completed',
                                message: `Project "${project.name}" has been marked as completed`,
                                type: 'PROJECT_COMPLETED',
                                link: `/projects/${id}`,
                                organization_id: organization_id,
                                metadata: { project_id: id },
                            })
                        ),
                ].filter(Boolean);

                await Promise.all(notifications);
            } catch (error) {
                console.error('Failed to send notification:', error);
            }
        }

        return updatedProject;
    }

    async getStatistics(id: string, organization_id: string) {
        // Ensure project exists
        const project = await this.prisma.projects.findFirst({ where: { id, organization_id } });
        if (!project) throw new NotFoundException('Project not found');

        const [taskStats, sprintStats] = await Promise.all([
            this.prisma.tasks.groupBy({
                by: ['status'],
                where: {
                    project_id: id,
                    organization_id,
                },
                _count: true,
            }),
            this.prisma.sprints.count({
                where: {
                    project_id: id,
                    organization_id,
                },
            }),
        ]);

        const totalTasks = taskStats.reduce((acc, stat) => acc + stat._count, 0);
        const completedTasks = taskStats.find((s) => s.status === 'DONE')?._count || 0;
        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        return {
            totalTasks,
            completedTasks,
            progress: Math.round(progress * 100) / 100,
            tasksByStatus: taskStats.reduce((acc, stat) => {
                acc[stat.status] = stat._count;
                return acc;
            }, {}),
            totalSprints: sprintStats,
        };
    }
    async getFinancialStats(id: string, user: any) {
        const { organization_id, roles } = user; // Fixed: use 'roles' instead of 'role'

        // RBAC: Check if user is Admin/Executive
        const isAdmin = EXECUTIVE_ROLES.includes(roles?.toUpperCase());

        try {
            // Ensure project exists first
            const project = await this.prisma.projects.findFirst({ where: { id, organization_id } });
            if (!project) throw new NotFoundException('Project not found');

            // Always fetch time entries (hours)
            const timeEntriesPromise = this.prisma.time_entries.aggregate({
                where: { project_id: id, organization_id },
                _sum: { hours: true },
            });

            // Only fetch financial data if admin
            const expensesPromise = isAdmin ? this.prisma.expenses.aggregate({
                where: { project_id: id, organization_id },
                _sum: { amount: true },
            }) : Promise.resolve({ _sum: { amount: 0 } });

            const receivablesPromise = isAdmin ? this.prisma.accounts_receivable.aggregate({
                where: { project_id: id, organization_id },
                _sum: { monto: true, monto_pagado: true },
            }) : Promise.resolve({ _sum: { monto: 0, monto_pagado: 0 } });

            const [expenses, receivables, timeEntries] = await Promise.all([
                expensesPromise,
                receivablesPromise,
                timeEntriesPromise
            ]);

            const totalExpenses = Number(expenses._sum.amount || 0);
            const totalInvoiced = Number(receivables._sum.monto || 0);
            const totalPaid = Number(receivables._sum.monto_pagado || 0);
            const totalHours = Number(timeEntries._sum.hours || 0);

            // Calculate profit (Simplified: Invoiced - Expenses)
            const profit = totalInvoiced - totalExpenses;
            const margin = totalInvoiced > 0 ? (profit / totalInvoiced) * 100 : 0;

            return {
                totalExpenses,
                totalInvoiced,
                totalPaid,
                totalHours,
                profit,
                margin: Math.round(margin * 100) / 100,
                outstandingAmount: totalInvoiced - totalPaid,
            };
        } catch (error) {
            console.error('Error getting financial stats:', error);
            // Return zeroed stats instead of crashing
            return {
                totalExpenses: 0,
                totalInvoiced: 0,
                totalPaid: 0,
                totalHours: 0,
                profit: 0,
                margin: 0,
                outstandingAmount: 0,
            };
        }
    }
}
