import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';

@Injectable()
export class ClientsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(organization_id: string, createClientDto: CreateClientDto) {
        return this.prisma.clients.create({
            data: {
                id: require('crypto').randomUUID(),
                ...createClientDto,
                organization_id,
                updated_at: new Date(),
            } as any,
        });
    }

    async findAll(organization_id: string, query: QueryClientDto) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const { search, is_active } = query;
        const skip = (page - 1) * limit;

        // CRITICAL: Verify tenant context is set correctly
        const { TenantContext } = await import('../../common/context/tenant.context');
        const currentTenant = TenantContext.getTenantId();
        console.log(`[ClientsService.findAll] ⚠️ TENANT CHECK - Expected org: ${organization_id}, TenantContext: ${currentTenant}`);
        
        if (currentTenant !== organization_id) {
            console.error(`[ClientsService.findAll] 🚨 CRITICAL: Tenant mismatch! Expected: ${organization_id}, Got: ${currentTenant}`);
        }

        console.log(`[ClientsService] findAll for Org: ${organization_id}, Page: ${page}, Limit: ${limit}`);

        // CRITICAL: Always ensure organization_id is applied correctly, even with OR clauses
        // When using OR, we need to wrap it in AND to ensure organization_id is always enforced
        const where: any = {
            organization_id, // This will be enforced by the extension, but we set it here for clarity
        };

        if (is_active !== undefined) {
            where.is_active = is_active;
        }

        if (search) {
            // CRITICAL: Wrap OR in AND to ensure organization_id is always applied
            // Without this, Prisma might interpret: organization_id = 'xxx' OR (search conditions)
            // We need: organization_id = 'xxx' AND (search conditions)
            where.AND = [
                { organization_id }, // Explicitly include organization_id in AND clause
                {
                    OR: [
                        { nombre: { contains: search, mode: 'insensitive' } },
                        { rfc: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                        { contacto: { contains: search, mode: 'insensitive' } },
                    ],
                },
            ];
            // Remove organization_id from top level since it's now in AND
            delete where.organization_id;
        }

        const [clients, total] = await Promise.all([
            this.prisma.clients.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    created_at: 'desc', // Fixed: snake_case
                },
                include: {
                    _count: {
                        select: {
                            projects: true,
                            invoices: true,
                        },
                    },
                },
            }),
            this.prisma.clients.count({ where }),
        ]);

        return {
            data: clients,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string, organization_id: string) {
        const client = await this.prisma.clients.findFirst({
            where: {
                id,
                organization_id,
            },
            include: {
                projects: {
                    take: 5,
                    orderBy: { created_at: 'desc' }, // Fixed: snake_case
                },
                invoices: {
                    take: 5,
                    orderBy: { issue_date: 'desc' }, // Fixed: snake_case
                },
                _count: {
                    select: {
                        projects: true,
                        invoices: true,
                    },
                },
            },
        });

        if (!client) {
            throw new NotFoundException('Client not found');
        }

        return client;
    }

    async update(id: string, organization_id: string, updateClientDto: UpdateClientDto) {
        await this.findOne(id, organization_id);

        return this.prisma.clients.update({
            where: { id },
            data: updateClientDto,
        });
    }

    async remove(id: string, organization_id: string) {
        await this.findOne(id, organization_id);

        // Hard delete or Soft delete? Schema doesn't have deletedAt for Client, but has is_active.
        // Let's use is_active = false for "soft delete" behavior if we want to preserve history,
        // or actually delete if that's the requirement. 
        // Given enterprise nature, usually we don't delete clients with data.
        // But for now, let's assume standard delete or toggle active.
        // The prompt asked for "List view with filters... is_active".
        // Let's implement a delete that fails if there are relations, or just use is_active.
        // For now, I'll implement a delete that relies on Prisma's cascade or error if relations exist.
        // Actually, looking at schema: `organization Organization @relation(fields: [organization_id], references: [id], onDelete: Cascade)`
        // But Client -> Projects doesn't say Cascade.
        // Let's stick to standard delete.

        return this.prisma.clients.delete({
            where: { id },
        });
    }

    async getStatistics(id: string, organization_id: string) {
        const client = await this.findOne(id, organization_id);

        const [totalInvoiced, totalPaid] = await Promise.all([
            this.prisma.invoices.aggregate({
                where: { client_id: id, organization_id },
                _sum: { total: true },
            }),
            this.prisma.invoices.aggregate({
                where: { client_id: id, organization_id, status: 'PAID' },
                _sum: { total: true },
            }),
        ]);

        return {
            totalInvoiced: totalInvoiced._sum.total || 0,
            totalPaid: totalPaid._sum.total || 0,
            outstandingBalance: (Number(totalInvoiced._sum.total || 0) - Number(totalPaid._sum.total || 0)),
        };
    }
}
