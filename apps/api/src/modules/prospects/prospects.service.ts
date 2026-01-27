import { Injectable, NotFoundException, BadRequestException, Logger, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProspectDto } from './dto/create-prospect.dto';
import { UpdateProspectDto } from './dto/update-prospect.dto';
import { QueryProspectDto } from './dto/query-prospect.dto';
import { ConvertProspectDto } from './dto/convert-prospect.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { AssignProspectDto } from './dto/assign-prospect.dto';
import { $Enums } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';

type ProspectStatus = $Enums.ProspectStatus;

// Valid transitions map
const VALID_TRANSITIONS: Record<ProspectStatus, ProspectStatus[]> = {
    [$Enums.ProspectStatus.NEW]: [$Enums.ProspectStatus.CONTACTED, $Enums.ProspectStatus.LOST],
    [$Enums.ProspectStatus.CONTACTED]: [$Enums.ProspectStatus.QUALIFIED, $Enums.ProspectStatus.LOST],
    [$Enums.ProspectStatus.QUALIFIED]: [$Enums.ProspectStatus.PROPOSAL_SENT, $Enums.ProspectStatus.LOST],
    [$Enums.ProspectStatus.PROPOSAL_SENT]: [$Enums.ProspectStatus.NEGOTIATION, $Enums.ProspectStatus.LOST],
    [$Enums.ProspectStatus.NEGOTIATION]: [$Enums.ProspectStatus.WON, $Enums.ProspectStatus.LOST],
    [$Enums.ProspectStatus.WON]: [], // WON can only be converted to client
    [$Enums.ProspectStatus.LOST]: [], // LOST is final
};

@Injectable()
export class ProspectsService {
    private readonly logger = new Logger(ProspectsService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => NotificationsService))
        private readonly notificationsService: NotificationsService,
    ) { }

    async create(organization_id: string, createProspectDto: CreateProspectDto, created_by_id?: string) {
        // Validate assigned user belongs to organization
        if (createProspectDto.assigned_to_id) {
            const assignedUser = await this.prisma.users.findFirst({
                where: {
                    id: createProspectDto.assigned_to_id,
                    organization_id,
                },
            });

            if (!assignedUser) {
                throw new BadRequestException('Assigned user does not belong to this organization');
            }
        }

        const prospect = await this.prisma.prospects.create({
            data: {
                id: require('crypto').randomUUID(),
                ...createProspectDto,
                status: createProspectDto.status || $Enums.ProspectStatus.NEW,
                organization_id,
                updated_at: new Date(),
                expected_close_date: createProspectDto.expected_close_date
                    ? new Date(createProspectDto.expected_close_date)
                    : undefined,
            } as any,
            include: {
                assigned_to: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        avatar_url: true,
                    },
                },
            },
        });

        // Notify assigned user if exists
        if (prospect.assigned_to_id) {
            await this.notificationsService.notifyUser(
                prospect.assigned_to_id,
                'PROSPECT_CREATED' as any,
                'Nuevo Prospecto Asignado',
                `Se te ha asignado un nuevo prospecto: ${prospect.nombre}`,
                {
                    link: `/clients?tab=prospects&prospect=${prospect.id}`,
                    organization_id,
                    metadata: { prospect_id: prospect.id },
                },
            );
        }

        return prospect;
    }

    async findAll(organization_id: string, query: QueryProspectDto) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        const where: any = {
            organization_id,
        };

        // Status filter
        if (query.status) {
            where.status = query.status;
        } else if (query.statuses && query.statuses.length > 0) {
            where.status = { in: query.statuses };
        }

        // Assigned to filter
        if (query.assigned_to_id) {
            where.assigned_to_id = query.assigned_to_id;
        }

        // Date range filter
        if (query.expected_close_date_from || query.expected_close_date_to) {
            where.expected_close_date = {};
            if (query.expected_close_date_from) {
                where.expected_close_date.gte = new Date(query.expected_close_date_from);
            }
            if (query.expected_close_date_to) {
                where.expected_close_date.lte = new Date(query.expected_close_date_to);
            }
        }

        // Search filter
        if (query.search) {
            where.AND = [
                { organization_id },
                {
                    OR: [
                        { nombre: { contains: query.search, mode: 'insensitive' } },
                        { rfc: { contains: query.search, mode: 'insensitive' } },
                        { email: { contains: query.search, mode: 'insensitive' } },
                        { contacto: { contains: query.search, mode: 'insensitive' } },
                    ],
                },
            ];
            delete where.organization_id;
        }

        const [prospects, total] = await Promise.all([
            this.prisma.prospects.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    created_at: 'desc',
                },
                include: {
                    assigned_to: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            email: true,
                            avatar_url: true,
                        },
                    },
                    converted_to_client: {
                        select: {
                            id: true,
                            nombre: true,
                        },
                    },
                },
            }),
            this.prisma.prospects.count({ where }),
        ]);

        return {
            data: prospects,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string, organization_id: string) {
        const prospect = await this.prisma.prospects.findFirst({
            where: {
                id,
                organization_id,
            },
            include: {
                assigned_to: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        avatar_url: true,
                    },
                },
                converted_to_client: {
                    select: {
                        id: true,
                        nombre: true,
                        rfc: true,
                        email: true,
                    },
                },
            },
        });

        if (!prospect) {
            throw new NotFoundException('Prospect not found');
        }

        return prospect;
    }

    async update(id: string, organization_id: string, updateProspectDto: UpdateProspectDto) {
        const prospect = await this.findOne(id, organization_id);

        // Validate assigned user if changed
        if (updateProspectDto.assigned_to_id && updateProspectDto.assigned_to_id !== prospect.assigned_to_id) {
            const assignedUser = await this.prisma.users.findFirst({
                where: {
                    id: updateProspectDto.assigned_to_id,
                    organization_id,
                },
            });

            if (!assignedUser) {
                throw new BadRequestException('Assigned user does not belong to this organization');
            }
        }

        const updated = await this.prisma.prospects.update({
            where: { id },
            data: {
                ...updateProspectDto,
                updated_at: new Date(),
                expected_close_date: updateProspectDto.expected_close_date
                    ? new Date(updateProspectDto.expected_close_date)
                    : undefined,
            } as any,
            include: {
                assigned_to: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        avatar_url: true,
                    },
                },
            },
        });

        // Notify if assignment changed
        if (updateProspectDto.assigned_to_id && updateProspectDto.assigned_to_id !== prospect.assigned_to_id) {
            await this.notificationsService.notifyUser(
                updateProspectDto.assigned_to_id,
                'PROSPECT_ASSIGNED' as any,
                'Prospecto Asignado',
                `Se te ha asignado el prospecto: ${updated.nombre}`,
                {
                    link: `/clients?tab=prospects&prospect=${updated.id}`,
                    organization_id,
                    metadata: { prospect_id: updated.id },
                },
            );
        }

        return updated;
    }

    async changeStatus(id: string, organization_id: string, changeStatusDto: ChangeStatusDto, changed_by_id?: string) {
        const prospect = await this.findOne(id, organization_id);

        // Validate transition
        const validTransitions = VALID_TRANSITIONS[prospect.status];
        if (!validTransitions.includes(changeStatusDto.status)) {
            throw new BadRequestException(
                `Invalid status transition from ${prospect.status} to ${changeStatusDto.status}. Valid transitions: ${validTransitions.join(', ')}`,
            );
        }

        const updated = await this.prisma.prospects.update({
            where: { id },
            data: {
                status: changeStatusDto.status,
                updated_at: new Date(),
            },
            include: {
                assigned_to: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                    },
                },
            },
        });

        // Notify assigned user about status change
        if (updated.assigned_to_id) {
            await this.notificationsService.notifyUser(
                updated.assigned_to_id,
                'PROSPECT_STATUS_CHANGED' as any,
                'Estado de Prospecto Actualizado',
                `El prospecto "${updated.nombre}" cambió a estado: ${changeStatusDto.status}`,
                {
                    link: `/clients?tab=prospects&prospect=${updated.id}`,
                    organization_id,
                    metadata: { prospect_id: updated.id, old_status: prospect.status, new_status: changeStatusDto.status },
                },
            );
        }

        return updated;
    }

    async assign(id: string, organization_id: string, assignDto: AssignProspectDto) {
        const prospect = await this.findOne(id, organization_id);

        // Validate assigned user if provided
        if (assignDto.assigned_to_id) {
            const assignedUser = await this.prisma.users.findFirst({
                where: {
                    id: assignDto.assigned_to_id,
                    organization_id,
                },
            });

            if (!assignedUser) {
                throw new BadRequestException('Assigned user does not belong to this organization');
            }
        }

        const updated = await this.prisma.prospects.update({
            where: { id },
            data: {
                assigned_to_id: assignDto.assigned_to_id || null,
                updated_at: new Date(),
            },
            include: {
                assigned_to: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        avatar_url: true,
                    },
                },
            },
        });

        // Notify assigned user
        if (assignDto.assigned_to_id && assignDto.assigned_to_id !== prospect.assigned_to_id) {
            await this.notificationsService.notifyUser(
                assignDto.assigned_to_id,
                'PROSPECT_ASSIGNED' as any,
                'Prospecto Asignado',
                `Se te ha asignado el prospecto: ${updated.nombre}`,
                {
                    link: `/clients?tab=prospects&prospect=${updated.id}`,
                    organization_id,
                    metadata: { prospect_id: updated.id },
                },
            );
        }

        return updated;
    }

    async convertToClient(id: string, organization_id: string, convertDto: ConvertProspectDto, converted_by_id?: string) {
        const prospect = await this.findOne(id, organization_id);

        // Only WON prospects can be converted
        if (prospect.status !== $Enums.ProspectStatus.WON) {
            throw new BadRequestException('Only prospects with status WON can be converted to clients');
        }

        // Check if already converted
        if (prospect.converted_to_client_id) {
            throw new BadRequestException('This prospect has already been converted to a client');
        }

        // Create client in transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // Create client
            const client = await tx.clients.create({
                data: {
                    id: require('crypto').randomUUID(),
                    nombre: prospect.nombre,
                    rfc: convertDto.rfc || prospect.rfc,
                    direccion: convertDto.direccion || prospect.direccion,
                    telefono: convertDto.telefono || prospect.telefono,
                    country_code: convertDto.country_code || prospect.country_code || '52',
                    email: convertDto.email || prospect.email,
                    contacto: convertDto.contacto || prospect.contacto,
                    is_active: convertDto.is_active !== undefined ? convertDto.is_active : true,
                    organization_id,
                    updated_at: new Date(),
                } as any,
            });

            // Update prospect
            const updatedProspect = await tx.prospects.update({
                where: { id },
                data: {
                    converted_to_client_id: client.id,
                    converted_at: new Date(),
                    updated_at: new Date(),
                },
                include: {
                    assigned_to: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            email: true,
                        },
                    },
                },
            });

            return { client, prospect: updatedProspect };
        });

        // Notify assigned user and creator
        const notifyUserIds = new Set<string>();
        if (result.prospect.assigned_to_id) {
            notifyUserIds.add(result.prospect.assigned_to_id);
        }
        if (converted_by_id) {
            notifyUserIds.add(converted_by_id);
        }

        for (const userId of notifyUserIds) {
            await this.notificationsService.notifyUser(
                userId,
                'PROSPECT_CONVERTED_TO_CLIENT' as any,
                'Prospecto Convertido a Cliente',
                `El prospecto "${prospect.nombre}" ha sido convertido a cliente exitosamente`,
                {
                    link: `/clients/${result.client.id}`,
                    organization_id,
                    metadata: { prospect_id: id, client_id: result.client.id },
                },
            );
        }

        return result;
    }

    async remove(id: string, organization_id: string) {
        const prospect = await this.findOne(id, organization_id);

        // Don't allow deletion of converted prospects
        if (prospect.converted_to_client_id) {
            throw new BadRequestException('Cannot delete a prospect that has been converted to a client');
        }

        return this.prisma.prospects.delete({
            where: { id },
        });
    }

    async getStatistics(id: string, organization_id: string) {
        const prospect = await this.findOne(id, organization_id);

        const daysInPipeline = Math.floor(
            (new Date().getTime() - new Date(prospect.created_at).getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
            daysInPipeline,
            estimatedValue: prospect.estimated_value ? Number(prospect.estimated_value) : null,
            probability: prospect.probability || null,
            expectedCloseDate: prospect.expected_close_date,
            isConverted: !!prospect.converted_to_client_id,
        };
    }

    async getOrganizationStatistics(organization_id: string) {
        const [total, byStatus, totalValue, convertedCount] = await Promise.all([
            this.prisma.prospects.count({
                where: { organization_id },
            }),
            this.prisma.prospects.groupBy({
                by: ['status'],
                where: { organization_id },
                _count: true,
            }),
            this.prisma.prospects.aggregate({
                where: { organization_id },
                _sum: { estimated_value: true },
            }),
            this.prisma.prospects.count({
                where: {
                    organization_id,
                    converted_to_client_id: { not: null },
                },
            }),
        ]);

        const wonCount = byStatus.find((s) => s.status === $Enums.ProspectStatus.WON)?._count || 0;
        const conversionRate = total > 0 ? (wonCount / total) * 100 : 0;

        return {
            total,
            byStatus: byStatus.reduce((acc, item) => {
                acc[item.status] = item._count;
                return acc;
            }, {} as Record<string, number>),
            totalEstimatedValue: totalValue._sum.estimated_value ? Number(totalValue._sum.estimated_value) : 0,
            conversionRate: Math.round(conversionRate * 100) / 100,
            convertedCount,
        };
    }
}

