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
    Res,
    StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { QueryPurchaseOrderDto } from './dto/query-purchase-order.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { FinancialGuard } from '../../../common/guards/financial.guard';

@Controller('finance/purchase-orders')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, FinancialGuard)
export class PurchaseOrdersController {
    constructor(private readonly service: PurchaseOrdersService) { }

    @Post()
    @Permissions('finance:create')
    async create(@Request() req, @Body() createDto: CreatePurchaseOrderDto) {
        const { TenantContext } = await import('../../../common/context/tenant.context');
        const organization_id = TenantContext.getTenantId() || req.user.organization_id;
        return this.service.create(organization_id, req.user.id, createDto);
    }

    @Get()
    @Permissions('finance:read')
    async findAll(@Request() req, @Query() query: QueryPurchaseOrderDto) {
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
    async update(@Param('id') id: string, @Request() req, @Body() updateDto: UpdatePurchaseOrderDto) {
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

    @Post(':id/submit')
    @Permissions('finance:update')
    async submitForApproval(@Param('id') id: string, @Request() req) {
        const { TenantContext } = await import('../../../common/context/tenant.context');
        const organization_id = TenantContext.getTenantId() || req.user.organization_id;
        return this.service.submitForApproval(id, organization_id);
    }

    @Post(':id/approve')
    @Permissions('finance:approve')
    async approve(@Param('id') id: string, @Request() req) {
        const { TenantContext } = await import('../../../common/context/tenant.context');
        const organization_id = TenantContext.getTenantId() || req.user.organization_id;
        return this.service.approve(id, organization_id, req.user.id);
    }

    @Post(':id/reject')
    @Permissions('finance:approve')
    async reject(@Param('id') id: string, @Request() req) {
        const { TenantContext } = await import('../../../common/context/tenant.context');
        const organization_id = TenantContext.getTenantId() || req.user.organization_id;
        return this.service.reject(id, organization_id, req.user.id);
    }

    @Post(':id/mark-paid')
    @Permissions('finance:update')
    async markAsPaid(@Param('id') id: string, @Request() req) {
        const { TenantContext } = await import('../../../common/context/tenant.context');
        const organization_id = TenantContext.getTenantId() || req.user.organization_id;
        return this.service.markAsPaid(id, organization_id);
    }

    @Get(':id/pdf')
    @Permissions('finance:read')
    async generatePdf(@Param('id') id: string, @Request() req, @Res() res: Response) {
        const { TenantContext } = await import('../../../common/context/tenant.context');
        const organization_id = TenantContext.getTenantId() || req.user.organization_id;
        const pdfBuffer = await this.service.generatePdf(id, organization_id);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=purchase-order-${id}.pdf`,
            'Content-Length': pdfBuffer.length,
        });

        res.end(pdfBuffer);
    }
}
