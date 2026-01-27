import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { DispatchesService } from './dispatches.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { PatchDispatchDto } from './dto/patch-dispatch.dto';
import { QueryDispatchDto } from './dto/query-dispatch.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ExecutiveRoleGuard } from './guards/executive-role.guard';

@Controller('dispatches')
@UseGuards(JwtAuthGuard, ExecutiveRoleGuard)
export class DispatchesController {
    constructor(private readonly dispatchesService: DispatchesService) { }

    @Post()
    create(@Request() req, @Body() createDispatchDto: CreateDispatchDto) {
        return this.dispatchesService.create(req.user, createDispatchDto);
    }

    @Get()
    findAll(@Request() req, @Query() query: QueryDispatchDto) {
        return this.dispatchesService.findAll(req.user, query);
    }

    @Get('stats')
    getStats(@Request() req) {
        return this.dispatchesService.getStats(req.user);
    }

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.dispatchesService.findOne(id, req.user);
    }

    @Patch(':id')
    patch(@Request() req, @Param('id') id: string, @Body() patchDispatchDto: PatchDispatchDto) {
        return this.dispatchesService.patch(id, req.user, patchDispatchDto);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.dispatchesService.remove(id, req.user);
    }

    @Post(':id/read')
    markAsRead(@Request() req, @Param('id') id: string) {
        return this.dispatchesService.markAsRead(id, req.user);
    }

    @Post(':id/progress')
    markInProgress(@Request() req, @Param('id') id: string) {
        return this.dispatchesService.markInProgress(id, req.user);
    }

    @Post(':id/resolve')
    resolve(@Request() req, @Param('id') id: string, @Body('resolutionNote') resolutionNote?: string) {
        return this.dispatchesService.resolve(id, req.user, resolutionNote);
    }

    @Post(':id/convert-to-task')
    convertToTask(@Request() req, @Param('id') id: string, @Body() body: { project_id?: string }) {
        return this.dispatchesService.convertToTask(id, req.user, body.project_id);
    }
}
