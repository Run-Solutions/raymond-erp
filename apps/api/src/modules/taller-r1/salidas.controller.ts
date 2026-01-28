import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { SalidasService, CreateSalidaDto, UpdateSalidaDto } from './salidas.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('taller-r1/salidas')
export class SalidasController {
    constructor(private readonly salidasService: SalidasService) { }

    @Get()
    async findAll(@Query('estado') estado?: string) {
        return this.salidasService.findAll(estado);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.salidasService.findOne(id);
    }

    @Get(':id/detalles')
    async getDetalles(@Param('id') id: string) {
        return this.salidasService.getDetalles(id);
    }

    @Post()
    async create(@Body() createSalidaDto: CreateSalidaDto) {
        return this.salidasService.create(createSalidaDto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() updateSalidaDto: UpdateSalidaDto) {
        return this.salidasService.update(id, updateSalidaDto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.salidasService.remove(id);
    }
}
