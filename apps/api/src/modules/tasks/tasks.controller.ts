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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post()
    @Permissions('tasks:create')
    create(@Request() req, @Body() createTaskDto: CreateTaskDto) {
        return this.tasksService.create(req.user, createTaskDto);
    }

    @Get()
    @Permissions('tasks:read')
    findAll(@Request() req, @Query() query: QueryTaskDto) {
        return this.tasksService.findAll(req.user, query);
    }

    @Get('stats/dashboard')
    @Permissions('tasks:read')
    getDashboardStats(@Request() req) {
        return this.tasksService.getDashboardStats(req.user);
    }

    @Get('kanban/:project_id')
    @Permissions('tasks:read')
    findKanban(@Request() req, @Param('project_id') project_id: string, @Query('sprint_id') sprint_id?: string) {
        return this.tasksService.findKanban(req.user.organization_id, project_id, sprint_id);
    }

    @Get(':id')
    @Permissions('tasks:read')
    findOne(@Param('id') id: string, @Request() req) {
        return this.tasksService.findOne(id, req.user);
    }

    @Patch(':id')
    @Permissions('tasks:update')
    update(@Param('id') id: string, @Request() req, @Body() updateTaskDto: UpdateTaskDto) {
        return this.tasksService.update(id, req.user, updateTaskDto);
    }

    @Patch(':id/move')
    @Permissions('tasks:update')
    moveTask(@Param('id') id: string, @Request() req, @Body() moveTaskDto: MoveTaskDto) {
        return this.tasksService.moveTask(id, req.user.organization_id, moveTaskDto);
    }

    @Patch(':id/assign')
    @Permissions('tasks:update')
    assignTask(@Param('id') id: string, @Request() req, @Body() assignTaskDto: AssignTaskDto) {
        return this.tasksService.assignTask(id, req.user.organization_id, assignTaskDto, req.user);
    }

    @Delete(':id')
    @Permissions('tasks:delete')
    remove(@Param('id') id: string, @Request() req) {
        return this.tasksService.remove(id, req.user);
    }

    @Post(':id/comments')
    @Permissions('tasks:read') // Any user who can read tasks can comment
    addComment(@Param('id') id: string, @Request() req, @Body() body: { content: string }) {
        return this.tasksService.addComment(id, req.user, body.content);
    }

    @Get(':id/comments')
    @Permissions('tasks:read')
    getComments(@Param('id') id: string, @Request() req) {
        return this.tasksService.getComments(id, req.user);
    }
}
