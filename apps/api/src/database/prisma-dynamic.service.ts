import { Injectable, OnModuleInit, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { PrismaClient as PrismaR1 } from '.prisma/client-taller-r1';
import { PrismaClient as PrismaFrontera } from '.prisma/client-frontera';
import { PrismaClient as PrismaNaves } from '.prisma/client-naves';

@Injectable({ scope: Scope.REQUEST })
export class PrismaDynamicService implements OnModuleInit {
    private static clients: Record<string, any> = {};

    constructor(@Inject(REQUEST) private request: Request) { }

    async onModuleInit() {
        // onModuleInit doesn't run for Scope.REQUEST providers in NestJS
        // Initializing via ensureClientsInitialized() instead
        await this.ensureClientsInitialized();
    }

    private async ensureClientsInitialized() {
        if (PrismaDynamicService.clients.r1 && PrismaDynamicService.clients.r2 && PrismaDynamicService.clients.r3) {
            return;
        }

        try {
            if (!PrismaDynamicService.clients.r1) {
                const client = new PrismaR1();
                await client.$connect();
                PrismaDynamicService.clients.r1 = client;
            }
            if (!PrismaDynamicService.clients.r2) {
                const client = new PrismaFrontera();
                await client.$connect();
                PrismaDynamicService.clients.r2 = client;
            }
            if (!PrismaDynamicService.clients.r3) {
                const client = new PrismaNaves();
                await client.$connect();
                PrismaDynamicService.clients.r3 = client;
            }
        } catch (error: any) {
            console.error('[PrismaDynamicService] Error initializing clients:', error?.message || error);
        }
    }

    async getClient() {
        await this.ensureClientsInitialized();
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
        await this.ensureClientsInitialized();
        return PrismaDynamicService.clients.r1;
    }

    get client() {
        const siteId = (this.request.headers['x-site-id'] as string || 'r1').toLowerCase();

        // Log all requests to see which site is being used
        console.log(`[PrismaDynamicService] Request to site: "${siteId}" for URL: ${this.request.url}`);

        switch (siteId) {
            case 'r2':
                if (!PrismaDynamicService.clients.r2) {
                    console.warn('[PrismaDynamicService] client.r2 is MISSING, falling back to r1');
                    return PrismaDynamicService.clients.r1;
                }
                return PrismaDynamicService.clients.r2;
            case 'r3':
                if (!PrismaDynamicService.clients.r3) {
                    console.warn('[PrismaDynamicService] client.r3 is MISSING, falling back to r1');
                    return PrismaDynamicService.clients.r1;
                }
                return PrismaDynamicService.clients.r3;
            case 'r1':
            default:
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
