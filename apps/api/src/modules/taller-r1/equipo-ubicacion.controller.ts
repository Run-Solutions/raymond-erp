import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { EquipoUbicacionService, CreateEquipoUbicacionDto } from './equipo-ubicacion.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('taller-r1/equipo-ubicacion')
export class EquipoUbicacionController {
    constructor(private readonly service: EquipoUbicacionService) { }

    @Get()
    async findAll() {
        return this.service.findAll();
    }

    @Post()
    async create(@Body() data: CreateEquipoUbicacionDto) {
        return this.service.create(data);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() data: Partial<CreateEquipoUbicacionDto>) {
        return this.service.update(id, data);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
