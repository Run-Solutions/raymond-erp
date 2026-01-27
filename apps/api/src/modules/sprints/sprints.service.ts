import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { QuerySprintDto } from './dto/query-sprint.dto';
import { EXECUTIVE_ROLES } from '../../common/constants/roles.constants';

@Injectable()
export class SprintsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(user: any, createSprintDto: CreateSprintDto) {
        const { id: user_id, organization_id, role } = user;

        // RBAC: Check user role
        const isAdmin = EXECUTIVE_ROLES.includes(role?.toUpperCase());
        const isProjectManager = ['PROJECT MANAGER', 'PROJECT_MANAGER'].includes(role?.toUpperCase());

        // Verify project exists and belongs to organization
        const project = await this.prisma.projects.findFirst({
            where: {
                id: createSprintDto.project_id,
                organization_id,
                deleted_at: null, // Fixed: snake_case
            },
            include: {
                // owners: { select: { id: true } }, // COMMENTED: owners relation doesn't exist
                users: { select: { id: true } }, // Fixed: members -> users to match Prisma schema
            },
        });

        if (!project) {
            throw new BadRequestException('Project not found');
        }

        // Check user's relationship with the project
        const isProjectOwner = project.owner_id === user_id;
        // const isProjectCoOwner = project.owners?.some(o => o.id === user_id); // COMMENTED: owners doesn't exist
        const isProjectMember = project.users?.some(m => m.id === user_id); // Fixed: members -> users

        // Authorization logic:
        // - Admins can create sprints in any project
        // - Project Managers can create sprints in projects where they are owner or member
        // - Others can only create if they are owner
        const canCreateSprint = isAdmin ||
            (isProjectManager && (isProjectOwner || isProjectMember)) || // Removed isProjectCoOwner
            isProjectOwner; // Removed isProjectCoOwner

        if (!canCreateSprint) {
            throw new ForbiddenException('You do not have permission to create sprints in this project');
        }

        // Validate dates
        const start_date = new Date(createSprintDto.start_date);
        const endDate = new Date(createSprintDto.end_date);

        if (endDate <= start_date) {
            throw new BadRequestException('End date must be after start date');
        }

        // Validate members are from the project (Developers/Operators)
        if (createSprintDto.memberIds && createSprintDto.memberIds.length > 0) {
            const members = await this.prisma.users.findMany({
                where: {
                    id: { in: createSprintDto.memberIds },
                    organization_id,
                },
                include: {
                    roles: true,
                },
            });

            // Verify all members exist and have appropriate roles
            const validRoles = ['DEVELOPER', 'OPERARIO', 'OPERATOR', 'DEV'];
            const invalidMembers = members.filter(m => {
                const roleName = m.role?.name?.toUpperCase();
                return !validRoles.includes(roleName);
            });

            if (invalidMembers.length > 0) {
                throw new BadRequestException('Only Developers and Operators can be assigned to sprints');
            }
        }

        const { memberIds, ...sprintData } = createSprintDto;

        return this.prisma.sprints.create({
            data: {
                id: require('crypto').randomUUID(),
                ...sprintData,
                start_date, // Use parsed Date object
                end_date: endDate,   // Fixed: snake_case
                organization_id,
                users: memberIds && memberIds.length > 0 // Fixed: members -> users to match Prisma schema
                    ? { connect: memberIds.map(id => ({ id })) }
                    : undefined,
            } as any,
            include: {
                projects: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                users: { // Fixed: members -> users to match Prisma schema
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        avatar_url: true,
                        roles: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        tasks: true,
                    },
                },
            },
        });
    }

    async findAll(user: any, query: QuerySprintDto) {
        const { organization_id, id: user_id, role, isSuperadmin } = user;
        const { project_id, start_dateFrom, start_dateTo, page = 1, limit = 20 } = query;

        // CRITICAL: SuperAdmin without organization_id cannot query sprints
        if (isSuperadmin && !organization_id) {
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
            organization_id, // This will be enforced by the extension
        };

        // RBAC: If not Admin, restrict to projects they have access to
        const roleName = typeof role === 'string' ? role : role?.name || '';
        const normalizedRoleName = roleName ? roleName.toUpperCase().trim() : '';
        const isAdmin = normalizedRoleName ? EXECUTIVE_ROLES.some(r => r.toUpperCase() === normalizedRoleName) : false;
        const isProjectManager = normalizedRoleName === 'PROJECT MANAGER' || normalizedRoleName === 'PM';

        // Project Managers can see all sprints in their organization
        // Other non-admin users see only sprints in projects they have access to
        if (!isAdmin && !isProjectManager) {
            // Get projects user has access to
            const accessibleProjects = await this.prisma.projects.findMany({
                where: {
                    organization_id,
                    deleted_at: null, // Fixed: snake_case
                    OR: [
                        { owner_id: user_id },
                        // { owners: { some: { id: user_id } } }, // COMMENTED: owners relation doesn't exist
                        { users: { some: { id: user_id } } }, // Fixed: members -> users to match Prisma schema
                        { tasks: { some: { assignee_id: user_id } } },
                    ],
                },
                select: { id: true },
            });

            const accessibleProjectIds = accessibleProjects.map(p => p.id);

            if (accessibleProjectIds.length === 0) {
                // User has no accessible projects, return empty
                return {
                    data: [],
                    meta: { total: 0, page, limit, totalPages: 0 },
                };
            }

            where.project_id = { in: accessibleProjectIds };
        }

        if (project_id) {
            // Override with specific project if provided
            where.project_id = project_id;
        }

        if (start_dateFrom || start_dateTo) {
            where.start_date = {};
            if (start_dateFrom) where.start_date.gte = new Date(start_dateFrom);
            if (start_dateTo) where.start_date.lte = new Date(start_dateTo);
        }

        const [sprints, total] = await Promise.all([
            this.prisma.sprints.findMany({
                where,
                skip,
                take: limit,
                include: {
                    projects: {
                        select: {
                            id: true,
                            name: true,
                            status: true,
                        },
                    },
                    users: { // Fixed: members -> users to match Prisma schema
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            avatar_url: true,
                            roles: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                    _count: {
                        select: {
                            tasks: true,
                        },
                    },
                },
                orderBy: {
                    start_date: 'desc',
                },
            }),
            this.prisma.sprints.count({ where }),
        ]);

        return {
            data: sprints,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string, user: any) {
        const { organization_id, id: user_id, role } = user;

        const sprint = await this.prisma.sprints.findFirst({
            where: {
                id,
                organization_id,
            },
            include: {
                projects: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        owner_id: true,
                        start_date: true,
                        end_date: true,
                        users: { // Project team members
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true,
                                avatar_url: true,
                            },
                        },
                    },
                },
                users: { // Fixed: members -> users (relation name is "SprintMembers")
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        avatar_url: true,
                        roles: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                tasks: {
                    include: {
                        assignee: {
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true,
                                avatar_url: true,
                            },
                        },
                    },
                    orderBy: {
                        position: 'asc',
                    },
                },
                _count: {
                    select: {
                        tasks: true,
                    },
                },
            },
        });

        if (!sprint) {
            throw new NotFoundException('Sprint not found');
        }

        // RBAC Check
        const isAdmin = EXECUTIVE_ROLES.includes(role?.toUpperCase());

        if (!isAdmin) {
            // Check if user has access to the project
            const isOwner = sprint.projects.owner_id === user_id; // Fixed: project -> projects (Prisma relation name)
            const isMember = sprint.projects.users.some(m => m.id === user_id); // Fixed: members -> users

            if (!isOwner && !isMember) {
                // Check if has assigned tasks in this sprint
                const hasAssignedTasks = sprint.tasks.some(t => t.assignee_id === user_id);

                if (!hasAssignedTasks) {
                    throw new ForbiddenException('You do not have permission to view this sprint');
                }
            }
        }

        return sprint;
    }

    async update(id: string, user: any, updateSprintDto: UpdateSprintDto) {
        const { organization_id, id: user_id, role } = user;

        const sprint = await this.findOne(id, user);

        // RBAC: Check user role and project relationship
        const isAdmin = EXECUTIVE_ROLES.includes(role?.toUpperCase());
        const isProjectManager = ['PROJECT MANAGER', 'PROJECT_MANAGER'].includes(role?.toUpperCase());
        const isProjectOwner = sprint.project.owner_id === user_id;
        // const isProjectCoOwner = sprint.project.owners.some(o => o.id === user_id); // COMMENTED: owners doesn't exist
        const isProjectMember = sprint.project.users.some(m => m.id === user_id); // Fixed: members -> users

        // Authorization logic: same as create
        const canUpdateSprint = isAdmin ||
            (isProjectManager && (isProjectOwner || isProjectMember)) || // Removed isProjectCoOwner
            isProjectOwner; // Removed isProjectCoOwner

        if (!canUpdateSprint) {
            throw new ForbiddenException('You do not have permission to update this sprint');
        }

        // Validate dates if provided
        let start_date: Date | undefined;
        let endDate: Date | undefined;

        if (updateSprintDto.start_date) {
            start_date = new Date(updateSprintDto.start_date);
        }
        if (updateSprintDto.end_date) {
            endDate = new Date(updateSprintDto.end_date);
        }

        // If both provided, validate range
        if (start_date && endDate) {
            if (endDate <= start_date) {
                throw new BadRequestException('End date must be after start date');
            }
        } else if (start_date && !endDate) {
            // Check against existing end date
            const existingEndDate = new Date(sprint.end_date);
            if (existingEndDate <= start_date) {
                throw new BadRequestException('End date must be after start date');
            }
        } else if (!start_date && endDate) {
            // Check against existing start date
            const existingStartDate = new Date(sprint.start_date);
            if (endDate <= existingStartDate) {
                throw new BadRequestException('End date must be after start date');
            }
        }

        // Validate members if updating
        if (updateSprintDto.memberIds !== undefined) {
            if (updateSprintDto.memberIds.length > 0) {
                const members = await this.prisma.users.findMany({
                    where: {
                        id: { in: updateSprintDto.memberIds },
                        organization_id,
                    },
                    include: {
                        roles: true,
                    },
                });

                const validRoles = ['DEVELOPER', 'OPERARIO', 'OPERATOR', 'DEV'];
                const invalidMembers = members.filter(m => {
                    const roleName = m.role?.name?.toUpperCase();
                    return !validRoles.includes(roleName);
                });

                if (invalidMembers.length > 0) {
                    throw new BadRequestException('Only Developers and Operators can be assigned to sprints');
                }
            }
        }

        const { memberIds, ...sprintData } = updateSprintDto;

        return this.prisma.sprints.update({
            where: { id },
            data: {
                ...sprintData,
                ...(start_date && { start_date }),
                ...(endDate && { endDate }),
                users: memberIds !== undefined // Fixed: members -> users to match Prisma schema
                    ? {
                        set: memberIds.map(id => ({ id }))
                    }
                    : undefined,
            },
            include: {
                projects: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                members: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        avatar_url: true,
                        roles: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        tasks: true,
                    },
                },
            },
        });
    }

    async remove(id: string, user: any) {
        const { organization_id, id: user_id, role } = user;

        const sprint = await this.findOne(id, user);

        // RBAC: Check user role and project relationship
        const isAdmin = EXECUTIVE_ROLES.includes(role?.toUpperCase());
        const isProjectManager = ['PROJECT MANAGER', 'PROJECT_MANAGER'].includes(role?.toUpperCase());
        const isProjectOwner = sprint.project.owner_id === user_id;
        // const isProjectCoOwner = sprint.project.owners.some(o => o.id === user_id); // COMMENTED: owners doesn't exist
        const isProjectMember = sprint.project.users.some(m => m.id === user_id); // Fixed: members -> users

        // Authorization logic: same as create and update
        const canDeleteSprint = isAdmin ||
            (isProjectManager && (isProjectOwner || isProjectMember)) || // Removed isProjectCoOwner
            isProjectOwner; // Removed isProjectCoOwner

        if (!canDeleteSprint) {
            throw new ForbiddenException('You do not have permission to delete this sprint');
        }

        return this.prisma.sprints.delete({
            where: { id },
        });
    }

    async getBurndown(id: string, user: any) {
        const { organization_id } = user;
        const sprint = await this.findOne(id, user);

        const tasks = await this.prisma.tasks.findMany({
            where: {
                sprint_id: id,
                organization_id,
            },
        });

        const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
        const totalActualHours = tasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
        const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
        const totalTasks = tasks.length;

        const start_date = new Date(sprint.start_date);
        const endDate = new Date(sprint.endDate);
        const today = new Date();

        const totalDays = Math.ceil((endDate.getTime() - start_date.getTime()) / (1000 * 60 * 60 * 24));
        const daysPassed = Math.min(
            Math.ceil((today.getTime() - start_date.getTime()) / (1000 * 60 * 60 * 24)),
            totalDays,
        );

        const idealBurndownRate = totalEstimatedHours / totalDays;
        const idealRemaining = Math.max(0, totalEstimatedHours - idealBurndownRate * daysPassed);

        const completedHours = tasks
            .filter((t) => t.status === 'DONE')
            .reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
        const actualRemaining = totalEstimatedHours - completedHours;

        // Generate burndown chart data
        const chartData = [];
        for (let day = 0; day <= totalDays; day++) {
            const date = new Date(start_date.getTime() + day * 24 * 60 * 60 * 1000);
            const idealValue = Math.max(0, totalEstimatedHours - idealBurndownRate * day);

            chartData.push({
                day,
                date: date.toISOString().split('T')[0],
                idealRemaining: Math.round(idealValue * 100) / 100,
                actualRemaining: day === daysPassed ? actualRemaining : null,
            });
        }

        return {
            totalEstimatedHours,
            totalActualHours,
            completedHours,
            remainingHours: actualRemaining,
            totalTasks,
            completedTasks,
            progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            totalDays,
            daysPassed,
            chartData,
        };
    }

    async getVelocity(id: string, user: any) {
        const { organization_id } = user;
        const sprint = await this.findOne(id, user);

        const tasks = await this.prisma.tasks.findMany({
            where: {
                sprint_id: id,
                organization_id,
                status: 'DONE',
            },
        });

        const completedStoryPoints = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);

        return {
            sprint_id: id,
            sprintName: sprint.name,
            completedTasks: tasks.length,
            completedStoryPoints,
        };
    }

    async getStatistics(id: string, user: any) {
        const { organization_id } = user;
        const sprint = await this.findOne(id, user);

        const taskStats = await this.prisma.tasks.groupBy({
            by: ['status'],
            where: {
                sprint_id: id,
                organization_id,
            },
            _count: true,
        });

        const totalTasks = taskStats.reduce((acc, stat) => acc + stat._count, 0);
        const completedTasks = taskStats.find((s) => s.status === 'DONE')?._count || 0;
        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // Calculate estimated vs actual hours
        const tasks = await this.prisma.tasks.findMany({
            where: {
                sprint_id: id,
                organization_id,
            },
            select: {
                estimatedHours: true,
                actualHours: true,
                status: true,
            },
        });

        const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
        const totalActualHours = tasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);

        return {
            totalTasks,
            completedTasks,
            progress: Math.round(progress * 100) / 100,
            tasksByStatus: taskStats.reduce((acc, stat) => {
                acc[stat.status] = stat._count;
                return acc;
            }, {}),
            totalEstimatedHours,
            totalActualHours,
            hoursVariance: totalActualHours - totalEstimatedHours,
        };
    }
}
