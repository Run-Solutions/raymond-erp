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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import { ChangeProjectStatusDto } from './dto/change-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) { }

    @Post()
    @Permissions('projects:create')
    create(@Request() req, @Body() createProjectDto: CreateProjectDto) {
        return this.projectsService.create(req.user, createProjectDto);
    }

    @Get()
    @Permissions('projects:read')
    findAll(@Request() req, @Query() query: QueryProjectDto) {
        return this.projectsService.findAll(req.user, query);
    }

    @Get(':id')
    @Permissions('projects:read')
    findOne(@Param('id') id: string, @Request() req) {
        return this.projectsService.findOne(id, req.user);
    }

    @Get(':id/statistics')
    @Permissions('projects:read')
    getStatistics(@Param('id') id: string, @Request() req) {
        return this.projectsService.getStatistics(id, req.user.organization_id);
    }

    @Get(':id/financial-stats')
    @Permissions('projects:read')
    getFinancialStats(@Param('id') id: string, @Request() req) {
        return this.projectsService.getFinancialStats(id, req.user);
    }

    @Patch(':id')
    @Permissions('projects:update')
    update(@Param('id') id: string, @Request() req, @Body() updateProjectDto: UpdateProjectDto) {
        return this.projectsService.update(id, req.user, updateProjectDto);
    }

    @Patch(':id/status')
    @Permissions('projects:update')
    changeStatus(@Param('id') id: string, @Request() req, @Body() changeStatusDto: ChangeProjectStatusDto) {
        return this.projectsService.changeStatus(id, req.user.organization_id, changeStatusDto, req.user);
    }

    @Delete(':id')
    @Permissions('projects:delete')
    remove(@Param('id') id: string, @Request() req) {
        return this.projectsService.remove(id, req.user.organization_id);
    }
}
