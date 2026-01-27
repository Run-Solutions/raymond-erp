
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { FlowRecoveriesService } from './flow-recoveries.service';
import { CreateFlowRecoveryDto } from './dto/create-flow-recovery.dto';
import { UpdateFlowRecoveryDto } from './dto/update-flow-recovery.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { FinancialGuard } from '../../../common/guards/financial.guard';

@Controller('finance/flow-recoveries')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, FinancialGuard)
export class FlowRecoveriesController {
    constructor(private readonly service: FlowRecoveriesService) { }

    @Post()
    @Permissions('finance:create')
    create(@Request() req, @Body() createDto: CreateFlowRecoveryDto) {
        return this.service.create(req.user.organization_id, createDto);
    }

    @Get()
    @Permissions('finance:read')
    findAll(@Request() req) {
        return this.service.findAll(req.user.organization_id);
    }

    @Get(':id')
    @Permissions('finance:read')
    findOne(@Param('id') id: string, @Request() req) {
        return this.service.findOne(id, req.user.organization_id);
    }

    @Patch(':id')
    @Permissions('finance:update')
    update(@Param('id') id: string, @Request() req, @Body() updateDto: UpdateFlowRecoveryDto) {
        return this.service.update(id, req.user.organization_id, updateDto);
    }

    @Delete(':id')
    @Permissions('finance:delete')
    remove(@Param('id') id: string, @Request() req) {
        return this.service.remove(id, req.user.organization_id);
    }
}
