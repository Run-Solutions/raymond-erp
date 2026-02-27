import { Injectable, Logger } from '@nestjs/common';
import { PrismaTallerR1Service } from '../../database/prisma-taller-r1.service';

@Injectable()
export class CargueMasivoService {
    private readonly logger = new Logger(CargueMasivoService.name);

    constructor(private prisma: PrismaTallerR1Service) { }

    async getAll() {
        // @ts-ignore
        return this.prisma.orden_base_cargue.findMany({
            orderBy: { created_at: 'desc' },
        });
    }

    async createBatch(data: any[]): Promise<void> {
        try {
            // Remove id to allow auto-increment and filter out unknown fields (basic filter)
            // Prisma createMany throws if unknown fields are present.
            // We generally can't know all valid fields at runtime easily without reflecting on the model type,
            // but we can try to facilitate common ones or accept that the frontend normalized them.

            const cleanData = data.map((row) => {
                const { id, ...rest } = row;
                // Convert possible empty strings to null for optional fields if needed, 
                // or just pass as is. Prisma handles type coercion to some extent.
                return rest;
            });

            this.logger.log(`Inserting ${cleanData.length} rows into orden_base_cargue`);

            // @ts-ignore
            await this.prisma.orden_base_cargue.createMany({
                data: cleanData,
                skipDuplicates: true,
            });
        } catch (error) {
            this.logger.error('Error in createBatch', error);
            throw error;
        }
    }

    async update(id: number, data: any) {
        const { id: _, ...updateData } = data;
        // @ts-ignore
        return this.prisma.orden_base_cargue.update({
            where: { id: Number(id) },
            data: updateData,
        });
    }

    async create(data: any) {
        // @ts-ignore
        return this.prisma.orden_base_cargue.create({
            data: data,
        });
    }

    async delete(id: number) {
        // @ts-ignore
        return this.prisma.orden_base_cargue.delete({
            where: { id: Number(id) },
        });
    }

    async deleteAll() {
        // @ts-ignore
        return this.prisma.orden_base_cargue.deleteMany({});
    }
}
