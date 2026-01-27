import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateAccountReceivableDto } from './dto/create-ar.dto';
import { UpdateAccountReceivableDto } from './dto/update-ar.dto';
import { QueryAccountReceivableDto } from './dto/query-ar.dto';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class AccountsReceivableService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => NotificationsService))
        private readonly notificationsService: NotificationsService,
    ) { }

    async create(organization_id: string, createDto: CreateAccountReceivableDto) {
        const accountReceivable = await this.prisma.accounts_receivable.create({
            data: {
                id: require('crypto').randomUUID(),
                ...createDto,
                monto_restante: createDto.monto,
                organization_id,
                updated_at: new Date(),
            } as any,
            include: {
                projects: { select: { owner_id: true } },
            },
        });

        // Notify about due date if provided
        if (createDto.fecha_vencimiento) {
            try {
                const usersToNotify = [accountReceivable.projects?.owner_id].filter(Boolean);
                const fechaVencimiento = new Date(createDto.fecha_vencimiento);
                
                for (const userId of usersToNotify) {
                    if (userId) {
                        await this.notificationsService.notifyAccountReceivableDue(
                            accountReceivable.id,
                            userId,
                            createDto.concepto,
                            fechaVencimiento,
                            organization_id,
                        );
                    }
                }
            } catch (error) {
                console.error('Failed to send account receivable notification:', error);
            }
        }

        return accountReceivable;
    }

    async findAll(organization_id: string, query: QueryAccountReceivableDto) {
        const { search, status, client_id, project_id, page = 1, limit = 20 } = query;
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

        if (project_id) {
            where.project_id = project_id;
        }

        if (search) {
            where.OR = [
                { concepto: { contains: search, mode: 'insensitive' } },
                { notas: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.accounts_receivable.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    created_at: 'desc',
                },
                include: {
                    clients: {
                        select: {
                            id: true,
                            nombre: true,
                        },
                    },
                    projects: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            }),
            this.prisma.accounts_receivable.count({ where }),
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
        const item = await this.prisma.accounts_receivable.findFirst({
            where: {
                id,
                organization_id,
            },
            include: {
                clients: true,
                projects: true,
            },
        });

        if (!item) {
            throw new NotFoundException('Account Receivable not found');
        }

        return item;
    }

    async update(id: string, organization_id: string, updateDto: UpdateAccountReceivableDto) {
        await this.findOne(id, organization_id);

        // If amount changes, we need to recalculate remaining amount?
        // For now, let's assume simple update. Complex logic for payments should be in PaymentComplement service.

        return this.prisma.accounts_receivable.update({
            where: { id },
            data: updateDto,
        });
    }

    async remove(id: string, organization_id: string) {
        await this.findOne(id, organization_id);

        return this.prisma.accounts_receivable.delete({
            where: { id },
        });
    }

    async getStatistics(organization_id: string) {
        const [totalPending, totalOverdue] = await Promise.all([
            this.prisma.accounts_receivable.aggregate({
                where: { organization_id, status: 'PENDING' },
                _sum: { monto_restante: true },
            }),
            this.prisma.accounts_receivable.aggregate({
                where: { organization_id, status: 'OVERDUE' },
                _sum: { monto_restante: true },
            }),
        ]);

        return {
            totalPending: totalPending._sum.monto_restante || 0,
            totalOverdue: totalOverdue._sum.monto_restante || 0,
        };
    }
}
