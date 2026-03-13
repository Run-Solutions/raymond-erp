import { Module, OnModuleInit } from '@nestjs/common';
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
import { CargueMasivoController } from './cargue-masivo.controller';
import { CargueMasivoService } from './cargue-masivo.service';
import { EvaluacionesController } from './evaluaciones.controller';
import { EvaluacionesService } from './evaluaciones.service';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';
import { RenovadosController } from './renovados.controller';
import { RenovadosService } from './renovados.service';
import { TallerR1MailService } from './mail.service';
import { PrismaDynamicService } from '../../database/prisma-dynamic.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [AuthModule],
    controllers: [
        TallerR1Controller,
        EntradasController,
        SalidasController,
        ClientesController,
        EquiposController,
        UbicacionesController,
        ModelosController,
        AccesoriosController,
        CargueMasivoController,
        EvaluacionesController,
        UsuariosController,

        InventarioController,
        EquipoUbicacionController,
        AuthTallerController,
        RenovadosController
    ],
    providers: [
        TallerR1Service,
        PrismaDynamicService,
        EntradasService,
        SalidasService,
        ClientesService,
        EquiposService,
        UbicacionesService,
        ModelosService,
        AccesoriosService,
        CargueMasivoService,
        EvaluacionesService,
        UsuariosService,

        InventarioService,
        EquipoUbicacionService,
        AuthTallerService,
        RenovadosService
    ],
    exports: [
        TallerR1Service,
        PrismaDynamicService,
        EntradasService,
        SalidasService,
        ClientesService,
        EquiposService,
        UbicacionesService,
        ModelosService,
        AccesoriosService,
        EquipoUbicacionService,
        CargueMasivoService,
        EvaluacionesService,
        UsuariosService,
        InventarioService
    ],
})
export class TallerR1Module implements OnModuleInit {
    async onModuleInit() {
        console.log('[TallerR1Module] Initializing database connections...');
        await PrismaDynamicService.ensureClientsInitialized();
    }
}
