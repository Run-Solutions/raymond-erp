import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
    Query,
} from '@nestjs/common';
import { AccountsPayableService } from './accounts-payable.service';
import { CreateAccountPayableDto } from './dto/create-ap.dto';
import { UpdateAccountPayableDto } from './dto/update-ap.dto';
import { QueryAccountPayableDto } from './dto/query-ap.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { FinancialGuard } from '../../../common/guards/financial.guard';

@Controller('finance/ap')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, FinancialGuard)
export class AccountsPayableController {
    constructor(private readonly service: AccountsPayableService) { }

    @Post()
    @Permissions('finance:create')
    async create(@Request() req, @Body() createDto: CreateAccountPayableDto) {
        const { TenantContext } = await import('../../../common/context/tenant.context');
        const organization_id = TenantContext.getTenantId() || req.user.organization_id;
        return this.service.create(organization_id, createDto);
    }

    @Get()
    @Permissions('finance:read')
    async findAll(@Request() req, @Query() query: QueryAccountPayableDto) {
        const { TenantContext } = await import('../../../common/context/tenant.context');
        const organization_id = TenantContext.getTenantId() || req.user.organization_id;
        return this.service.findAll(organization_id, query);
    }

    @Get('statistics')
    @Permissions('finance:read')
    async getStatistics(@Request() req) {
        const { TenantContext } = await import('../../../common/context/tenant.context');
        const organization_id = TenantContext.getTenantId() || req.user.organization_id;
        return this.service.getStatistics(organization_id);
    }

    @Get(':id')
    @Permissions('finance:read')
    async findOne(@Param('id') id: string, @Request() req) {
        const { TenantContext } = await import('../../../common/context/tenant.context');
        const organization_id = TenantContext.getTenantId() || req.user.organization_id;
        return this.service.findOne(id, organization_id);
    }

    @Patch(':id')
    @Permissions('finance:update')
    async update(@Param('id') id: string, @Request() req, @Body() updateDto: UpdateAccountPayableDto) {
        const { TenantContext } = await import('../../../common/context/tenant.context');
        const organization_id = TenantContext.getTenantId() || req.user.organization_id;
        return this.service.update(id, organization_id, updateDto);
    }

    @Delete(':id')
    @Permissions('finance:delete')
    async remove(@Param('id') id: string, @Request() req) {
        const { TenantContext } = await import('../../../common/context/tenant.context');
        const organization_id = TenantContext.getTenantId() || req.user.organization_id;
        return this.service.remove(id, organization_id);
    }
}
