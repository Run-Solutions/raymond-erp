import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../../database/prisma.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { FinancialGuard } from '../../../common/guards/financial.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';

@ApiTags('Finance')
@Controller('finance/dashboard')
@UseGuards(JwtAuthGuard, TenantGuard, FinancialGuard, PermissionsGuard)
export class FinanceDashboardController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    @Permissions('finance:read')
    @ApiOperation({ summary: 'Get finance dashboard data' })
    @ApiResponse({ status: 200, description: 'Finance dashboard data retrieved successfully' })
    async getDashboard(@Request() req, @Query('start_date') start_date?: string, @Query('endDate') endDate?: string) {
        const organization_id = req.user.organization_id;

        const [
            totalAccounts,
            totalAccountsPayable,
            totalAccountsReceivable,
            totalInvoices,
            totalFixedCosts,
            recentTransactions,
        ] = await Promise.all([
            this.prisma.accounts.count({
                where: { organization_id },
            }),
            this.prisma.accounts_payable.aggregate({
                where: { organization_id, pagado: false },
                _sum: { monto: true },
            }),
            this.prisma.accounts_receivable.aggregate({
                where: { organization_id, status: 'PENDING' },
                _sum: { monto_restante: true },
            }),
            this.prisma.invoices.aggregate({
                where: { organization_id },
                _sum: { total: true },
            }),
            this.prisma.fixed_costs.aggregate({
                where: { organization_id },
                _sum: { monto: true },
            }),
            this.prisma.journal_entries.findMany({
                where: { organization_id },
                take: 10,
                orderBy: { created_at: 'desc' },
                include: {
                    journal_lines: {
                        include: {
                            accounts_journal_lines_debit_account_idToaccounts: {
                                select: { name: true, code: true },
                            },
                            accounts_journal_lines_credit_account_idToaccounts: {
                                select: { name: true, code: true },
                            },
                        },
                    },
                },
            }),
        ]);

        return {
            totalAccounts,
            totalAccountsPayable: totalAccountsPayable._sum.monto || 0,
            totalAccountsReceivable: totalAccountsReceivable._sum.monto_restante || 0,
            totalInvoices: totalInvoices._sum.total || 0,
            totalFixedCosts: totalFixedCosts._sum.monto || 0,
            recentTransactions,
        };
    }
}

