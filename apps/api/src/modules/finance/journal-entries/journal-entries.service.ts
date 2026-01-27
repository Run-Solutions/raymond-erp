import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class JournalEntriesService {
    constructor(private readonly prisma: PrismaService) {}

    async create(organization_id: string, createJournalEntryDto: CreateJournalEntryDto) {
        const { journal_lines, ...entryData } = createJournalEntryDto;

        if (!journal_lines || journal_lines.length === 0) {
            throw new BadRequestException('Journal entry must have at least one line');
        }

        // Validate all accounts exist and belong to organization
        const accountIds = new Set<string>();
        journal_lines.forEach((line) => {
            accountIds.add(line.debit_account_id);
            accountIds.add(line.credit_account_id);
        });

        const accounts = await this.prisma.accounts.findMany({
            where: {
                id: { in: Array.from(accountIds) },
                organization_id,
            },
        });

        if (accounts.length !== accountIds.size) {
            throw new BadRequestException('One or more accounts not found');
        }

        // Create journal entry with lines in a transaction
        return this.prisma.$transaction(async (prisma) => {
            const entryId = randomUUID();
            const entry = await prisma.journal_entries.create({
                data: {
                    id: entryId,
                    ...entryData,
                    organization_id,
                } as any,
            });

            // Create journal lines
            const journalLines = await Promise.all(
                journal_lines.map((line) =>
                    prisma.journal_lines.create({
                        data: {
                            id: randomUUID(),
                            journal_entry_id: entry.id,
                            debit_account_id: line.debit_account_id,
                            credit_account_id: line.credit_account_id,
                            amount: line.amount,
                        },
                    }),
                ),
            );

            // Update account balances
            for (const line of journal_lines) {
                await prisma.accounts.update({
                    where: { id: line.debit_account_id },
                    data: {
                        balance: { increment: line.amount },
                    },
                });

                await prisma.accounts.update({
                    where: { id: line.credit_account_id },
                    data: {
                        balance: { decrement: line.amount },
                    },
                });
            }

            return prisma.journal_entries.findUnique({
                where: { id: entry.id },
                include: {
                    journal_lines: true,
                },
            });
        });
    }

    async findAll(organization_id: string, start_date?: string, endDate?: string) {
        const where: any = {
            organization_id,
        };

        if (start_date || endDate) {
            where.date = {};
            if (start_date) where.date.gte = new Date(start_date);
            if (endDate) where.date.lte = new Date(endDate);
        }

        return this.prisma.journal_entries.findMany({
            where,
            include: {
                journal_lines: true,
            },
            orderBy: {
                date: 'desc',
            },
        });
    }

    async findOne(id: string, organization_id: string) {
        const entry = await this.prisma.journal_entries.findFirst({
            where: {
                id,
                organization_id,
            },
            include: {
                journal_lines: true,
            },
        });

        if (!entry) {
            throw new NotFoundException('Journal entry not found');
        }

        return entry;
    }

    async update(id: string, organization_id: string, updateJournalEntryDto: UpdateJournalEntryDto) {
        const entry = await this.findOne(id, organization_id);

        if (entry.is_locked) {
            throw new ConflictException('Cannot update a locked journal entry');
        }

        return this.prisma.journal_entries.update({
            where: { id },
            data: updateJournalEntryDto,
            include: {
                journal_lines: true,
            },
        });
    }

    async lock(id: string, organization_id: string) {
        await this.findOne(id, organization_id);

        return this.prisma.journal_entries.update({
            where: { id },
            data: {
                is_locked: true,
            },
        });
    }

    async remove(id: string, organization_id: string) {
        const entry = await this.findOne(id, organization_id);

        if (entry.is_locked) {
            throw new ConflictException('Cannot delete a locked journal entry');
        }

        // Reverse account balances and delete entry
        return this.prisma.$transaction(async (prisma) => {
            // Reverse balances
            for (const line of entry.journal_lines) {
                await prisma.accounts.update({
                    where: { id: line.debit_account_id },
                    data: {
                        balance: { decrement: line.amount },
                    },
                });

                await prisma.accounts.update({
                    where: { id: line.credit_account_id },
                    data: {
                        balance: { increment: line.amount },
                    },
                });
            }

            // Delete journal entry (cascade will delete lines)
            await prisma.journal_entries.delete({
                where: { id },
            });
        });
    }

    async validateBalance(createJournalEntryDto: CreateJournalEntryDto): Promise<boolean> {
        const { journal_lines } = createJournalEntryDto;

        const totalDebits = journal_lines.reduce((sum, line) => sum + line.amount, 0);
        const totalCredits = journal_lines.reduce((sum, line) => sum + line.amount, 0);

        return totalDebits === totalCredits;
    }
}
