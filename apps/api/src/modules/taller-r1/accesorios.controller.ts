import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { AccesoriosService, CreateAccesorioDto } from './accesorios.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('taller-r1/accesorios')
export class AccesoriosController {
    constructor(private readonly accesoriosService: AccesoriosService) { }

    @Get()
    async findAll() {
        return this.accesoriosService.findAll();
    }

    @Post()
    async create(@Body() data: CreateAccesorioDto) {
        return this.accesoriosService.create(data);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() data: Partial<CreateAccesorioDto>) {
        return this.accesoriosService.update(id, data);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.accesoriosService.remove(id);
    }
}
