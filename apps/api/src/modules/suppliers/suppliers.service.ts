import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class SuppliersService {
    constructor(private readonly prisma: PrismaService) { }

    async create(organization_id: string, createSupplierDto: CreateSupplierDto) {
        return this.prisma.suppliers.create({
            data: {
                id: randomUUID(),
                ...createSupplierDto,
                organization_id,
                updated_at: new Date(),
            },
        });
    }

    async findAll(organization_id: string | null, query: QuerySupplierDto) {
        // CRITICAL: organization_id can be null for SuperAdmin
        if (!organization_id) {
            return {
                data: [],
                meta: {
                    total: 0,
                    page: 1,
                    limit: 20,
                    totalPages: 0,
                },
            };
        }

        const { search, is_active, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const where: any = {
            organization_id, // This will be enforced by the extension
        };

        if (is_active !== undefined) {
            where.is_active = is_active;
        }

        if (search) {
            where.OR = [
                { nombre: { contains: search, mode: 'insensitive' } },
                { rfc: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { contacto: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [suppliers, total] = await Promise.all([
            this.prisma.suppliers.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    created_at: 'desc', // Fixed: snake_case
                },
                include: {
                    _count: {
                        select: {
                            accounts_payable: true, // Fixed: accountsPayable -> accounts_payable
                            // requisitions: true, // COMMENTED: relation doesn't exist
                        },
                    },
                },
            }),
            this.prisma.suppliers.count({ where }),
        ]);

        return {
            data: suppliers,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string, organization_id: string) {
        const supplier = await this.prisma.suppliers.findFirst({
            where: {
                id,
                organization_id,
            },
            include: {
                accounts_payable: { // Fixed: accountsPayable -> accounts_payable
                    take: 5,
                    orderBy: { created_at: 'desc' },
                },
                purchase_orders: { // Fixed: requisitions -> purchase_orders
                    take: 5,
                    orderBy: { created_at: 'desc' },
                },
                _count: {
                    select: {
                        accounts_payable: true, // Fixed: accountsPayable -> accounts_payable
                        purchase_orders: true, // Fixed: requisitions -> purchase_orders
                    },
                },
            },
        });

        if (!supplier) {
            throw new NotFoundException('Supplier not found');
        }

        return supplier;
    }

    async update(id: string, organization_id: string, updateSupplierDto: UpdateSupplierDto) {
        await this.findOne(id, organization_id);

        return this.prisma.suppliers.update({
            where: { id },
            data: {
                ...updateSupplierDto,
                updated_at: new Date(),
            },
        });
    }

    async remove(id: string, organization_id: string) {
        await this.findOne(id, organization_id);

        return this.prisma.suppliers.delete({
            where: { id },
        });
    }
}
