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
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { FinancialGuard } from '../../../common/guards/financial.guard';

@Controller('finance/invoices')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, FinancialGuard)
export class InvoicesController {
    constructor(private readonly service: InvoicesService) { }

    @Post()
    @Permissions('finance:create')
    create(@Request() req, @Body() createDto: CreateInvoiceDto) {
        return this.service.create(req.user.organization_id, createDto);
    }

    @Get()
    @Permissions('finance:read')
    findAll(@Request() req, @Query() query: QueryInvoiceDto) {
        return this.service.findAll(req.user.organization_id, query);
    }

    @Get('statistics')
    @Permissions('finance:read')
    getStatistics(@Request() req) {
        return this.service.getStatistics(req.user.organization_id);
    }

    @Get(':id')
    @Permissions('finance:read')
    findOne(@Param('id') id: string, @Request() req) {
        return this.service.findOne(id, req.user.organization_id);
    }

    @Patch(':id')
    @Permissions('finance:update')
    update(@Param('id') id: string, @Request() req, @Body() updateDto: UpdateInvoiceDto) {
        return this.service.update(id, req.user.organization_id, updateDto);
    }

    @Delete(':id')
    @Permissions('finance:delete')
    remove(@Param('id') id: string, @Request() req) {
        return this.service.remove(id, req.user.organization_id);
    }
}
