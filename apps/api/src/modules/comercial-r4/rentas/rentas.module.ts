import { Module } from '@nestjs/common';
import { RentasController } from './rentas.controller';
import { RentasService } from './rentas.service';
import { PrismaDynamicService } from '../../../database/prisma-dynamic.service';
import { MinioModule } from '../minio/minio.module';
import { PresupuestosModule } from '../presupuestos/presupuestos.module';

@Module({
  imports: [MinioModule, PresupuestosModule],
  controllers: [RentasController],
  providers: [RentasService, PrismaDynamicService],
})
export class RentasModule {}
