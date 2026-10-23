import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
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
        await Promise.all([
            PrismaDynamicService.ensureClient('r4', () => new PrismaComercial(), 'R4 (Comercial)'),
        ]);
    }

    async getClient() {
        await PrismaDynamicService.ensureClientsInitialized();
        if (!PrismaDynamicService.clients.r4) {
            throw new Error('Database client for R4 (Comercial) is not initialized');
        }
        return PrismaDynamicService.clients.r4;
    }

    async getR1() {
        await PrismaDynamicService.ensureClientsInitialized();
        if (!PrismaDynamicService.clients.r4) {
            throw new Error('Database client for R4 (Comercial) is not initialized');
        }
        return PrismaDynamicService.clients.r4;
    }

    get client() {
        if (!PrismaDynamicService.clients.r4) {
            console.error('[PrismaDynamicService] CRITICAL: client.r4 (Comercial) is MISSING');
            throw new Error('Database client for R4 (Comercial) is not initialized');
        }
        return PrismaDynamicService.clients.r4;
    }

    get r1() {
        return PrismaDynamicService.clients.r4;
    }

    get currentSite(): string {
        return 'r4';
    }

    get currentUser(): string {
        return (this.request.headers['x-taller-username'] as string) || 'Sistema';
    }
}
