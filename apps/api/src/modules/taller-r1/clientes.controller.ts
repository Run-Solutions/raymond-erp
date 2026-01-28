import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ClientesService, CreateClienteDto } from './clientes.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('taller-r1/clientes')
export class ClientesController {
    constructor(private readonly clientesService: ClientesService) { }

    @Get()
    async findAll() {
        return this.clientesService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.clientesService.findOne(id);
    }

    @Post()
    async create(@Body() createClienteDto: CreateClienteDto) {
        return this.clientesService.create(createClienteDto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() updateClienteDto: Partial<CreateClienteDto>) {
        return this.clientesService.update(id, updateClienteDto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.clientesService.remove(id);
    }
}
