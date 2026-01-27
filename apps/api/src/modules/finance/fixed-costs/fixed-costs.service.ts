import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateFixedCostDto } from './dto/create-fixed-cost.dto';
import { UpdateFixedCostDto } from './dto/update-fixed-cost.dto';
import { QueryFixedCostDto } from './dto/query-fixed-cost.dto';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class FixedCostsService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => NotificationsService))
        private readonly notificationsService: NotificationsService,
    ) { }

    async create(organization_id: string, createDto: CreateFixedCostDto) {
        return this.prisma.fixed_costs.create({
            data: {
                id: require('crypto').randomUUID(),
                ...createDto,
                organization_id,
            } as any,
        });
    }

    async findAll(organization_id: string, query: QueryFixedCostDto) {
        const { search, categoria, is_active, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const where: any = {
            organization_id,
        };

        if (categoria) {
            where.categoria = categoria;
        }

        if (is_active !== undefined) {
            where.is_active = is_active;
        }

        if (search) {
            where.OR = [
                { nombre: { contains: search, mode: 'insensitive' } },
                { notas: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.fixed_costs.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    created_at: 'desc', // Fixed: snake_case
                },
            }),
            this.prisma.fixed_costs.count({ where }),
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
        const item = await this.prisma.fixed_costs.findFirst({
            where: {
                id,
                organization_id,
            },
        });

        if (!item) {
            throw new NotFoundException('Fixed Cost not found');
        }

        return item;
    }

    async update(id: string, organization_id: string, updateDto: UpdateFixedCostDto) {
        const currentFixedCost = await this.findOne(id, organization_id);
        const updatedFixedCost = await this.prisma.fixed_costs.update({
            where: { id },
            data: updateDto,
        });

        // Notify if próximoPago is updated and is within 7 days
        if (updateDto.proximoPago) {
            const proximoPago = new Date(updateDto.proximoPago);
            const daysUntilDue = Math.ceil((proximoPago.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            
            if (daysUntilDue <= 7 && daysUntilDue >= 0) {
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
                        await this.notificationsService.notifyFixedCostDue(
                            id,
                            user.id,
                            updatedFixedCost.nombre,
                            Number(updatedFixedCost.monto),
                            proximoPago,
                            organization_id,
                        );
                    }
                } catch (error) {
                    console.error('Failed to send fixed cost notification:', error);
                }
            }
        }

        return updatedFixedCost;
    }

    async remove(id: string, organization_id: string) {
        await this.findOne(id, organization_id);

        return this.prisma.fixed_costs.delete({
            where: { id },
        });
    }

    async getStatistics(organization_id: string) {
        const totalMonthly = await this.prisma.fixed_costs.aggregate({
            where: {
                organization_id,
                is_active: true,
                periodicidad: 'Mensual',
            },
            _sum: { monto: true },
        });

        return {
            totalMonthly: totalMonthly._sum.monto || 0,
        };
    }
}
