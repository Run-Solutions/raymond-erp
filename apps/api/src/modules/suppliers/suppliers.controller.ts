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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class SuppliersController {
    constructor(private readonly suppliersService: SuppliersService) { }

    @Post()
    @Permissions('suppliers:create')
    create(@Request() req, @Body() createSupplierDto: CreateSupplierDto) {
        return this.suppliersService.create(req.user.organization_id, createSupplierDto);
    }

    @Get()
    @Permissions('suppliers:read')
    findAll(@Request() req, @Query() query: QuerySupplierDto) {
        return this.suppliersService.findAll(req.user.organization_id, query);
    }

    @Get(':id')
    @Permissions('suppliers:read')
    findOne(@Param('id') id: string, @Request() req) {
        return this.suppliersService.findOne(id, req.user.organization_id);
    }

    @Patch(':id')
    @Permissions('suppliers:update')
    update(@Param('id') id: string, @Request() req, @Body() updateSupplierDto: UpdateSupplierDto) {
        return this.suppliersService.update(id, req.user.organization_id, updateSupplierDto);
    }

    @Delete(':id')
    @Permissions('suppliers:delete')
    remove(@Param('id') id: string, @Request() req) {
        return this.suppliersService.remove(id, req.user.organization_id);
    }
}
