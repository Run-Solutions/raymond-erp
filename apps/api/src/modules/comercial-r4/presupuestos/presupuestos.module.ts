import { Module } from '@nestjs/common';
import { PresupuestosController } from './presupuestos.controller';
import { PresupuestosService } from './presupuestos.service';
import { PresupuestoHistorialService } from './historial.service';
import { PrismaDynamicService } from '../../../database/prisma-dynamic.service';

@Module({
    controllers: [PresupuestosController],
    providers: [PresupuestosService, PresupuestoHistorialService, PrismaDynamicService],
    exports: [PresupuestosService, PresupuestoHistorialService],
})
export class PresupuestosModule {}
