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
import { AccountsReceivableService } from './accounts-receivable.service';
import { CreateAccountReceivableDto } from './dto/create-ar.dto';
import { UpdateAccountReceivableDto } from './dto/update-ar.dto';
import { QueryAccountReceivableDto } from './dto/query-ar.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { FinancialGuard } from '../../../common/guards/financial.guard';

@Controller('finance/ar')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, FinancialGuard)
export class AccountsReceivableController {
    constructor(private readonly service: AccountsReceivableService) { }

    @Post()
    @Permissions('finance:create')
    async create(@Request() req, @Body() createDto: CreateAccountReceivableDto) {
        const { TenantContext } = await import('../../../common/context/tenant.context');
        const organization_id = TenantContext.getTenantId() || req.user.organization_id;
        return this.service.create(organization_id, createDto);
    }

    @Get()
    @Permissions('finance:read')
    async findAll(@Request() req, @Query() query: QueryAccountReceivableDto) {
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
    async update(@Param('id') id: string, @Request() req, @Body() updateDto: UpdateAccountReceivableDto) {
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
