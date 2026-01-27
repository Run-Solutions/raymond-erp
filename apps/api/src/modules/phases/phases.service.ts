import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { QueryPhaseDto } from './dto/query-phase.dto';

@Injectable()
export class PhasesService {
    constructor(private readonly prisma: PrismaService) {}

    async create(user: any, createPhaseDto: CreatePhaseDto) {
        const { organization_id } = user;

        return this.prisma.phases.create({
            data: {
                id: require('crypto').randomUUID(),
                ...createPhaseDto,
                organization_id,
                updated_at: new Date(),
            },
        });
    }

    async findAll(user: any, query: QueryPhaseDto) {
        const { organization_id } = user;
        const { search } = query;

        const where: any = {
            organization_id,
        };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const phases = await this.prisma.phases.findMany({
            where,
            orderBy: {
                order: 'asc',
            },
        });

        return {
            data: phases,
            meta: {
                total: phases.length,
            },
        };
    }

    async findOne(user: any, id: string) {
        const { organization_id } = user;

        return this.prisma.phases.findFirst({
            where: {
                id,
                organization_id,
            },
        });
    }

    async update(user: any, id: string, updatePhaseDto: Partial<CreatePhaseDto>) {
        const { organization_id } = user;

        return this.prisma.phases.updateMany({
            where: {
                id,
                organization_id,
            },
            data: {
                ...updatePhaseDto,
                updated_at: new Date(),
            },
        });
    }

    async remove(user: any, id: string) {
        const { organization_id } = user;

        return this.prisma.phases.deleteMany({
            where: {
                id,
                organization_id,
            },
        });
    }
}
