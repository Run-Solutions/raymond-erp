import { Injectable, OnModuleInit, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { PrismaClient as PrismaR1 } from '@prisma/client-taller-r1';
import { PrismaClient as PrismaFrontera } from '@prisma/client-frontera';
import { PrismaClient as PrismaNaves } from '@prisma/client-naves';
import { PrismaClient as PrismaComercial } from '@prisma/client-comercial';

@Injectable({ scope: Scope.REQUEST })
export class PrismaDynamicService {
    public static clients: Record<string, any> = {};

    private static connectPromises: Record<string, Promise<void>> = {};

    constructor(@Inject(REQUEST) private request: Request) { }

    private static ensureClient(key: string, factory: () => any, label: string): Promise<void> {
        if (PrismaDynamicService.clients[key]) return Promise.resolve();
        if (PrismaDynamicService.connectPromises[key]) return PrismaDynamicService.connectPromises[key];

        PrismaDynamicService.connectPromises[key] = (async () => {
            try {
                const client = factory();
                await client.$connect();
                PrismaDynamicService.clients[key] = client;
                console.log(`✅ Conexión establecida: ${label}`);
            } catch (error: any) {
                console.error(`❌ [PrismaDynamicService] Error connecting ${label}:`, error?.message || error);
                PrismaDynamicService.clients[key] = factory();
            } finally {
                delete PrismaDynamicService.connectPromises[key];
            }
        })();

        return PrismaDynamicService.connectPromises[key];
    }

    static async ensureClientsInitialized() {
        // Las 4 bases se conectan en paralelo y el resultado se comparte entre requests
        // concurrentes: si 10 peticiones llegan a la vez en el arranque, solo se abre UNA
        // conexion por base (antes cada una creaba su propio PrismaClient y saturaba la
        // BD, dejando requests de 40-60s en el cold start).
        await Promise.all([
            PrismaDynamicService.ensureClient('r1', () => new PrismaR1(), 'Taller R1'),
            PrismaDynamicService.ensureClient('r2', () => new PrismaNaves(), 'Naves (R2)'),
            PrismaDynamicService.ensureClient('r3', () => new PrismaFrontera(), 'R3'),
            PrismaDynamicService.ensureClient('r4', () => new PrismaComercial(), 'R4 (Comercial)'),
        ]);
    }

    async getClient() {
        await PrismaDynamicService.ensureClientsInitialized();
        const siteId = this.request.headers['x-site-id'] as string || 'r1';

        switch (siteId.toLowerCase()) {
            case 'r4':
                return PrismaDynamicService.clients.r4;
            case 'r2':
                return PrismaDynamicService.clients.r2;
            case 'r3':
                return PrismaDynamicService.clients.r3;
            case 'r1':
            default:
                return PrismaDynamicService.clients.r1;
        }
    }

    // Helper for TallerR1 specific auth (always R1)
    async getR1() {
        await PrismaDynamicService.ensureClientsInitialized();
        return PrismaDynamicService.clients.r1;
    }

    get client() {
        const siteId = (this.request.headers['x-site-id'] as string || 'r1').toLowerCase();

        console.log(`[PrismaDynamicService] Request to site: "${siteId}" for URL: ${this.request.url}`);

        if (!PrismaDynamicService.clients.r1 || !PrismaDynamicService.clients.r2 || !PrismaDynamicService.clients.r3 || !PrismaDynamicService.clients.r4) {
            console.log('[PrismaDynamicService] Clients NOT initialized, triggering initialization...');
        }

        switch (siteId) {
            case 'r4':
                if (!PrismaDynamicService.clients.r4) {
                    console.error('[PrismaDynamicService] CRITICAL: client.r4 (Comercial) is MISSING');
                    throw new Error('Database client for R4 (Comercial) is not initialized');
                }
                return PrismaDynamicService.clients.r4;
            case 'r2':
                if (!PrismaDynamicService.clients.r2) {
                    console.error('[PrismaDynamicService] CRITICAL: client.r2 (Naves) is MISSING');
                    throw new Error('Database client for R2 (Naves) is not initialized');
                }
                return PrismaDynamicService.clients.r2;
            case 'r3':
                if (!PrismaDynamicService.clients.r3) {
                    console.error('[PrismaDynamicService] CRITICAL: client.r3 (Frontera) is MISSING');
                    throw new Error('Database client for R3 (Frontera) is not initialized');
                }
                return PrismaDynamicService.clients.r3;
            case 'r1':
            default:
                if (!PrismaDynamicService.clients.r1) {
                    console.error('[PrismaDynamicService] CRITICAL: client.r1 (Taller R1) is MISSING');
                    throw new Error('Database client for R1 is not initialized');
                }
                return PrismaDynamicService.clients.r1;
        }
    }

    get r1() {
        return PrismaDynamicService.clients.r1;
    }

    get currentSite(): string {
        const site = (this.request.headers['x-site-id'] as string || 'r1').toLowerCase();
        return site;
    }

    get currentUser(): string {
        return (this.request.headers['x-taller-username'] as string) || 'Sistema';
    }
}
