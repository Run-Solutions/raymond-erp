import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { FinancialGuard } from '../../../common/guards/financial.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { AccountType } from '@prisma/client';

@Controller('finance/accounts')
@UseGuards(JwtAuthGuard, TenantGuard, FinancialGuard, PermissionsGuard)
export class AccountsController {
    constructor(private readonly accountsService: AccountsService) { }

    @Post()
    @Permissions('finance:create')
    create(@Request() req, @Body() createAccountDto: CreateAccountDto) {
        return this.accountsService.create(req.user.organization_id, createAccountDto);
    }

    @Get()
    @Permissions('finance:read')
    findAll(@Request() req, @Query('type') type?: AccountType) {
        return this.accountsService.findAll(req.user.organization_id, type);
    }

    @Get(':id')
    @Permissions('finance:read')
    findOne(@Param('id') id: string, @Request() req) {
        return this.accountsService.findOne(id, req.user.organization_id);
    }

    @Get(':id/balance')
    @Permissions('finance:read')
    getBalance(@Param('id') id: string, @Request() req) {
        return this.accountsService.getBalance(id, req.user.organization_id);
    }

    @Patch(':id')
    @Permissions('finance:update')
    update(@Param('id') id: string, @Request() req, @Body() updateAccountDto: UpdateAccountDto) {
        return this.accountsService.update(id, req.user.organization_id, updateAccountDto);
    }

    @Delete(':id')
    @Permissions('finance:delete')
    remove(@Param('id') id: string, @Request() req) {
        return this.accountsService.remove(id, req.user.organization_id);
    }
}
