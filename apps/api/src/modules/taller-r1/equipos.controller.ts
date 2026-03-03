import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { EquiposService, CreateEquipoDto } from './equipos.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('taller-r1/equipos')
export class EquiposController {
    constructor(private readonly equiposService: EquiposService) { }

    @Get()
    async findAll() {
        return this.equiposService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.equiposService.findOne(id);
    }

    @Post()
    async create(@Body() createEquipoDto: CreateEquipoDto) {
        return this.equiposService.create(createEquipoDto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() updateEquipoDto: Partial<CreateEquipoDto>) {
        return this.equiposService.update(id, updateEquipoDto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.equiposService.remove(id);
    }
}
