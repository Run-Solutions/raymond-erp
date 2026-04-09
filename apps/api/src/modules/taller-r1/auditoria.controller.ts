import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AuditoriaService, CreateAuditoriaDto } from './auditoria.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('auditoria')
@Controller(':site/auditoria')
export class AuditoriaController {
    constructor(private readonly auditoriaService: AuditoriaService) {}

    @Get()
    @ApiOperation({ summary: 'Obtener lista de auditorías' })
    async findAll(@Param('site') site: string) {
        console.log(`[AuditoriaController] findAll called for site: ${site}`);
        return this.auditoriaService.findAll();
    }

    @Get(':id/report')
    @ApiOperation({ summary: 'Obtener reporte de escaneados y faltantes' })
    async getReport(@Param('id') id: string) {
        return this.auditoriaService.getReport(id);
    }

    @Post()
    @ApiOperation({ summary: 'Crear nueva auditoría' })
    async create(@Body() createDto: CreateAuditoriaDto) {
        return this.auditoriaService.create(createDto);
    }

    @Post(':id/scan')
    @ApiOperation({ summary: 'Escanear equipo para auditoría' })
    async scanEquipo(@Param('id') id: string, @Body('serial') serial: string) {
        return this.auditoriaService.scanEquipo(id, serial);
    }
}
