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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('clients')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ClientsController {
    constructor(private readonly clientsService: ClientsService) { }

    @Post()
    @Permissions('clients:create')
    create(@Request() req, @Body() createClientDto: CreateClientDto) {
        return this.clientsService.create(req.user.organization_id, createClientDto);
    }

    @Get()
    @Permissions('clients:read')
    findAll(@Request() req, @Query() query: QueryClientDto) {
        return this.clientsService.findAll(req.user.organization_id, query);
    }

    @Get(':id')
    @Permissions('clients:read')
    findOne(@Param('id') id: string, @Request() req) {
        return this.clientsService.findOne(id, req.user.organization_id);
    }

    @Get(':id/statistics')
    @Permissions('clients:read')
    getStatistics(@Param('id') id: string, @Request() req) {
        return this.clientsService.getStatistics(id, req.user.organization_id);
    }

    @Patch(':id')
    @Permissions('clients:update')
    update(@Param('id') id: string, @Request() req, @Body() updateClientDto: UpdateClientDto) {
        return this.clientsService.update(id, req.user.organization_id, updateClientDto);
    }

    @Delete(':id')
    @Permissions('clients:delete')
    remove(@Param('id') id: string, @Request() req) {
        return this.clientsService.remove(id, req.user.organization_id);
    }
}
