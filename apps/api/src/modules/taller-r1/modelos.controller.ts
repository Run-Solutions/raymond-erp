import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ModelosService, CreateModeloDto } from './modelos.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('taller-r1/modelos')
export class ModelosController {
    constructor(private readonly modelosService: ModelosService) { }

    @Get()
    async findAll() {
        return this.modelosService.findAll();
    }

    @Post()
    async create(@Body() data: CreateModeloDto) {
        return this.modelosService.create(data);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() data: Partial<CreateModeloDto>) {
        return this.modelosService.update(id, data);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.modelosService.remove(id);
    }
}
