import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { PhasesService } from './phases.service';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { QueryPhaseDto } from './dto/query-phase.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('phases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('phases')
export class PhasesController {
    constructor(private readonly phasesService: PhasesService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new phase' })
    create(@Request() req, @Body() createPhaseDto: CreatePhaseDto) {
        return this.phasesService.create(req.user, createPhaseDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all phases for the organization' })
    findAll(@Request() req, @Query() query: QueryPhaseDto) {
        return this.phasesService.findAll(req.user, query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a phase by ID' })
    findOne(@Request() req, @Param('id') id: string) {
        return this.phasesService.findOne(req.user, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a phase' })
    update(@Request() req, @Param('id') id: string, @Body() updatePhaseDto: Partial<CreatePhaseDto>) {
        return this.phasesService.update(req.user, id, updatePhaseDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a phase' })
    remove(@Request() req, @Param('id') id: string) {
        return this.phasesService.remove(req.user, id);
    }
}
