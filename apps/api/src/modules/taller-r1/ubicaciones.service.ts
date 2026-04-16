import { PrismaClient as PrismaR1 } from '@prisma/client-taller-r1';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaDynamicService } from '../../database/prisma-dynamic.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateUbicacionDto {
    nombre_ubicacion: string;
    maximo_stock: number;
    Clase?: string;
}

@Injectable()
export class UbicacionesService {
    constructor(private prisma: PrismaDynamicService) { }

    private get db(): PrismaR1 {
        return this.prisma.client;
    }

    async findAll() {
        const ubicaciones = await this.db.ubicacion.findMany();

        const counts = await this.db.sub_ubicaciones.groupBy({
            by: ['id_ubicacion'],
            where: { ubicacion_ocupada: true, id_ubicacion: { not: null } },
            _count: true
        });

        const countMap = new Map(counts.map(c => [c.id_ubicacion, c._count]));

        return ubicaciones.map(u => {
            return {
                ...u,
                occupiedSubs: countMap.get(u.id_ubicacion) || 0
            };
        });
    }

    async create(data: CreateUbicacionDto) {
        const existing = await this.db.ubicacion.findFirst({
            where: { nombre_ubicacion: data.nombre_ubicacion }
        });

        if (existing) {
            throw new BadRequestException(`La ubicación '${data.nombre_ubicacion}' ya existe.`);
        }

        const id_ubicacion = uuidv4();

        // 1. Create the master location
        const ubicacion = await this.db.ubicacion.create({
            data: {
                id_ubicacion,
                ...data,
            },
        });

        // 2. Generate sequential sub-locations
        const subLocationsToCreate = Array.from({ length: data.maximo_stock }, (_, i) => ({
            id_sub_ubicacion: uuidv4().replace(/-/g, '').substring(0, 20),
            nombre: String(i + 1),
            id_ubicacion,
            ubicacion_ocupada: false,
        }));

        if (subLocationsToCreate.length > 0) {
            await this.db.sub_ubicaciones.createMany({
                data: subLocationsToCreate,
            });
        }

        return ubicacion;
    }

    async update(id: string, data: Partial<CreateUbicacionDto>) {
        const { id_ubicacion, ...updateData } = data as any;

        if (updateData.nombre_ubicacion) {
            const existing = await this.db.ubicacion.findFirst({
                where: {
                    nombre_ubicacion: updateData.nombre_ubicacion,
                    NOT: { id_ubicacion: id } // Using Prisma NOT operator correctly
                }
            });
            if (existing && existing.id_ubicacion !== id) {
                throw new BadRequestException(`La ubicación '${updateData.nombre_ubicacion}' ya existe.`);
            }
        }

        // 1. Update the master location
        const ubicacion = await this.db.ubicacion.update({
            where: { id_ubicacion: id },
            data: updateData,
        });

        // 2. If maximo_stock was modified, ensure quantity lines up
        if (updateData.maximo_stock !== undefined) {
            const currentCount = await this.db.sub_ubicaciones.count({
                where: { id_ubicacion: id }
            });

            if (updateData.maximo_stock < currentCount) {
                throw new BadRequestException(`No se puede reducir el stock máximo a ${updateData.maximo_stock} porque existen ${currentCount} sub-ubicaciones. Elimina las sobrantes primero.`);
            }

            if (updateData.maximo_stock > currentCount) {
                const subsToAdd = updateData.maximo_stock - currentCount;
                const existingSubs = await this.db.sub_ubicaciones.findMany({
                    where: { id_ubicacion: id },
                    select: { nombre: true }
                });
                const existingNames = new Set(existingSubs.map(s => s.nombre));

                const subLocationsToCreate = [];
                let nextNumber = 1;

                for (let i = 0; i < subsToAdd; i++) {
                    // Find next available numeric name
                    while (existingNames.has(String(nextNumber))) {
                        nextNumber++;
                    }

                    const nombre = String(nextNumber);
                    subLocationsToCreate.push({
                        id_sub_ubicacion: uuidv4().replace(/-/g, '').substring(0, 20),
                        nombre,
                        id_ubicacion: id,
                        ubicacion_ocupada: false,
                    });

                    existingNames.add(nombre);
                    nextNumber++;
                }

                if (subLocationsToCreate.length > 0) {
                    await this.db.sub_ubicaciones.createMany({
                        data: subLocationsToCreate,
                    });
                }
            }
        }

        return ubicacion;
    }

    async remove(id: string) {
        const occupiedCount = await this.db.sub_ubicaciones.count({
            where: {
                id_ubicacion: id,
                ubicacion_ocupada: true
            }
        });

        if (occupiedCount > 0) {
            throw new BadRequestException('No se puede eliminar la ubicación porque tiene sub-ubicaciones en uso.');
        }

        return await this.db.$transaction(async (tx) => {
            const subs = await tx.sub_ubicaciones.findMany({
                where: { id_ubicacion: id },
                select: { id_sub_ubicacion: true }
            });
            const subIds = subs.map(s => s.id_sub_ubicacion);

            if (subIds.length > 0) {
                await tx.entrada_detalle.updateMany({
                    where: { id_sub_ubicacion: { in: subIds } },
                    data: { id_sub_ubicacion: null }
                });
                await tx.entrada_accesorios.updateMany({
                    where: { sub_ubicacion: { in: subIds } },
                    data: { sub_ubicacion: null }
                });
            }

            await tx.entrada_detalle.updateMany({
                where: { id_ubicacion: id },
                data: { id_ubicacion: null }
            });
            await tx.entrada_accesorios.updateMany({
                where: { ubicacion: id },
                data: { ubicacion: null }
            });

            await tx.sub_ubicaciones.deleteMany({
                where: { id_ubicacion: id }
            });

            return tx.ubicacion.delete({
                where: { id_ubicacion: id },
            });
        });
    }

    async getNextAvailableSubLocation(ubicacionId: string, currentEntradaId: string, rack?: string) {
        console.log(`[UbicacionesService] getNextAvailableSubLocation called for ubicacionId: ${ubicacionId}, entradaId: ${currentEntradaId}, rack: ${rack}`);

        const subUbicaciones = await this.db.sub_ubicaciones.findMany({
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
            this.db.entrada_detalle.findMany({
                where: {
                    id_entrada: currentEntradaId,
                    NOT: { id_sub_ubicacion: null }
                },
                select: { id_sub_ubicacion: true }
            }),
            this.db.entrada_accesorios.findMany({
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

        const subs = await this.db.sub_ubicaciones.findMany({
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

    async createSubLocation(ubicacionId: string, nombre: string) {
        // Enforce max stock constraint
        const ubicacion = await this.db.ubicacion.findUnique({
            where: { id_ubicacion: ubicacionId }
        });

        if (!ubicacion) {
            throw new NotFoundException('Ubicación principal no encontrada');
        }

        // We pull the actual count because _count typing can be flaky in older Prisma clients
        const currentCount = await this.db.sub_ubicaciones.count({
            where: { id_ubicacion: ubicacionId }
        });

        if (currentCount >= ubicacion.maximo_stock) {
            throw new BadRequestException(`No se pueden crear más sub-ubicaciones. Límite de stock máximo (${ubicacion.maximo_stock}) alcanzado.`);
        }

        // Verify sub_location name uniqueness within this location
        const existing = await this.db.sub_ubicaciones.findFirst({
            where: { id_ubicacion: ubicacionId, nombre: nombre }
        });

        if (existing) {
            throw new BadRequestException(`Ya existe una sub-ubicación con el nombre ${nombre} en este cuadrante.`);
        }

        // Return newly created sub-location
        return this.db.sub_ubicaciones.create({
            data: {
                id_sub_ubicacion: uuidv4(),
                nombre: nombre,
                id_ubicacion: ubicacionId,
                ubicacion_ocupada: false
            }
        });
    }

    async deleteSubLocation(ubicacionId: string, subId: string) {
        // Verify it exists in this location
        const sub = await this.db.sub_ubicaciones.findFirst({
            where: { id_sub_ubicacion: subId, id_ubicacion: ubicacionId }
        });

        if (!sub) {
            throw new NotFoundException('Sub-ubicación no encontrada');
        }

        if (sub.ubicacion_ocupada) {
            throw new BadRequestException('No se puede eliminar una sub-ubicación ocupada');
        }

        return await this.db.$transaction(async (tx) => {
            // Nullify references in entrada_detalle
            await tx.entrada_detalle.updateMany({
                where: { id_sub_ubicacion: subId },
                data: { id_sub_ubicacion: null }
            });

            // Nullify references in entrada_accesorios
            await tx.entrada_accesorios.updateMany({
                where: { sub_ubicacion: subId },
                data: { sub_ubicacion: null }
            });

            return tx.sub_ubicaciones.delete({
                where: { id_sub_ubicacion: subId }
            });
        });
    }
}
