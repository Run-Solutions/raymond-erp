import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { UbicacionesService, CreateUbicacionDto } from './ubicaciones.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('taller-r1/ubicaciones')
export class UbicacionesController {
    constructor(private readonly ubicacionesService: UbicacionesService) { }

    @Get()
    async findAll() {
        return this.ubicacionesService.findAll();
    }

    @Post()
    async create(@Body() data: CreateUbicacionDto) {
        return this.ubicacionesService.create(data);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() data: Partial<CreateUbicacionDto>) {
        return this.ubicacionesService.update(id, data);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.ubicacionesService.remove(id);
    }
}
