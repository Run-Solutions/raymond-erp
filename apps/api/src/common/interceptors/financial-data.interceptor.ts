import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { hasFinancialAccess } from '../constants/roles.constants';

/**
 * Financial Data Interceptor
 * Layer 5: API Response filtering to remove financial fields
 * 
 * This interceptor automatically removes financial fields from API responses
 * for users without financial access.
 */

const FINANCIAL_FIELDS = [
    'amount',
    'cost',
    'price',
    'salary',
    'budget',
    'revenue',
    'expense',
    'total',
    'subtotal',
    'balance',
    'debit',
    'credit',
    'payment',
    'invoice',
    'wage',
    'compensation',
];

@Injectable()
export class FinancialDataInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        return next.handle().pipe(
            map(data => {
                // If user has financial access, return data as is
                const userRole = user?.role ? (typeof user.roles === 'object' ? user.roles.name : user.roles) : '';
                if (user && hasFinancialAccess(userRole)) {
                    return data;
                }

                // Otherwise, filter financial fields
                return this.removeFinancialFields(data);
            })
        );
    }

    private removeFinancialFields(data: any): any {
        if (!data) return data;

        // Handle arrays
        if (Array.isArray(data)) {
            return data.map(item => this.removeFinancialFields(item));
        }

        // Handle objects
        if (typeof data === 'object') {
            const filtered: any = {};
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    // Skip financial fields
                    if (FINANCIAL_FIELDS.includes(key.toLowerCase())) {
                        continue;
                    }
                    // Recursively filter nested objects
                    filtered[key] = this.removeFinancialFields(data[key]);
                }
            }
            return filtered;
        }

        return data;
    }
}
