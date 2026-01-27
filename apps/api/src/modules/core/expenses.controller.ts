import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { ExpenseStatus } from '@prisma/client';

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ExpensesController {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => NotificationsService))
        private readonly notificationsService: NotificationsService,
    ) { }

    @Get()
    @Permissions('expenses:read')
    @ApiOperation({ summary: 'Get all expenses' })
    @ApiResponse({ status: 200, description: 'Expenses retrieved successfully' })
    async getExpenses(
        @Request() req,
        @Query('status') status?: string,
        @Query('project_id') project_id?: string,
        @Query('category') category?: string,
        @Query('search') search?: string,
    ) {
        const where: any = {
            organization_id: req.user.organization_id,
        };

        if (status && status !== 'all') {
            where.status = status;
        }

        if (project_id) {
            where.project_id = project_id;
        }

        if (category && category !== 'all') {
            where.category = category;
        }

        if (search) {
            where.OR = [
                { description: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
            ];
        }

        const expenses = await this.prisma.expenses.findMany({
            where,
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
            },
        });

        return expenses;
    }

    @Post()
    @Permissions('expenses:create')
    @ApiOperation({ summary: 'Create a new expense' })
    @ApiResponse({ status: 201, description: 'Expense created successfully' })
    async createExpense(@Request() req, @Body() createData: any) {
        const expense = await this.prisma.expenses.create({
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
            },
        });

        // Notify if status is SUBMITTED
        if (expense.status === ExpenseStatus.SUBMITTED) {
            try {
                await this.notificationsService.notifyExpenseStatusChanged(
                    expense.id,
                    req.user.id,
                    Number(expense.amount),
                    'SUBMITTED',
                    req.user.organization_id,
                );
            } catch (error) {
                console.error('Failed to send expense notification:', error);
            }
        }

        return expense;
    }

    @Get(':id')
    @Permissions('expenses:read')
    @ApiOperation({ summary: 'Get expense by ID' })
    @ApiResponse({ status: 200, description: 'Expense retrieved successfully' })
    async getExpense(@Param('id') id: string, @Request() req) {
        const expense = await this.prisma.expenses.findFirst({
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
            },
        });

        return expense;
    }

    @Patch(':id')
    @Permissions('expenses:update')
    @ApiOperation({ summary: 'Update expense' })
    @ApiResponse({ status: 200, description: 'Expense updated successfully' })
    async updateExpense(@Param('id') id: string, @Request() req, @Body() updateData: any) {
        // Get current expense to check status change
        const currentExpense = await this.prisma.expenses.findFirst({
            where: {
                id,
                organization_id: req.user.organization_id,
            },
        });

        if (!currentExpense) {
            throw new Error('Expense not found');
        }

        const expense = await this.prisma.expenses.updateMany({
            where: {
                id,
                organization_id: req.user.organization_id,
            },
            data: updateData,
        });

        // Notify if status changed
        if (updateData.status && updateData.status !== currentExpense.status) {
            try {
                const status = updateData.status as ExpenseStatus;
                if (status === ExpenseStatus.APPROVED || status === ExpenseStatus.REJECTED) {
                    await this.notificationsService.notifyExpenseStatusChanged(
                        id,
                        currentExpense.user_id,
                        Number(currentExpense.amount),
                        status === ExpenseStatus.APPROVED ? 'APPROVED' : 'REJECTED',
                        req.user.organization_id,
                    );
                } else if (status === ExpenseStatus.SUBMITTED) {
                    await this.notificationsService.notifyExpenseStatusChanged(
                        id,
                        currentExpense.user_id,
                        Number(currentExpense.amount),
                        'SUBMITTED',
                        req.user.organization_id,
                    );
                }
            } catch (error) {
                console.error('Failed to send expense notification:', error);
            }
        }

        return expense;
    }

    @Delete(':id')
    @Permissions('expenses:delete')
    @ApiOperation({ summary: 'Delete expense' })
    @ApiResponse({ status: 200, description: 'Expense deleted successfully' })
    async deleteExpense(@Param('id') id: string, @Request() req) {
        await this.prisma.expenses.deleteMany({
            where: {
                id,
                organization_id: req.user.organization_id,
            },
        });

        return { success: true };
    }
}

