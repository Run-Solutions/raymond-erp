import { IsString, IsOptional, IsNumber, IsDateString, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PurchaseOrderStatus } from '@prisma/client';

export class CreatePurchaseOrderDto {
    @IsString()
    folio: string;

    @IsString()
    description: string;

    @IsNumber()
    amount: number;

    @IsBoolean()
    @IsOptional()
    includesVAT?: boolean;

    @IsString()
    @IsOptional()
    supplier_id?: string;

    @IsString()
    @IsOptional()
    project_id?: string;

    @IsDateString()
    minPaymentDate: string;

    @IsDateString()
    maxPaymentDate: string;

    @IsString()
    @IsOptional()
    comments?: string;

    @Transform(({ value }) => {
        // Transform empty strings, null, or undefined to undefined
        if (value === '' || value === null || value === undefined) {
            return undefined;
        }
        return value;
    })
    @IsEnum(PurchaseOrderStatus, {
        message: 'status must be one of the following values: DRAFT, PENDING, APPROVED, REJECTED, PAID'
    })
    @IsOptional()
    status?: PurchaseOrderStatus;
}
