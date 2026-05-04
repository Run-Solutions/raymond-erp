import { Injectable, OnModuleInit, Scope, Inject, UnauthorizedException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient as PrismaR1 } from '@prisma/client-taller-r1';
import { PrismaClient as PrismaFrontera } from '@prisma/client-frontera';
import { PrismaClient as PrismaNaves } from '@prisma/client-naves';

@Injectable({ scope: Scope.REQUEST })
export class PrismaDynamicService {
    public static clients: Record<string, any> = {};

    constructor(
        @Inject(REQUEST) private request: Request,
        private jwtService: JwtService
    ) { }

    static async ensureClientsInitialized() {
        if (PrismaDynamicService.clients.r1 && PrismaDynamicService.clients.r2 && PrismaDynamicService.clients.r3) {
            return;
        }

        if (!PrismaDynamicService.clients.r1) {
            try {
                const client = new PrismaR1();
                await client.$connect();
                PrismaDynamicService.clients.r1 = client;
                console.log('✅ Conexión establecida: Taller R1');
            } catch (error: any) {
                console.error('❌ [PrismaDynamicService] Error initializing R1:', error?.message || error);
            }
        }
        
        if (!PrismaDynamicService.clients.r2) {
            try {
                const client = new PrismaNaves();
                await client.$connect();
                PrismaDynamicService.clients.r2 = client;
                console.log('✅ Conexión establecida: Naves (R2)');
            } catch (error: any) {
                console.error('❌ [PrismaDynamicService] Error initializing R2:', error?.message || error);
            }
        }
        
        if (!PrismaDynamicService.clients.r3) {
            try {
                const client = new PrismaFrontera();
                await client.$connect();
                PrismaDynamicService.clients.r3 = client;
                console.log('✅ Conexión establecida: R3');
            } catch (error: any) {
                console.error('❌ [PrismaDynamicService] Error initializing R3:', error?.message || error);
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

        // Security Check: Validate site access if not an auth route
        const isAuthRoute = this.request.url.includes('/auth-taller/');
        if (!isAuthRoute) {
            const authHeader = this.request.headers['authorization'];
            if (authHeader) {
                try {
                    const token = authHeader.split(' ')[1];
                    const decoded = this.jwtService.decode(token) as any;
                    
                    if (decoded && decoded.sitio) {
                        const allowedSites = decoded.sitio.split(',').map((s: string) => s.trim().toLowerCase());
                        
                        // Enforce restriction
                        if (!allowedSites.includes(siteId)) {
                            console.error(`[PrismaDynamicService] 🚨 Access Denied! User ${decoded.email} tried to access ${siteId} but only has access to: ${decoded.sitio}`);
                            throw new UnauthorizedException(`No tienes permiso para acceder al sitio ${siteId.toUpperCase()}. Tu acceso está restringido a: ${decoded.sitio}`);
                        }
                    }
                } catch (error) {
                    if (error instanceof UnauthorizedException) throw error;
                    // Ignore decoding errors here, let guards handle it if necessary
                }
            }
        }

        // Log all requests to see which site is being used
        console.log(`[PrismaDynamicService] Request to site: "${siteId}" for URL: ${this.request.url}`);

        // Ensure clients are initialized before returning
        if (!PrismaDynamicService.clients.r1 || !PrismaDynamicService.clients.r2 || !PrismaDynamicService.clients.r3) {
            console.log('[PrismaDynamicService] Clients NOT initialized, triggering initialization...');
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
