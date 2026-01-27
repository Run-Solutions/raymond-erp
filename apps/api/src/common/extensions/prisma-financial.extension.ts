import { PrismaClient } from '@prisma/client';
import { hasFinancialAccess } from '../constants/roles.constants';

/**
 * Financial Security Extension for Prisma
 * Layer 1: Database-level blocking of financial queries
 * 
 * This extension prevents unauthorized roles from accessing financial data
 * at the database query level.
 */

const FINANCIAL_MODELS = [
    'Account',
    'JournalEntry',
    'JournalLine',
    'Invoice',
    // Add future financial models here
];

export const prismaFinancialExtension = (prisma: PrismaClient, getCurrentUser?: () => any) => {
    return prisma.$extends({
        query: {
            // Apply to all financial models
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    // Only apply to financial models
                    if (!FINANCIAL_MODELS.includes(model)) {
                        return query(args);
                    }

                    // Get current user from context
                    const user = getCurrentUser?.();

                    if (!user) {
                        // If no user context, allow (for system operations)
                        return query(args);
                    }

                    // Check if user has financial access
                    const userRole = typeof user.roles === 'object' ? user.roles.name : user.roles;
                    const hasAccess = hasFinancialAccess(userRole);

                    if (!hasAccess) {
                        throw new Error(`Access Denied: Financial data access restricted for role '${userRole}'`);
                    }

                    // User has access, proceed with query
                    return query(args);
                },
            },
        },
    });
};
