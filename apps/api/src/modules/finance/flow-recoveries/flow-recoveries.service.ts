
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateFlowRecoveryDto } from './dto/create-flow-recovery.dto';
import { UpdateFlowRecoveryDto } from './dto/update-flow-recovery.dto';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class FlowRecoveriesService {
    constructor(
        private prisma: PrismaService,
        @Inject(forwardRef(() => NotificationsService))
        private readonly notificationsService: NotificationsService,
    ) { }

    async create(organization_id: string, data: CreateFlowRecoveryDto) {
        const recovery = await this.prisma.flow_recoveries.create({
            data: {
                id: require('crypto').randomUUID(),
                ...data,
                organization_id,
            } as any,
            include: {
                clients: { select: { id: true } },
            },
        });

        // Notify organization users
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
                await this.notificationsService.notifyRecoveryCreated(
                    recovery.id,
                    user.id,
                    `${recovery.periodo} - ${recovery.clients?.nombre || 'Cliente'}`,
                    organization_id,
                );
            }
        } catch (error) {
            console.error('Failed to send recovery notification:', error);
        }

        return recovery;
    }

    async findAll(organization_id: string) {
        return this.prisma.flow_recoveries.findMany({
            where: { organization_id },
            include: {
                clients: true,
            },
        });
    }

    async findOne(id: string, organization_id: string) {
        return this.prisma.flow_recoveries.findFirst({
            where: { id, organization_id },
            include: {
                clients: true,
            },
        });
    }

    async update(id: string, organization_id: string, data: UpdateFlowRecoveryDto) {
        const currentRecovery = await this.findOne(id, organization_id);
        const updatedRecovery = await this.prisma.flow_recoveries.update({
            where: { id, organization_id },
            data,
            include: {
                clients: { select: { nombre: true } },
            },
        });

        // Notify if recovery is completed (100% recovered)
        if (data.porcentajeRecuperado !== undefined && data.porcentajeRecuperado >= 100 && currentRecovery.porcentajeRecuperado < 100) {
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
                    await this.notificationsService.notifyRecoveryCompleted(
                        id,
                        user.id,
                        `${updatedRecovery.periodo} - ${updatedRecovery.clients?.nombre || 'Cliente'}`,
                        Number(updatedRecovery.recuperacionesReales),
                        organization_id,
                    );
                }
            } catch (error) {
                console.error('Failed to send recovery completed notification:', error);
            }
        }

        return updatedRecovery;
    }

    async remove(id: string, organization_id: string) {
        return this.prisma.flow_recoveries.delete({
            where: { id, organization_id },
        });
    }
}
