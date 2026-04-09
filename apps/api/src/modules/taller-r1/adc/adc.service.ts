import { Injectable } from '@nestjs/common';
import { PrismaDynamicService } from '../../../database/prisma-dynamic.service';

@Injectable()
export class AdcService {
    constructor(private prisma: PrismaDynamicService) {}

    private get db() {
        return this.prisma.client;
    }

    async findAll() {
        try {
            console.log(`[AdcService] Fetching all ADCs for site: ${this.prisma.currentSite}`);
            // @ts-ignore
            if (!this.db.adc) {
                console.error('[AdcService] Error: "adc" model is NOT defined in this Prisma client.');
                return [];
            }
            // @ts-ignore
            return await this.db.adc.findMany({
                orderBy: { nombre: 'asc' }
            });
        } catch (error: any) {
            console.error('[AdcService] Error in findAll:', error);
            throw error;
        }
    }

    async create(data: { nombre: string }) {
        try {
            console.log(`[AdcService] Creating ADC with name: ${data.nombre}`);
            // @ts-ignore
            return await this.db.adc.create({
                data
            });
        } catch (error: any) {
            console.error('[AdcService] Error in create:', error);
            throw error;
        }
    }

    async remove(id: number) {
        try {
            console.log(`[AdcService] Removing ADC with ID: ${id}`);
            // @ts-ignore
            return await this.db.adc.delete({
                where: { id }
            });
        } catch (error: any) {
            console.error('[AdcService] Error in remove:', error);
            throw error;
        }
    }

}
