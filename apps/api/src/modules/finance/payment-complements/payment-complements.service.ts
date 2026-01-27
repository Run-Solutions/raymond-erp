import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreatePaymentComplementDto } from './dto/create-payment-complement.dto';
import { PaymentStatus } from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class PaymentComplementsService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => NotificationsService))
        private readonly notificationsService: NotificationsService,
    ) { }

    async create(organization_id: string, createDto: CreatePaymentComplementDto) {
        const { accountReceivableId, accountPayableId, monto } = createDto;

        if (!accountReceivableId && !accountPayableId) {
            throw new BadRequestException('Must provide either accountReceivableId or accountPayableId');
        }

        if (accountReceivableId) {
            // 1. Verify AR exists and belongs to organization
            const ar = await this.prisma.accounts_receivable.findFirst({
                where: { id: accountReceivableId, organization_id },
            });

            if (!ar) {
                throw new NotFoundException('Account Receivable not found');
            }

            // 2. Validate amount
            if (monto <= 0) {
                throw new BadRequestException('Payment amount must be greater than 0');
            }

            // 3. Create Payment Complement
            const payment = await this.prisma.payment_complements.create({
                data: {
                    id: require('crypto').randomUUID(),
                    account_receivable_id: accountReceivableId, // Fixed: snake_case
                    account_payable_id: null,
                    monto,
                    fecha_pago: createDto.fechaPago ? new Date(createDto.fechaPago) : new Date(), // Fixed: camelCase
                    forma_pago: createDto.formaPago, // Fixed: DTO uses camelCase
                    referencia: createDto.referencia,
                    notas: createDto.notas,
                    cfdi_uuid: createDto.cfdiUuid, // Fixed: DTO uses camelCase
                    cfdi_url: createDto.cfdiUrl, // Fixed: DTO uses camelCase
                    organization_id,
                    updated_at: new Date(), // Add required field
                } as any,
            });

            // 4. Update Account Receivable totals and status
            const newPaid = Number(ar.monto_pagado) + Number(monto);
            const newRemaining = Number(ar.monto) - newPaid;

            // Determine status
            let newStatus: PaymentStatus = 'PARTIAL';
            if (newRemaining <= 0.01) { // Epsilon for float precision
                newStatus = 'PAID';
            }

            const updatedAr = await this.prisma.accounts_receivable.update({
                where: { id: accountReceivableId },
                data: {
                    monto_pagado: newPaid,
                    monto_restante: newRemaining,
                    status: newStatus,
                },
                include: {
                    projects: { select: { owner_id: true } },
                },
            });

            // Notify when fully paid
            if (newStatus === 'PAID') {
                try {
                    const usersToNotify = [updatedAr.projects?.owner_id].filter(Boolean);
                    for (const userId of usersToNotify) {
                        if (userId) {
                            await this.notificationsService.notifyAccountReceivablePaid(
                                accountReceivableId,
                                userId,
                                ar.concepto,
                                organization_id,
                            );
                        }
                    }
                } catch (error) {
                    console.error('Failed to send account receivable paid notification:', error);
                }
            }

            return payment;
        } else if (accountPayableId) {
            // 1. Verify AP exists and belongs to organization
            const ap = await this.prisma.accounts_payable.findFirst({
                where: { id: accountPayableId, organization_id },
            });

            if (!ap) {
                throw new NotFoundException('Account Payable not found');
            }

            // 2. Validate amount
            if (monto <= 0) {
                throw new BadRequestException('Payment amount must be greater than 0');
            }

            // 3. Create Payment Complement
            const payment = await this.prisma.payment_complements.create({
                data: {
                    id: require('crypto').randomUUID(),
                    account_receivable_id: null,
                    account_payable_id: accountPayableId, // Fixed: snake_case
                    monto,
                    fecha_pago: createDto.fechaPago ? new Date(createDto.fechaPago) : new Date(), // Fixed: camelCase
                    forma_pago: createDto.formaPago, // Fixed: DTO uses camelCase
                    referencia: createDto.referencia,
                    notas: createDto.notas,
                    cfdi_uuid: createDto.cfdiUuid, // Fixed: DTO uses camelCase
                    cfdi_url: createDto.cfdiUrl, // Fixed: DTO uses camelCase
                    organization_id,
                    updated_at: new Date(), // Add required field
                } as any,
            });

            // 4. Update Account Payable totals and status
            const newPaid = Number(ap.monto_pagado) + Number(monto);
            const newRemaining = Number(ap.monto) - newPaid;

            // Determine status
            let newStatus: PaymentStatus = 'PARTIAL';
            if (newRemaining <= 0.01) { // Epsilon for float precision
                newStatus = 'PAID';
            }

            const updatedAp = await this.prisma.accounts_payable.update({
                where: { id: accountPayableId },
                data: {
                    monto_pagado: newPaid,
                    monto_restante: newRemaining,
                    status: newStatus,
                },
            });

            // Notify when fully paid
            if (newStatus === 'PAID') {
                try {
                    // Get organization users who should be notified
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
                        await this.notificationsService.notifyAccountPayablePaid(
                            accountPayableId,
                            user.id,
                            ap.concepto,
                            organization_id,
                        );
                    }
                } catch (error) {
                    console.error('Failed to send account payable paid notification:', error);
                }
            }

            return payment;
        }
    }

    async findAllByAr(organization_id: string, arId: string) {
        return this.prisma.payment_complements.findMany({
            where: {
                organization_id,
                account_receivable_id: arId, // Fixed: snake_case field name
            },
            orderBy: {
                fecha_pago: 'desc',
            },
        });
    }

    async findAllByAp(organization_id: string, apId: string) {
        return this.prisma.payment_complements.findMany({
            where: {
                organization_id,
                account_payable_id: apId, // Fixed: snake_case field name
            },
            include: {
                accounts_payable: { // Fixed: correct relation name (plural)
                    include: {
                        suppliers: {
                            select: {
                                id: true,
                                nombre: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                fecha_pago: 'desc',
            },
        });
    }

    async findAll(organization_id: string) {
        return this.prisma.payment_complements.findMany({
            where: {
                organization_id,
            },
            include: {
                accounts_payable: { // Fixed: correct relation name (plural)
                    include: {
                        suppliers: {
                            select: {
                                id: true,
                                nombre: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                fecha_pago: 'desc',
            },
        });
    }

    async findAllByClient(organization_id: string, client_id: string) {
        // Since payment_complements doesn't have a relation to accounts_receivable,
        // we need to first get the AR IDs for this client, then filter payments
        const arIds = await this.prisma.accounts_receivable.findMany({
            where: {
                organization_id,
                client_id: client_id,
            },
            select: {
                id: true,
            },
        });

        const arIdList = arIds.map(ar => ar.id);

        return this.prisma.payment_complements.findMany({
            where: {
                organization_id,
                account_receivable_id: {
                    in: arIdList,
                },
            },
            orderBy: {
                fecha_pago: 'desc',
            },
        });
    }

    async findAllBySupplier(organization_id: string, supplier_id: string) {
        return this.prisma.payment_complements.findMany({
            where: {
                organization_id,
                accounts_payable: { // Fixed: correct relation name (plural)
                    supplier_id: supplier_id,
                },
            },
            include: {
                accounts_payable: { // Fixed: correct relation name (plural)
                    include: {
                        suppliers: {
                            select: {
                                id: true,
                                nombre: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                fecha_pago: 'desc',
            },
        });
    }
}
