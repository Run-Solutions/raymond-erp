import { Injectable, OnModuleInit, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { PrismaClient as PrismaR1 } from '@prisma/client-taller-r1';
import { PrismaClient as PrismaFrontera } from '@prisma/client-frontera';
import { PrismaClient as PrismaNaves } from '@prisma/client-naves';

@Injectable({ scope: Scope.REQUEST })
export class PrismaDynamicService {
    private static clients: Record<string, any> = {};

    constructor(@Inject(REQUEST) private request: Request) { }

    static async ensureClientsInitialized() {
        if (PrismaDynamicService.clients.r1 && PrismaDynamicService.clients.r2 && PrismaDynamicService.clients.r3) {
            return;
        }

        try {
            if (!PrismaDynamicService.clients.r1) {
                const client = new PrismaR1();
                await client.$connect();
                PrismaDynamicService.clients.r1 = client;
                console.log('✅ Conexión establecida: Taller R1');
            }
            if (!PrismaDynamicService.clients.r2) {
                const client = new PrismaNaves();
                await client.$connect();
                PrismaDynamicService.clients.r2 = client;
                console.log('✅ Conexión establecida: Naves (R2)');
            }
            if (!PrismaDynamicService.clients.r3) {
                const client = new PrismaFrontera();
                await client.$connect();
                PrismaDynamicService.clients.r3 = client;
                console.log('✅ Conexión establecida: R3');
            }
        } catch (error: any) {
            console.error('❌ [PrismaDynamicService] Error initializing clients:', error?.message || error);
            if (error.stack) {
                console.error(error.stack);
            }
        }
    }

    async getClient() {
        await PrismaDynamicService.ensureClientsInitialized();
        const siteId = this.request.headers['x-site-id'] as string || 'r1';

        switch (siteId.toLowerCase()) {
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

        // Log all requests to see which site is being used
        console.log(`[PrismaDynamicService] Request to site: "${siteId}" for URL: ${this.request.url}`);

        // Ensure clients are initialized before returning
        if (!PrismaDynamicService.clients.r1 || !PrismaDynamicService.clients.r2 || !PrismaDynamicService.clients.r3) {
            console.log('[PrismaDynamicService] Clients NOT initialized, triggering initialization...');
            // Note: This is synchronous in the getter, but ensureClientsInitialized is async.
            // Since onModuleInit calls it, they SHOULD be ready.
            // If not, we might have a race condition.
        }

        switch (siteId) {
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
