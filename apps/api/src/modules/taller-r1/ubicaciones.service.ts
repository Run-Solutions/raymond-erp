import { Injectable } from '@nestjs/common';
import { PrismaTallerR1Service } from '../../database/prisma-taller-r1.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateUbicacionDto {
    nombre_ubicacion: string;
    maximo_stock: number;
    Clase?: string;
}

@Injectable()
export class UbicacionesService {
    constructor(private prisma: PrismaTallerR1Service) { }

    async findAll() {
        return this.prisma.ubicacion.findMany();
    }

    async create(data: CreateUbicacionDto) {
        return this.prisma.ubicacion.create({
            data: {
                id_ubicacion: uuidv4(),
                ...data,
            },
        });
    }

    async update(id: string, data: Partial<CreateUbicacionDto>) {
        return this.prisma.ubicacion.update({
            where: { id_ubicacion: id },
            data,
        });
    }

    async remove(id: string) {
        return this.prisma.ubicacion.delete({
            where: { id_ubicacion: id },
        });
    }

    async getNextAvailableSubLocation(ubicacionId: string, currentEntradaId: string, rack?: string) {
        console.log(`[UbicacionesService] getNextAvailableSubLocation called for ubicacionId: ${ubicacionId}, entradaId: ${currentEntradaId}, rack: ${rack}`);

        const subUbicaciones = await this.prisma.sub_ubicaciones.findMany({
            where: { id_ubicacion: ubicacionId },
            orderBy: {
                nombre: 'asc',
            },
        });

        // 2. Filter by rack if provided (using the AppSheet-like logic)
        let filteredSubs = subUbicaciones;
        if (rack) {
            const regex = new RegExp(`^RK${rack}([^0-9]|$)`);
            filteredSubs = subUbicaciones.filter(sub => regex.test(sub.nombre || ''));
        }

        // 3. Natural sort
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
        filteredSubs.sort((a, b) => collator.compare(a.nombre || '', b.nombre || ''));

        console.log(`[UbicacionesService] Found ${filteredSubs.length} sub-locations in zone after rack filter`);

        // 4. Get all occupied sub-locations in the current entry (to avoid double assignment before commit)
        const [occupiedEquipment, occupiedAccessories] = await Promise.all([
            this.prisma.entrada_detalle.findMany({
                where: {
                    id_entrada: currentEntradaId,
                    NOT: { id_sub_ubicacion: null }
                },
                select: { id_sub_ubicacion: true }
            }),
            this.prisma.entrada_accesorios.findMany({
                where: {
                    id_entrada: currentEntradaId,
                    NOT: { sub_ubicacion: null }
                },
                select: { sub_ubicacion: true }
            })
        ]);

        const occupiedIds = new Set([
            ...occupiedEquipment.map(d => d.id_sub_ubicacion),
            ...occupiedAccessories.map(a => a.sub_ubicacion)
        ]);

        console.log(`[UbicacionesService] Already occupied in this entry: ${occupiedIds.size} sub-locations`);

        const isAccesoriosZone = ubicacionId === 'ba0cae1e';

        // 5. Find first available (or any if Accesorios)
        const available = filteredSubs.find(sub => {
            if (isAccesoriosZone) return true; // Show all in Accesorios

            // Check if physically occupied
            if (sub.ubicacion_ocupada) return false;

            // Check if assigned in current entry
            if (sub.id_sub_ubicacion && occupiedIds.has(sub.id_sub_ubicacion)) return false;

            return true;
        });

        console.log(`[UbicacionesService] Suggested sub-location: ${available?.nombre || 'None'}`);
        return available || null;
    }

    async getSubLocations(ubicacionId: string, rack?: string) {
        console.log(`[UbicacionesService] getSubLocations called for ubicacionId: ${ubicacionId}, rack: ${rack}`);

        const subs = await this.prisma.sub_ubicaciones.findMany({
            where: { id_ubicacion: ubicacionId },
            orderBy: { nombre: 'asc' }
        });

        // Filter by rack if provided
        let filteredSubs = subs;
        if (rack) {
            const regex = new RegExp(`^RK${rack}([^0-9]|$)`);
            filteredSubs = subs.filter(sub => regex.test(sub.nombre || ''));
        }

        // Natural sort
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
        filteredSubs.sort((a, b) => collator.compare(a.nombre || '', b.nombre || ''));

        console.log(`[UbicacionesService] Found ${filteredSubs.length} sub-locations after filter`);
        return filteredSubs;
    }
}
