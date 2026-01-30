import { Module } from '@nestjs/common';
import { PrismaTallerR1Service } from '../../database/prisma-taller-r1.service';
import { TallerR1Controller } from './taller-r1.controller';
import { TallerR1Service } from './taller-r1.service';
import { EntradasController } from './entradas.controller';
import { EntradasService } from './entradas.service';
import { SalidasController } from './salidas.controller';
import { SalidasService } from './salidas.service';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { EquiposController } from './equipos.controller';
import { EquiposService } from './equipos.service';
import { UbicacionesController } from './ubicaciones.controller';
import { UbicacionesService } from './ubicaciones.service';
import { ModelosController } from './modelos.controller';
import { ModelosService } from './modelos.service';
import { AccesoriosController } from './accesorios.controller';
import { AccesoriosService } from './accesorios.service';
import { EquipoUbicacionController } from './equipo-ubicacion.controller';
import { EquipoUbicacionService } from './equipo-ubicacion.service';
import { AuthTallerController } from './auth-taller.controller';
import { AuthTallerService } from './auth-taller.service';

@Module({
    controllers: [
        TallerR1Controller,
        EntradasController,
        SalidasController,
        ClientesController,
        EquiposController,
        UbicacionesController,
        ModelosController,
        AccesoriosController,

        EquipoUbicacionController,
        AuthTallerController
    ],
    providers: [
        TallerR1Service,
        PrismaTallerR1Service,
        EntradasService,
        SalidasService,
        ClientesService,
        EquiposService,
        UbicacionesService,
        ModelosService,
        AccesoriosService,

        EquipoUbicacionService,
        AuthTallerService
    ],
    exports: [
        TallerR1Service,
        PrismaTallerR1Service,
        EntradasService,
        SalidasService,
        ClientesService,
        EquiposService,
        UbicacionesService,
        ModelosService,
        AccesoriosService,
        EquipoUbicacionService
    ],
})
export class TallerR1Module { }
