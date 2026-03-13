import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { RenovadosService, CreateRenovadoDto, AddRefaccionDto, CreateIncidenciaDto } from './renovados.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('taller-r1/renovados')
export class RenovadosController {
    constructor(private readonly renovadosService: RenovadosService) { }

    @Get()
    async findAll() {
        return this.renovadosService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.renovadosService.findOne(id);
    }

    @Post()
    async create(@Body() dto: CreateRenovadoDto) {
        return this.renovadosService.create(dto);
    }

    @Put('fase/:id/start')
    async startFase(@Param('id') id: string, @Body('tecnico') tecnico: string) {
        return this.renovadosService.startFase(id, tecnico);
    }

    @Put('fase/:id/complete')
    async completeFase(@Param('id') id: string) {
        return this.renovadosService.completeFase(id);
    }

    @Post(':id/refacciones')
    async addRefaccion(@Param('id') id: string, @Body() dto: AddRefaccionDto) {
        return this.renovadosService.addRefaccion(id, dto);
    }

    @Post(':id/incidencias')
    async createIncidencia(@Param('id') id: string, @Body() dto: CreateIncidenciaDto) {
        return this.renovadosService.createIncidencia(id, dto);
    }

    @Put('incidencia/:id/close')
    async closeIncidencia(@Param('id') id: string) {
        return this.renovadosService.closeIncidencia(id);
    }

    @Put(':id/finalize')
    async finalizeRenovado(@Param('id') id: string) {
        return this.renovadosService.finalizeRenovado(id);
    }
}
