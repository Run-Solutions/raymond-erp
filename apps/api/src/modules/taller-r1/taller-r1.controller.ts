import { Controller, Get, Param, Query } from '@nestjs/common';
import { TallerR1Service } from './taller-r1.service';

@Controller('taller-r1')
export class TallerR1Controller {
    constructor(private readonly tallerR1Service: TallerR1Service) { }

    @Get('equipos')
    async getAllEquipos() {
        return this.tallerR1Service.getAllEquipos();
    }

    @Get('equipos/clase/:clase')
    async getEquiposByClase(@Param('clase') clase: string) {
        return this.tallerR1Service.getEquiposByClase(clase);
    }

    @Get('ubicaciones')
    async getAllUbicaciones() {
        return this.tallerR1Service.getAllUbicaciones();
    }

    @Get('entradas')
    async getAllEntradas() {
        return this.tallerR1Service.getAllEntradas();
    }

    @Get('salidas')
    async getAllSalidas() {
        return this.tallerR1Service.getAllSalidas();
    }

    @Get('search')
    async search(@Query('q') q: string) {
        return this.tallerR1Service.search(q);
    }
}
