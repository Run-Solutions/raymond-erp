import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountType } from '@prisma/client';

@Injectable()
export class AccountsService {
    constructor(private readonly prisma: PrismaService) {}

    async create(organization_id: string, createAccountDto: CreateAccountDto) {
        // Check if code already exists
        const existing = await this.prisma.accounts.findFirst({
            where: {
                code: createAccountDto.code,
                organization_id,
            },
        });

        if (existing) {
            throw new ConflictException('Account code already exists');
        }

        return this.prisma.accounts.create({
            data: {
                id: require('crypto').randomUUID(),
                ...createAccountDto,
                organization_id,
            } as any,
        });
    }

    async findAll(organization_id: string, type?: AccountType) {
        const where: any = {
            organization_id,
        };

        if (type) {
            where.type = type;
        }

        return this.prisma.accounts.findMany({
            where,
            orderBy: [{ type: 'asc' }, { code: 'asc' }],
            include: {
                _count: {
                    select: {
                        debitEntries: true,
                        creditEntries: true,
                    },
                },
            },
        });
    }

    async findOne(id: string, organization_id: string) {
        const account = await this.prisma.accounts.findFirst({
            where: {
                id,
                organization_id,
            },
            include: {
                debitEntries: {
                    include: {
                        journalEntry: true,
                    },
                    orderBy: {
                        journalEntry: {
                            date: 'desc',
                        },
                    },
                    take: 10,
                },
                creditEntries: {
                    include: {
                        journalEntry: true,
                    },
                    orderBy: {
                        journalEntry: {
                            date: 'desc',
                        },
                    },
                    take: 10,
                },
            },
        });

        if (!account) {
            throw new NotFoundException('Account not found');
        }

        return account;
    }

    async update(id: string, organization_id: string, updateAccountDto: UpdateAccountDto) {
        await this.findOne(id, organization_id);

        if (updateAccountDto.code) {
            const existing = await this.prisma.accounts.findFirst({
                where: {
                    code: updateAccountDto.code,
                    organization_id,
                    id: { not: id },
                },
            });

            if (existing) {
                throw new ConflictException('Account code already exists');
            }
        }

        return this.prisma.accounts.update({
            where: { id },
            data: updateAccountDto,
        });
    }

    async remove(id: string, organization_id: string) {
        const account = await this.findOne(id, organization_id);

        // Check if account has transactions
        const hasTransactions =
            (await this.prisma.journal_lines.count({
                where: {
                    OR: [{ debit_account_id: id }, { credit_account_id: id }], // Fixed: snake_case
                },
            })) > 0;

        if (hasTransactions) {
            throw new ConflictException('Cannot delete account with existing transactions');
        }

        return this.prisma.accounts.delete({
            where: { id },
        });
    }

    async getBalance(id: string, organization_id: string) {
        const account = await this.findOne(id, organization_id);

        const [debits, credits] = await Promise.all([
            this.prisma.journal_lines.aggregate({
                where: { debit_account_id: id }, // Fixed: snake_case
                _sum: { amount: true },
            }),
            this.prisma.journal_lines.aggregate({
                where: { credit_account_id: id }, // Fixed: snake_case
                _sum: { amount: true },
            }),
        ]);

        const debitTotal = debits._sum.amount || 0;
        const creditTotal = credits._sum.amount || 0;

        // Balance calculation based on account type
        let balance = 0;
        if (account.type === 'ASSET' || account.type === 'EXPENSE') {
            balance = Number(debitTotal) - Number(creditTotal);
        } else {
            balance = Number(creditTotal) - Number(debitTotal);
        }

        return {
            accountId: id,
            accountName: account.name,
            accountType: account.type,
            balance,
            debitTotal: Number(debitTotal),
            creditTotal: Number(creditTotal),
        };
    }
}
