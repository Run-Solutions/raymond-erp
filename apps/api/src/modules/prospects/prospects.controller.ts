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
import { ProspectsService } from './prospects.service';
import { CreateProspectDto } from './dto/create-prospect.dto';
import { UpdateProspectDto } from './dto/update-prospect.dto';
import { QueryProspectDto } from './dto/query-prospect.dto';
import { ConvertProspectDto } from './dto/convert-prospect.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { AssignProspectDto } from './dto/assign-prospect.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('prospects')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ProspectsController {
    constructor(private readonly prospectsService: ProspectsService) { }

    @Post()
    @Permissions('prospects:create')
    create(@Request() req, @Body() createProspectDto: CreateProspectDto) {
        return this.prospectsService.create(
            req.user.organization_id,
            createProspectDto,
            req.user.id,
        );
    }

    @Get()
    @Permissions('prospects:read')
    findAll(@Request() req, @Query() query: QueryProspectDto) {
        return this.prospectsService.findAll(req.user.organization_id, query);
    }

    @Get('statistics')
    @Permissions('prospects:read')
    getOrganizationStatistics(@Request() req) {
        return this.prospectsService.getOrganizationStatistics(req.user.organization_id);
    }

    @Get(':id')
    @Permissions('prospects:read')
    findOne(@Param('id') id: string, @Request() req) {
        return this.prospectsService.findOne(id, req.user.organization_id);
    }

    @Get(':id/statistics')
    @Permissions('prospects:read')
    getStatistics(@Param('id') id: string, @Request() req) {
        return this.prospectsService.getStatistics(id, req.user.organization_id);
    }

    @Patch(':id')
    @Permissions('prospects:update')
    update(@Param('id') id: string, @Request() req, @Body() updateProspectDto: UpdateProspectDto) {
        return this.prospectsService.update(id, req.user.organization_id, updateProspectDto);
    }

    @Patch(':id/status')
    @Permissions('prospects:update')
    changeStatus(@Param('id') id: string, @Request() req, @Body() changeStatusDto: ChangeStatusDto) {
        return this.prospectsService.changeStatus(id, req.user.organization_id, changeStatusDto, req.user.id);
    }

    @Patch(':id/assign')
    @Permissions('prospects:assign')
    assign(@Param('id') id: string, @Request() req, @Body() assignDto: AssignProspectDto) {
        return this.prospectsService.assign(id, req.user.organization_id, assignDto);
    }

    @Post(':id/convert')
    @Permissions('prospects:convert')
    convertToClient(@Param('id') id: string, @Request() req, @Body() convertDto: ConvertProspectDto) {
        return this.prospectsService.convertToClient(id, req.user.organization_id, convertDto, req.user.id);
    }

    @Delete(':id')
    @Permissions('prospects:delete')
    remove(@Param('id') id: string, @Request() req) {
        return this.prospectsService.remove(id, req.user.organization_id);
    }
}

