import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { EntradasService, CreateEntradaDto, UpdateEntradaDto } from './entradas.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('taller-r1/entradas')
export class EntradasController {
    constructor(private readonly entradasService: EntradasService) { }

    @Get()
    async findAll(@Query('estado') estado?: string) {
        return this.entradasService.findAll(estado);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.entradasService.findOne(id);
    }

    @Get(':id/detalles')
    async getDetalles(@Param('id') id: string) {
        return this.entradasService.getDetalles(id);
    }

    @Get(':id/accesorios')
    async getAccesorios(@Param('id') id: string) {
        return this.entradasService.getAccesorios(id);
    }

    @Post()
    async create(@Body() createEntradaDto: CreateEntradaDto) {
        return this.entradasService.create(createEntradaDto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() updateEntradaDto: UpdateEntradaDto) {
        return this.entradasService.update(id, updateEntradaDto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.entradasService.remove(id);
    }
}
