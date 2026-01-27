import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AccountType } from '@prisma/client';

@Injectable()
export class FinanceReportsService {
    constructor(private readonly prisma: PrismaService) {}

    async trialBalance(organization_id: string, asOfDate?: string) {
        const accounts = await this.prisma.accounts.findMany({
            where: { organization_id },
            include: {
                debitEntries: true,
                creditEntries: true,
            },
            orderBy: [{ type: 'asc' }, { code: 'asc' }],
        });

        const balances = await Promise.all(
            accounts.map(async (account) => {
                let whereClause: any = {};

                if (asOfDate) {
                    whereClause = {
                        journalEntry: {
                            date: { lte: new Date(asOfDate) },
                        },
                    };
                }

                const [debits, credits] = await Promise.all([
                    this.prisma.journal_lines.aggregate({
                        where: {
                            debit_account_id: account.id, // Fixed: snake_case
                            ...whereClause,
                        },
                        _sum: { amount: true },
                    }),
                    this.prisma.journal_lines.aggregate({
                        where: {
                            credit_account_id: account.id, // Fixed: snake_case
                            ...whereClause,
                        },
                        _sum: { amount: true },
                    }),
                ]);

                const debitTotal = Number(debits._sum.amount || 0);
                const creditTotal = Number(credits._sum.amount || 0);

                return {
                    accountId: account.id,
                    accountCode: account.code,
                    accountName: account.name,
                    accountType: account.type,
                    debit: debitTotal,
                    credit: creditTotal,
                };
            }),
        );

        const totalDebits = balances.reduce((sum, b) => sum + b.debit, 0);
        const totalCredits = balances.reduce((sum, b) => sum + b.credit, 0);

        return {
            asOfDate: asOfDate || new Date().toISOString(),
            accounts: balances,
            totals: {
                debits: totalDebits,
                credits: totalCredits,
                balanced: Math.abs(totalDebits - totalCredits) < 0.01,
            },
        };
    }

    async incomeStatement(organization_id: string, start_date: string, endDate: string) {
        const accounts = await this.prisma.accounts.findMany({
            where: {
                organization_id,
                OR: [{ type: 'REVENUE' }, { type: 'EXPENSE' }],
            },
            include: {
                debitEntries: {
                    where: {
                        journalEntry: {
                            date: {
                                gte: new Date(start_date),
                                lte: new Date(endDate),
                            },
                        },
                    },
                },
                creditEntries: {
                    where: {
                        journalEntry: {
                            date: {
                                gte: new Date(start_date),
                                lte: new Date(endDate),
                            },
                        },
                    },
                },
            },
            orderBy: { code: 'asc' },
        });

        const revenues: any[] = [];
        const expenses: any[] = [];
        let totalRevenue = 0;
        let totalExpense = 0;

        for (const account of accounts) {
            const debits = account.debitEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
            const credits = account.creditEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);

            const balance = account.type === 'REVENUE' ? credits - debits : debits - credits;

            if (account.type === 'REVENUE') {
                revenues.push({
                    accountId: account.id,
                    accountCode: account.code,
                    accountName: account.name,
                    amount: balance,
                });
                totalRevenue += balance;
            } else {
                expenses.push({
                    accountId: account.id,
                    accountCode: account.code,
                    accountName: account.name,
                    amount: balance,
                });
                totalExpense += balance;
            }
        }

        const netIncome = totalRevenue - totalExpense;

        return {
            period: {
                start_date,
                endDate,
            },
            revenues,
            expenses,
            totals: {
                revenue: totalRevenue,
                expense: totalExpense,
                netIncome,
            },
        };
    }

    async balanceSheet(organization_id: string, asOfDate: string) {
        const accounts = await this.prisma.accounts.findMany({
            where: {
                organization_id,
                OR: [{ type: 'ASSET' }, { type: 'LIABILITY' }, { type: 'EQUITY' }],
            },
            include: {
                debitEntries: {
                    where: {
                        journalEntry: {
                            date: { lte: new Date(asOfDate) },
                        },
                    },
                },
                creditEntries: {
                    where: {
                        journalEntry: {
                            date: { lte: new Date(asOfDate) },
                        },
                    },
                },
            },
            orderBy: [{ type: 'asc' }, { code: 'asc' }],
        });

        const assets: any[] = [];
        const liabilities: any[] = [];
        const equity: any[] = [];
        let totalAssets = 0;
        let totalLiabilities = 0;
        let totalEquity = 0;

        for (const account of accounts) {
            const debits = account.debitEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
            const credits = account.creditEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);

            let balance = 0;
            if (account.type === 'ASSET') {
                balance = debits - credits;
            } else {
                balance = credits - debits;
            }

            const item = {
                accountId: account.id,
                accountCode: account.code,
                accountName: account.name,
                amount: balance,
            };

            if (account.type === 'ASSET') {
                assets.push(item);
                totalAssets += balance;
            } else if (account.type === 'LIABILITY') {
                liabilities.push(item);
                totalLiabilities += balance;
            } else {
                equity.push(item);
                totalEquity += balance;
            }
        }

        return {
            asOfDate,
            assets,
            liabilities,
            equity,
            totals: {
                assets: totalAssets,
                liabilities: totalLiabilities,
                equity: totalEquity,
                balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
            },
        };
    }

    async ledger(organization_id: string, accountId: string, start_date?: string, endDate?: string) {
        const account = await this.prisma.accounts.findFirst({
            where: { id: accountId, organization_id },
        });

        if (!account) {
            throw new Error('Account not found');
        }

        const whereClause: any = {};
        if (start_date || endDate) {
            whereClause.journalEntry = {
                date: {},
            };
            if (start_date) whereClause.journalEntry.date.gte = new Date(start_date);
            if (endDate) whereClause.journalEntry.date.lte = new Date(endDate);
        }

        const [debitEntries, creditEntries] = await Promise.all([
            this.prisma.journal_lines.findMany({
                where: {
                    debit_account_id: accountId, // Fixed: snake_case
                    ...whereClause,
                },
                include: {
                    journalEntry: true,
                    creditAccount: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                },
                orderBy: {
                    journalEntry: {
                        date: 'asc',
                    },
                },
            }),
            this.prisma.journal_lines.findMany({
                where: {
                    credit_account_id: accountId, // Fixed: snake_case
                    ...whereClause,
                },
                include: {
                    journalEntry: true,
                    debitAccount: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                },
                orderBy: {
                    journalEntry: {
                        date: 'asc',
                    },
                },
            }),
        ]);

        const transactions = [
            ...debitEntries.map((entry) => ({
                date: entry.journalEntry.date,
                description: entry.journalEntry.description,
                reference: entry.journalEntry.reference,
                debit: Number(entry.amount),
                credit: 0,
                contraAccount: entry.creditAccount,
            })),
            ...creditEntries.map((entry) => ({
                date: entry.journalEntry.date,
                description: entry.journalEntry.description,
                reference: entry.journalEntry.reference,
                debit: 0,
                credit: Number(entry.amount),
                contraAccount: entry.debitAccount,
            })),
        ].sort((a, b) => a.date.getTime() - b.date.getTime());

        let runningBalance = 0;
        const ledgerEntries = transactions.map((txn) => {
            if (account.type === 'ASSET' || account.type === 'EXPENSE') {
                runningBalance += txn.debit - txn.credit;
            } else {
                runningBalance += txn.credit - txn.debit;
            }

            return {
                ...txn,
                balance: runningBalance,
            };
        });

        return {
            account: {
                id: account.id,
                code: account.code,
                name: account.name,
                type: account.type,
            },
            period: {
                start_date: start_date || null,
                endDate: endDate || null,
            },
            entries: ledgerEntries,
            finalBalance: runningBalance,
        };
    }

    async cashflow(organization_id: string, start_date: string, endDate: string) {
        // Get all cash/bank accounts (ASSET accounts with "cash" or "bank" in name)
        const cashAccounts = await this.prisma.accounts.findMany({
            where: {
                organization_id,
                type: 'ASSET',
                OR: [
                    { name: { contains: 'cash', mode: 'insensitive' } },
                    { name: { contains: 'bank', mode: 'insensitive' } },
                ],
            },
        });

        const cashAccountIds = cashAccounts.map((acc) => acc.id);

        const [inflows, outflows] = await Promise.all([
            this.prisma.journal_lines.findMany({
                where: {
                    debit_account_id: { in: cashAccountIds }, // Fixed: snake_case
                    journalEntry: {
                        date: {
                            gte: new Date(start_date),
                            lte: new Date(endDate),
                        },
                    },
                },
                include: {
                    journalEntry: true,
                    debitAccount: true,
                },
            }),
            this.prisma.journal_lines.findMany({
                where: {
                    credit_account_id: { in: cashAccountIds }, // Fixed: snake_case
                    journalEntry: {
                        date: {
                            gte: new Date(start_date),
                            lte: new Date(endDate),
                        },
                    },
                },
                include: {
                    journalEntry: true,
                    creditAccount: true,
                },
            }),
        ]);

        const totalInflows = inflows.reduce((sum, entry) => sum + Number(entry.amount), 0);
        const totalOutflows = outflows.reduce((sum, entry) => sum + Number(entry.amount), 0);
        const netCashflow = totalInflows - totalOutflows;

        return {
            period: {
                start_date,
                endDate,
            },
            inflows: inflows.map((entry) => ({
                date: entry.journalEntry.date,
                description: entry.journalEntry.description,
                amount: Number(entry.amount),
                account: entry.debitAccount.name,
            })),
            outflows: outflows.map((entry) => ({
                date: entry.journalEntry.date,
                description: entry.journalEntry.description,
                amount: Number(entry.amount),
                account: entry.creditAccount.name,
            })),
            summary: {
                totalInflows,
                totalOutflows,
                netCashflow,
            },
        };
    }
}
