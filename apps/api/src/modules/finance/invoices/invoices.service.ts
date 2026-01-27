import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class InvoicesService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => NotificationsService))
        private readonly notificationsService: NotificationsService,
    ) { }

    async create(organization_id: string, createDto: CreateInvoiceDto) {
        const invoice = await this.prisma.invoices.create({
            data: {
                id: require('crypto').randomUUID(),
                ...createDto,
                organization_id,
            } as any,
            include: {
                clients: { select: { id: true } },
            },
        });

        // Notify organization users about new invoice
        try {
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

            for (const user of users) {
                await this.notificationsService.notifyInvoiceCreated(
                    invoice.id,
                    user.id,
                    invoice.number,
                    Number(invoice.amount),
                    organization_id,
                );
            }
        } catch (error) {
            console.error('Failed to send invoice notification:', error);
        }

        return invoice;
    }

    async findAll(organization_id: string, query: QueryInvoiceDto) {
        const { search, status, client_id, start_date, endDate, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const where: any = {
            organization_id,
        };

        if (status) {
            where.status = status;
        }

        if (client_id) {
            where.client_id = client_id;
        }

        if (start_date || endDate) {
            where.issue_date = {}; // Fixed: snake_case
            if (start_date) where.issue_date.gte = new Date(start_date);
            if (endDate) where.issue_date.lte = new Date(endDate);
        }

        if (search) {
            where.OR = [
                { number: { contains: search, mode: 'insensitive' } },
                { cfdi_uuid: { contains: search, mode: 'insensitive' } }, // Fixed: snake_case
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.invoices.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    issue_date: 'desc', // Fixed: snake_case
                },
                include: {
                    clients: {
                        select: {
                            id: true,
                            nombre: true,
                            rfc: true,
                        },
                    },
                },
            }),
            this.prisma.invoices.count({ where }),
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
        const item = await this.prisma.invoices.findFirst({
            where: {
                id,
                organization_id,
            },
            include: {
                clients: true,
            },
        });

        if (!item) {
            throw new NotFoundException('Invoice not found');
        }

        return item;
    }

    async update(id: string, organization_id: string, updateDto: UpdateInvoiceDto) {
        const currentInvoice = await this.findOne(id, organization_id);
        const updatedInvoice = await this.prisma.invoices.update({
            where: { id },
            data: updateDto,
        });

        // Notify if status changed to PAID
        if (updateDto.status === InvoiceStatus.PAID && currentInvoice.status !== InvoiceStatus.PAID) {
            try {
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

                for (const user of users) {
                    await this.notificationsService.notifyInvoicePaid(
                        id,
                        user.id,
                        updatedInvoice.number,
                        Number(updatedInvoice.amount),
                        organization_id,
                    );
                }
            } catch (error) {
                console.error('Failed to send invoice paid notification:', error);
            }
        }

        return updatedInvoice;
    }

    async remove(id: string, organization_id: string) {
        await this.findOne(id, organization_id);

        return this.prisma.invoices.delete({
            where: { id },
        });
    }

    async getStatistics(organization_id: string) {
        const [totalInvoiced, totalPaid, totalOverdue] = await Promise.all([
            this.prisma.invoices.aggregate({
                where: { organization_id },
                _sum: { total: true },
            }),
            this.prisma.invoices.aggregate({
                where: { organization_id, status: 'PAID' },
                _sum: { total: true },
            }),
            this.prisma.invoices.aggregate({
                where: { organization_id, status: 'OVERDUE' },
                _sum: { total: true },
            }),
        ]);

        return {
            totalInvoiced: totalInvoiced._sum.total || 0,
            totalPaid: totalPaid._sum.total || 0,
            totalOverdue: totalOverdue._sum.total || 0,
        };
    }
}
