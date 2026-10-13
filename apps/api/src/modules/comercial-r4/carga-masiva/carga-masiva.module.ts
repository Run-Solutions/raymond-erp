import { Module } from '@nestjs/common';
import { CargaMasivaController } from './carga-masiva.controller';
import { CargaMasivaService } from './carga-masiva.service';
import { PrismaDynamicService } from '../../../database/prisma-dynamic.service';
import { PresupuestosModule } from '../presupuestos/presupuestos.module';

@Module({
  imports: [PresupuestosModule],
  controllers: [CargaMasivaController],
  providers: [CargaMasivaService, PrismaDynamicService],
  exports: [CargaMasivaService],
})
export class CargaMasivaModule {}
