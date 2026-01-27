import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateAccountPayableDto } from './dto/create-ap.dto';
import { UpdateAccountPayableDto } from './dto/update-ap.dto';
import { QueryAccountPayableDto } from './dto/query-ap.dto';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class AccountsPayableService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => NotificationsService))
        private readonly notificationsService: NotificationsService,
    ) { }

    async create(organization_id: string, createDto: CreateAccountPayableDto) {
        const accountPayable = await this.prisma.accounts_payable.create({
            data: {
                id: require('crypto').randomUUID(),
                ...createDto,
                monto_pagado: 0,
                monto_restante: createDto.monto,
                organization_id,
                updated_at: new Date(),
            } as any,
        });

        // Notify about due date if provided
        if (createDto.fecha_vencimiento) {
            try {
                // Get organization users who should be notified (CEO, Admin, etc.)
                const users = await this.prisma.users.findMany({
                    where: {
                        organization_id,
                        is_active: true,
                        roles: {
                            name: { in: ['CEO', 'ADMIN', 'FINANCE_MANAGER'] },
                        },
                    },
                    select: { id: true },
                });

                const fechaVencimiento = new Date(createDto.fecha_vencimiento);
                for (const user of users) {
                    await this.notificationsService.notifyAccountPayableDue(
                        accountPayable.id,
                        user.id,
                        createDto.concepto,
                        fechaVencimiento,
                        organization_id,
                    );
                }
            } catch (error) {
                console.error('Failed to send account payable notification:', error);
            }
        }

        return accountPayable;
    }

    async findAll(organization_id: string, query: QueryAccountPayableDto) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const { search, status, supplier_id, category_id, pagado } = query;
        const skip = (page - 1) * limit;

        console.log(`[APService] findAll for Org: ${organization_id}, Page: ${page}, Limit: ${limit}`);

        const where: any = {
            organization_id,
        };

        if (status) {
            where.status = status;
        }

        if (supplier_id) {
            where.supplier_id = supplier_id;
        }

        if (category_id) {
            where.category_id = category_id;
        }

        if (pagado !== undefined) {
            where.pagado = pagado;
        }

        if (search) {
            where.OR = [
                { concepto: { contains: search, mode: 'insensitive' } },
                { notas: { contains: search, mode: 'insensitive' } },
                { referenciaPago: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.accounts_payable.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    created_at: 'desc', // Fixed: snake_case
                },
                include: {
                    suppliers: {
                        select: {
                            id: true,
                            nombre: true,
                        },
                    },
                    categories: { // Fixed: plural relation name
                        select: {
                            id: true,
                            nombre: true,
                            color: true,
                        },
                    },
                    payment_complements: {
                        orderBy: { fecha_pago: 'desc' },
                        take: 5, // Mostrar los últimos 5 pagos
                    },
                },
            }),
            this.prisma.accounts_payable.count({ where }),
        ]);

        return {
            data: items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string, organization_id: string) {
        const item = await this.prisma.accounts_payable.findFirst({
            where: {
                id,
                organization_id,
            },
            include: {
                suppliers: true,
                categories: true, // Fixed: correct relation name (plural)
                payment_complements: {
                    orderBy: { fecha_pago: 'desc' },
                },
            },
        });

        if (!item) {
            throw new NotFoundException('Account Payable not found');
        }

        return item;
    }

    async update(id: string, organization_id: string, updateDto: UpdateAccountPayableDto) {
        await this.findOne(id, organization_id);

        return this.prisma.accounts_payable.update({
            where: { id },
            data: updateDto,
        });
    }

    async remove(id: string, organization_id: string) {
        await this.findOne(id, organization_id);

        return this.prisma.accounts_payable.delete({
            where: { id },
        });
    }

    async getStatistics(organization_id: string) {
        const [totalPending, totalPaid] = await Promise.all([
            this.prisma.accounts_payable.aggregate({
                where: { organization_id, pagado: false },
                _sum: { monto: true },
            }),
            this.prisma.accounts_payable.aggregate({
                where: { organization_id, pagado: true },
                _sum: { monto: true },
            }),
        ]);

        return {
            totalPending: totalPending._sum.monto || 0,
            totalPaid: totalPaid._sum.monto || 0,
        };
    }
}
