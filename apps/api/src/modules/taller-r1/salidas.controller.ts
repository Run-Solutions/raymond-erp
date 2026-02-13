import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { SalidasService, CreateSalidaDto, UpdateSalidaDto, CreateDetalleDto, CreateAccesorioDto } from './salidas.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('taller-r1/salidas')
export class SalidasController {
    constructor(private readonly salidasService: SalidasService) { }

    @Get()
    async findAll(@Query('estado') estado?: string) {
        return this.salidasService.findAll(estado);
    }

    @Get('available-equipos')
    async getAvailableEquipos() {
        return this.salidasService.getAvailableEquipos();
    }

    @Get('available-accesorios')
    async getAvailableAccesorios() {
        return this.salidasService.getAvailableAccesorios();
    }

    @Get('scan/:serial')
    async scanSerial(@Param('serial') serial: string) {
        return this.salidasService.scanSerial(serial);
    }

    @Get('next-folio/generate')
    async getNextFolio() {
        const folio = await this.salidasService.generateFolio();
        return { folio };
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

    @Post(':id/detalles')
    async createDetalle(@Param('id') id: string, @Body() data: CreateDetalleDto) {
        return this.salidasService.createDetalle(id, data);
    }

    @Post(':id/accesorios')
    async createAccesorio(@Param('id') id: string, @Body() data: CreateAccesorioDto) {
        return this.salidasService.createAccesorio(id, data);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateSalidaDto: UpdateSalidaDto) {
        return this.salidasService.update(id, updateSalidaDto);
    }

    @Patch(':id/remision')
    async updateRemision(@Param('id') id: string, @Body('remision') remision: string) {
        return this.salidasService.updateRemision(id, remision);
    }

    @Patch(':id/cerrar')
    async cerrarFolio(@Param('id') id: string) {
        return this.salidasService.cerrarFolio(id);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.salidasService.remove(id);
    }
}
