import { Controller, Get, Param, Put, Body, Post, Delete } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('taller-r1/usuarios')
export class UsuariosController {
    constructor(private readonly usuariosService: UsuariosService) { }

    @Get()
    async findAll() {
        return this.usuariosService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.usuariosService.findOne(id);
    }

    @Post()
    async create(@Body() data: any) {
        return this.usuariosService.create(data);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() data: any) {
        return this.usuariosService.update(id, data);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        // Soft delete or hard delete? The schema just has UsuarioBloqueado.
        // Let's just block the user using update
        return this.usuariosService.update(id, { UsuarioBloqueado: true });
    }
}
