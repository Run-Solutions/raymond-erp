import { Injectable } from '@nestjs/common';
import { PrismaTallerR1Service } from '../../database/prisma-taller-r1.service';
import * as fs from 'fs';
import * as path from 'path';

export interface CreateEntradaDto {
    folio: string;
    distribuidor?: string;
    factura?: string;
    cliente_origen?: string;
    adc?: string;
    cliente?: string;
    fecha_creacion: Date;
    elemento?: string;
    comentario?: string;
    evidencia_1?: string;
    usuario_asignado?: string;
    estado: string;
    prioridad?: string;
}

export interface UpdateEntradaDto {
    usuario_asignado?: string;
    comentario?: string;
    evidencia_1?: string;
    evidencia_2?: string;
    estado?: string;
    fecha_cierre?: Date;
    prioridad?: string;
    fecha_asignacion?: Date;
    usuario_encargado?: string;
    cliente?: string;
}

@Injectable()
export class EntradasService {
    constructor(private prisma: PrismaTallerR1Service) { }

    private async saveFilesToDisk(id_entrada: string, recordId: string, files: { [key: string]: any }) {
        const result: { [key: string]: string } = {};

        try {
            const entrada = await this.prisma.entradas.findUnique({
                where: { id_entrada },
                select: { folio: true }
            });

            if (!entrada || !entrada.folio) return result;

            const baseDir = path.join(process.cwd(), 'uploads', 'entradas', entrada.folio, recordId);
            if (!fs.existsSync(baseDir)) {
                fs.mkdirSync(baseDir, { recursive: true });
            }

            for (const [key, base64] of Object.entries(files)) {
                if (typeof base64 === 'string' && base64.startsWith('data:image')) {
                    const matches = base64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
                    if (matches && matches.length === 3) {
                        const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                        const fileName = `${key}_${Date.now()}.${extension}`;
                        const filePath = path.join(baseDir, fileName);
                        const buffer = Buffer.from(matches[2], 'base64');

                        fs.writeFileSync(filePath, buffer);
                        result[key] = `/uploads/entradas/${entrada.folio}/${recordId}/${fileName}`;
                    }
                }
            }
        } catch (error) {
            console.error('[EntradasService] Error saving files to disk:', error);
        }

        return result;
    }

    // Obtener todas las entradas
    async findAll(estado?: string) {
        const where = estado ? { estado } : {};
        return this.prisma.entradas.findMany({
            where,
            include: {
                rel_cliente: {
                    select: {
                        nombre_cliente: true,
                    },
                },
                _count: {
                    select: {
                        entrada_detalle: true,
                        entrada_accesorios: true,
                    },
                },
            },
            orderBy: { fecha_creacion: 'desc' },
        });
    }

    // Obtener una entrada por ID
    async findOne(id: string) {
        return this.prisma.entradas.findUnique({
            where: { id_entrada: id },
            include: {
                rel_cliente: {
                    select: {
                        nombre_cliente: true,
                    },
                },
            },
        });
    }

    // Crear una nueva entrada
    async create(data: CreateEntradaDto) {
        const id_entrada = `ENT-${Date.now()}`;

        return this.prisma.entradas.create({
            data: {
                id_entrada,
                ...data,
            },
        });
    }

    // Actualizar una entrada
    async update(id: string, data: UpdateEntradaDto) {
        return this.prisma.entradas.update({
            where: { id_entrada: id },
            data,
        });
    }

    // Eliminar una entrada
    async remove(id: string) {
        return this.prisma.entradas.delete({
            where: { id_entrada: id },
        });
    }

    // Obtener detalles de una entrada
    async getDetalles(id_entrada: string) {
        return this.prisma.entrada_detalle.findMany({
            where: { id_entrada },
            include: {
                rel_ubicacion: { select: { nombre_ubicacion: true } },
                rel_sub_ubicacion: { select: { nombre: true } },
                rel_equipo: true,
                rel_serie_info: true,
            }
        });
    }

    // Obtener accesorios de una entrada
    async getAccesorios(id_entrada: string) {
        return this.prisma.entrada_accesorios.findMany({
            where: { id_entrada },
            include: {
                rel_ubicacion: { select: { nombre_ubicacion: true } },
                rel_sub_ubicacion: { select: { nombre: true } },
            }
        });
    }

    // Crear detalle de entrada (Equipo)
    async createDetalle(id_entrada: string, data: any) {
        const id_detalles = `DET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Process images
        const imageFiles: any = {};
        if (data.evidencia_1) imageFiles.evidencia_1 = data.evidencia_1;
        if (data.evidencia_2) imageFiles.evidencia_2 = data.evidencia_2;
        if (data.evidencia_3) imageFiles.evidencia_3 = data.evidencia_3;
        if (data.tarjeta_informacion) imageFiles.evidencia_4 = data.tarjeta_informacion;

        const savedPaths = await this.saveFilesToDisk(id_entrada, id_detalles, imageFiles);

        return this.prisma.entrada_detalle.create({
            data: {
                id_detalles,
                id_entrada,
                ...data,
                ...savedPaths,
                // Clean up any remaining base64 if needed, although ...savedPaths will overwrite them
            },
        });
    }

    // Crear accesorio de entrada
    async createAccesorio(id_entrada: string, data: any) {
        const id_accesorio = `ACC-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;

        const savedPaths = await this.saveFilesToDisk(id_entrada, id_accesorio, { evidencia: data.evidencia });

        return this.prisma.entrada_accesorios.create({
            data: {
                id_accesorio,
                id_entrada,
                ...data,
                ...savedPaths,
            },
        });
    }

    // Obtener el último folio generado (Formato E-n)
    async getLastFolio() {
        const lastEntrada = await this.prisma.entradas.findFirst({
            where: {
                folio: {
                    startsWith: 'E-',
                },
            },
            orderBy: {
                fecha_creacion: 'desc',
            },
        });

        if (!lastEntrada) return 'E-1';

        const lastFolio = lastEntrada.folio;
        const lastNumber = parseInt(lastFolio.replace('E-', ''), 10);

        if (isNaN(lastNumber)) {
            // If the last one wasn't a number, find any with number
            const allFolios = await this.prisma.entradas.findMany({
                where: { folio: { startsWith: 'E-' } },
                select: { folio: true }
            });
            const numbers = allFolios
                .map(e => parseInt(e.folio.replace('E-', ''), 10))
                .filter(n => !isNaN(n));
            const max = numbers.length > 0 ? Math.max(...numbers) : 0;
            return `E-${max + 1}`;
        }

        return `E-${lastNumber + 1}`;
    }
}
