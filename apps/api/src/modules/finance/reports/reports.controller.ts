import { Controller, Get, UseGuards, Request, Query, Param } from '@nestjs/common';
import { FinanceReportsService } from './reports.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { FinancialGuard } from '../../../common/guards/financial.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';

@Controller('finance/reports')
@UseGuards(JwtAuthGuard, TenantGuard, FinancialGuard, PermissionsGuard)
export class FinanceReportsController {
    constructor(private readonly reportsService: FinanceReportsService) { }

    @Get('trial-balance')
    @Permissions('finance:read')
    trialBalance(@Request() req, @Query('asOfDate') asOfDate?: string) {
        return this.reportsService.trialBalance(req.user.organization_id, asOfDate);
    }

    @Get('income-statement')
    @Permissions('finance:read')
    incomeStatement(@Request() req, @Query('start_date') start_date: string, @Query('endDate') endDate: string) {
        return this.reportsService.incomeStatement(req.user.organization_id, start_date, endDate);
    }

    @Get('balance-sheet')
    @Permissions('finance:read')
    balanceSheet(@Request() req, @Query('asOfDate') asOfDate: string) {
        return this.reportsService.balanceSheet(req.user.organization_id, asOfDate);
    }

    @Get('ledger/:accountId')
    @Permissions('finance:read')
    ledger(
        @Request() req,
        @Param('accountId') accountId: string,
        @Query('start_date') start_date?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.reportsService.ledger(req.user.organization_id, accountId, start_date, endDate);
    }

    @Get('cashflow')
    @Permissions('finance:read')
    cashflow(@Request() req, @Query('start_date') start_date: string, @Query('endDate') endDate: string) {
        return this.reportsService.cashflow(req.user.organization_id, start_date, endDate);
    }
}
