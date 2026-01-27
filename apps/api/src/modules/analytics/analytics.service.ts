import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);
    
    constructor(private readonly prisma: PrismaService) { }

    // Helper function to safely convert Prisma Decimal to number
    private toNumber(value: any): number {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return parseFloat(value) || 0;
        if (value && typeof value.toNumber === 'function') return value.toNumber(); // Prisma Decimal
        return Number(value) || 0;
    }

    async getDashboardOverview(organization_id: string) {
        // Validate organization_id
        if (!organization_id) {
            throw new BadRequestException('Organization ID is required');
        }

        try {
        // Fetch basic counts
        const [
            projectsCount,
            activeProjects,
            tasksCount,
            completedTasks,
            activeUsers,
            sprintsCount,
            totalAP,
            totalAR,
            fixedCosts,
        ] = await Promise.all([
            this.prisma.projects.count({
                where: { organization_id, deleted_at: null },
            }),
            this.prisma.projects.count({
                where: { organization_id, status: 'ACTIVE', deleted_at: null },
            }),
            this.prisma.tasks.count({
                where: { organization_id },
            }),
            this.prisma.tasks.count({
                where: { organization_id, status: 'DONE' },
            }),
            this.prisma.users.count({
                where: { organization_id, is_active: true },
            }),
            this.prisma.sprints.count({
                where: { organization_id },
            }),
            this.prisma.accounts_payable.aggregate({
                where: {
                    organization_id,
                    status: { in: ['PENDING', 'PARTIAL'] }
                },
                _sum: { monto_restante: true },
            }),
            this.prisma.accounts_receivable.aggregate({
                where: {
                    organization_id,
                    status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] }
                },
                _sum: { monto_restante: true },
            }),
            this.prisma.fixed_costs.aggregate({
                where: { organization_id, is_active: true },
                _sum: { monto: true },
            }),
        ]);

        // CRITICAL: Get recent activity from actual modules being used
        const [
            recentProjects,
            recentTasks,
            recentClients,
            recentSuppliers,
            recentAR,
            recentAP,
            recentPOs,
        ] = await Promise.all([
            this.prisma.projects.findMany({
                where: { organization_id, deleted_at: null },
                take: 3,
                orderBy: { created_at: 'desc' },
                select: { id: true, name: true, created_at: true },
            }),
            this.prisma.tasks.findMany({
                where: { organization_id },
                take: 3,
                orderBy: { created_at: 'desc' },
                select: { id: true, title: true, created_at: true },
            }),
            this.prisma.clients.findMany({
                where: { organization_id },
                take: 2,
                orderBy: { created_at: 'desc' },
                select: { id: true, nombre: true, created_at: true },
            }),
            this.prisma.suppliers.findMany({
                where: { organization_id },
                take: 2,
                orderBy: { created_at: 'desc' },
                select: { id: true, nombre: true, created_at: true },
            }),
            this.prisma.accounts_receivable.findMany({
                where: { organization_id },
                take: 2,
                orderBy: { created_at: 'desc' },
                select: { id: true, concepto: true, monto: true, created_at: true },
            }),
            this.prisma.accounts_payable.findMany({
                where: { organization_id },
                take: 2,
                orderBy: { created_at: 'desc' },
                select: { id: true, concepto: true, monto: true, created_at: true },
            }),
            this.prisma.purchase_orders.findMany({
                where: { organization_id },
                take: 2,
                orderBy: { created_at: 'desc' },
                select: { id: true, folio: true, total: true, created_at: true },
            }),
        ]);

        // Transform to unified activity format
        const recentActivity = [
            ...recentProjects.map(p => ({
                id: p.id,
                action: 'create',
                resource: 'projects',
                metadata: { name: p.name },
                createdAt: p.created_at,
            })),
            ...recentTasks.map(t => ({
                id: t.id,
                action: 'create',
                resource: 'tasks',
                metadata: { title: t.title },
                createdAt: t.created_at,
            })),
            ...recentClients.map(c => ({
                id: c.id,
                action: 'create',
                resource: 'clients',
                metadata: { name: c.nombre },
                createdAt: c.created_at,
            })),
            ...recentSuppliers.map(s => ({
                id: s.id,
                action: 'create',
                resource: 'suppliers',
                metadata: { name: s.nombre },
                createdAt: s.created_at,
            })),
            ...recentAR.map(ar => ({
                id: ar.id,
                action: 'create',
                resource: 'finance',
                metadata: { concept: ar.concepto, amount: ar.monto },
                createdAt: ar.created_at,
            })),
            ...recentAP.map(ap => ({
                id: ap.id,
                action: 'create',
                resource: 'finance',
                metadata: { concept: ap.concepto, amount: ap.monto },
                createdAt: ap.created_at,
            })),
            ...recentPOs.map(po => ({
                id: po.id,
                action: 'create',
                resource: 'finance',
                metadata: { folio: po.folio, total: po.total },
                createdAt: po.created_at,
            })),
        ].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 10);

        // CRITICAL: Top clients based on accounts receivable and projects
        // Limit to 50 to prevent performance issues with large datasets
        const allClients = await this.prisma.clients.findMany({
            where: { organization_id },
            take: 50, // Performance: Limit before processing
            include: {
                _count: {
                    select: { 
                        accounts_receivable: true,
                        projects: true,
                    },
                },
                accounts_receivable: {
                    select: {
                        monto: true,
                        monto_pagado: true,
                    },
                },
                projects: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        const topClients = allClients.map(c => ({
            ...c,
            activityScore: c._count.accounts_receivable + c._count.projects,
            totalRevenue: c.accounts_receivable.reduce((sum, ar) => 
                sum + this.toNumber(ar.monto), 0
            ),
        })).sort((a, b) => {
            if (b.activityScore !== a.activityScore) {
                return b.activityScore - a.activityScore;
            }
            return b.totalRevenue - a.totalRevenue;
        }).slice(0, 5);

        // CRITICAL: Top suppliers based on accounts payable and purchase orders
        // Limit to 50 to prevent performance issues with large datasets
        const allSuppliers = await this.prisma.suppliers.findMany({
            where: { organization_id },
            take: 50, // Performance: Limit before processing
            include: {
                _count: {
                    select: { 
                        accounts_payable: true,
                        purchase_orders: true,
                    },
                },
                accounts_payable: {
                    select: {
                        monto: true,
                    },
                },
                purchase_orders: {
                    select: {
                        total: true,
                    },
                },
            },
        });

        const topSuppliers = allSuppliers.map(s => ({
            ...s,
            activityScore: s._count.accounts_payable + s._count.purchase_orders,
            totalSpent: 
                s.accounts_payable.reduce((sum, ap) => sum + this.toNumber(ap.monto), 0) +
                s.purchase_orders.reduce((sum, po) => sum + this.toNumber(po.total), 0),
        })).sort((a, b) => {
            if (b.activityScore !== a.activityScore) {
                return b.activityScore - a.activityScore;
            }
            return b.totalSpent - a.totalSpent;
        }).slice(0, 5);

        const tasksCompletionRate = tasksCount > 0 ? (completedTasks / tasksCount) * 100 : 0;

        // Calculate monthly revenue for the last 12 months
        // CRITICAL: Use accounts_receivable (Cuentas por Cobrar) instead of invoices
        // This matches the modules actually being used
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

        // Get accounts receivable payments (monto_pagado) grouped by month
        const accountsReceivable = await this.prisma.accounts_receivable.findMany({
            where: {
                organization_id,
                created_at: {
                    gte: twelveMonthsAgo,
                },
            },
            select: {
                monto_pagado: true,
                monto: true, // Total amount (for when payment date is not available, use creation date)
                created_at: true,
                updated_at: true,
            },
        });

        // Group by month - use monto_pagado as revenue (money actually received)
        // If no payment yet, use monto for pending receivables (potential revenue)
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const revenueByMonth: Record<string, number> = {};

        accountsReceivable.forEach(ar => {
            // Use creation date to group by month
            const date = new Date(ar.created_at);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            
            // Revenue = total amount of accounts receivable created in this month
            // This represents both received payments and pending amounts
            // For more accurate revenue tracking, we use the total monto (which includes paid and pending)
            const revenue = this.toNumber(ar.monto);
            revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + revenue;
        });

        // Create array of last 12 months with data
        const revenueData = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            revenueData.push({
                name: monthNames[date.getMonth()],
                total: revenueByMonth[monthKey] || 0,
            });
        }

        // Ensure arrays are always returned, even if empty
        const result = {
            projects: {
                total: projectsCount,
                active: activeProjects,
            },
            tasks: {
                total: tasksCount,
                completed: completedTasks,
                completionRate: Math.round(tasksCompletionRate * 100) / 100,
            },
            sprints: {
                total: sprintsCount,
            },
            users: {
                active: activeUsers,
            },
            finance: {
                totalAP: this.toNumber(totalAP._sum.monto_restante),
                totalAR: this.toNumber(totalAR._sum.monto_restante),
                fixedCostsMonthly: this.toNumber(fixedCosts._sum.monto),
            },
            topClients: Array.isArray(topClients) ? topClients.map(c => ({
                id: c.id,
                name: c.nombre,
                invoicesCount: c._count?.accounts_receivable || 0,
                projectsCount: c._count?.projects || 0,
                revenue: this.toNumber(c.totalRevenue),
            })) : [],
            topSuppliers: Array.isArray(topSuppliers) ? topSuppliers.map(s => ({
                id: s.id,
                name: s.nombre,
                apCount: s._count?.accounts_payable || 0,
                poCount: s._count?.purchase_orders || 0,
                totalSpent: this.toNumber(s.totalSpent),
            })) : [],
            revenueData: Array.isArray(revenueData) && revenueData.length > 0 ? revenueData : (() => {
                // Return 12 months with 0 values if no data
                const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                const now = new Date();
                return Array.from({ length: 12 }, (_, i) => {
                    const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
                    return {
                        name: monthNames[date.getMonth()],
                        total: 0,
                    };
                });
            })(),
            recentActivity: Array.isArray(recentActivity) ? recentActivity : [],
        };

        return result;
        } catch (error) {
            this.logger.error(`[getDashboardOverview] Error for organization ${organization_id}:`, error);
            // Return empty data structure instead of failing completely
            const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const now = new Date();
            const emptyRevenueData = Array.from({ length: 12 }, (_, i) => {
                const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
                return {
                    name: monthNames[date.getMonth()],
                    total: 0,
                };
            });
            
            return {
                projects: { total: 0, active: 0 },
                tasks: { total: 0, completed: 0, completionRate: 0 },
                sprints: { total: 0 },
                users: { active: 0 },
                finance: { totalAP: 0, totalAR: 0, fixedCostsMonthly: 0 },
                topClients: [],
                topSuppliers: [],
                revenueData: emptyRevenueData,
                recentActivity: [],
            };
        }
    }

    async getProjectsKPIs(organization_id: string) {
        const projects = await this.prisma.projects.findMany({
            where: { organization_id, deleted_at: null }, // Fixed: snake_case
            include: {
                tasks: true,
                _count: {
                    select: {
                        tasks: true,
                        sprints: true,
                    },
                },
            },
        });

        const projectsWithMetrics = projects.map((project) => {
            const totalTasks = project.tasks.length;
            const completedTasks = project.tasks.filter((t) => t.status === 'DONE').length;
            const inProgressTasks = project.tasks.filter((t) => t.status === 'IN_PROGRESS').length;
            const overdueTasks = project.tasks.filter(
                (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'DONE',
            ).length;

            return {
                project_id: project.id,
                projectName: project.name,
                status: project.status,
                totalTasks,
                completedTasks,
                inProgressTasks,
                overdueTasks,
                completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
                totalSprints: project._count.sprints,
            };
        });

        return {
            totalProjects: projects.length,
            projects: projectsWithMetrics,
            summary: {
                avgCompletionRate:
                    projectsWithMetrics.reduce((sum, p) => sum + p.completionRate, 0) / projects.length || 0,
                totalOverdueTasks: projectsWithMetrics.reduce((sum, p) => sum + p.overdueTasks, 0),
            },
        };
    }

    async getFinanceKPIs(organization_id: string, start_date?: string, endDate?: string) {
        // Build date filter for journal entries
        const journalEntryWhere: any = { organization_id };
        if (start_date || endDate) {
            journalEntryWhere.date = {};
            if (start_date) journalEntryWhere.date.gte = new Date(start_date);
            if (endDate) journalEntryWhere.date.lte = new Date(endDate);
        }

        const [accounts, journalEntries] = await Promise.all([
            this.prisma.accounts.findMany({
                where: { organization_id },
            }),
            this.prisma.journal_entries.count({
                where: journalEntryWhere,
            }),
        ]);

        let totalRevenue = 0;
        let totalExpenses = 0;
        let totalAssets = 0;
        let totalLiabilities = 0;

        // Query journal lines for each account
        for (const account of accounts) {
            // Build where clause for journal lines with date filter
            const journalLineWhere: any = {
                journalEntry: journalEntryWhere,
            };

            // Get debit entries for this account
            const debitEntries = await this.prisma.journal_lines.findMany({
                where: {
                    debitAccountId: account.id,
                    ...journalLineWhere,
                },
            });

            // Get credit entries for this account
            const creditEntries = await this.prisma.journal_lines.findMany({
                where: {
                    creditAccountId: account.id,
                    ...journalLineWhere,
                },
            });

            const debits = debitEntries.reduce((sum, e) => sum + Number(e.amount), 0);
            const credits = creditEntries.reduce((sum, e) => sum + Number(e.amount), 0);

            if (account.type === 'REVENUE') {
                totalRevenue += credits - debits;
            } else if (account.type === 'EXPENSE') {
                totalExpenses += debits - credits;
            } else if (account.type === 'ASSET') {
                totalAssets += debits - credits;
            } else if (account.type === 'LIABILITY') {
                totalLiabilities += credits - debits;
            }
        }

        const netIncome = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

        return {
            period: {
                start_date: start_date || null,
                endDate: endDate || null,
            },
            revenue: totalRevenue,
            expenses: totalExpenses,
            netIncome,
            profitMargin: Math.round(profitMargin * 100) / 100,
            assets: totalAssets,
            liabilities: totalLiabilities,
            equity: totalAssets - totalLiabilities,
            transactionsCount: journalEntries,
        };
    }

    async getTasksMetrics(organization_id: string) {
        const tasks = await this.prisma.tasks.findMany({
            where: { organization_id },
        });

        const byStatus = tasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const byPriority = tasks.reduce((acc, task) => {
            acc[task.priority] = (acc[task.priority] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const overdueTasks = tasks.filter(
            (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'DONE',
        );

        const avgEstimatedHours =
            tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0) / tasks.length || 0;
        const avgActualHours =
            tasks.filter((t) => t.actualHours).reduce((sum, t) => sum + (t.actualHours || 0), 0) /
            tasks.filter((t) => t.actualHours).length || 0;

        return {
            total: tasks.length,
            byStatus,
            byPriority,
            overdue: overdueTasks.length,
            avgEstimatedHours: Math.round(avgEstimatedHours * 100) / 100,
            avgActualHours: Math.round(avgActualHours * 100) / 100,
        };
    }

    async getUsersActivity(organization_id: string) {
        const users = await this.prisma.users.findMany({
            where: { organization_id, is_active: true },
            include: {
                _count: {
                    select: {
                        assignedTasks: true,
                        reportedTasks: true,
                        projects: true,
                    },
                },
            },
        });

        return users.map((user) => ({
            user_id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            lastLoginAt: user.lastLoginAt,
            assignedTasks: user._count.assignedTasks,
            reportedTasks: user._count.reportedTasks,
            projectsOwned: user._count.projects,
        }));
    }

    async getSprintVelocity(organization_id: string, project_id?: string) {
        const where: any = { organization_id };
        if (project_id) where.project_id = project_id;

        const sprints = await this.prisma.sprints.findMany({
            where,
            include: {
                tasks: {
                    where: { status: 'DONE' },
                },
                projects: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { start_date: 'desc' },
            take: 10,
        });

        const velocityData = sprints.map((sprint) => {
            const completedStoryPoints = sprint.tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
            return {
                sprint_id: sprint.id,
                sprintName: sprint.name,
                projectName: sprint.project.name,
                start_date: sprint.start_date,
                endDate: sprint.endDate,
                completedTasks: sprint.tasks.length,
                completedStoryPoints,
            };
        });

        const avgVelocity =
            velocityData.reduce((sum, s) => sum + s.completedStoryPoints, 0) / velocityData.length || 0;

        return {
            sprints: velocityData,
            averageVelocity: Math.round(avgVelocity * 100) / 100,
        };
    }
}
