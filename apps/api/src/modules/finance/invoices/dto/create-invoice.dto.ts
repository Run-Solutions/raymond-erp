import { IsString, IsOptional, IsNumber, IsDateString, IsEnum, IsObject } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class CreateInvoiceDto {
    @IsString()
    number: string;

    @IsString()
    @IsOptional()
    client_id?: string;

    @IsNumber()
    amount: number;

    @IsDateString()
    due_date: string;

    @IsEnum(InvoiceStatus)
    @IsOptional()
    status?: InvoiceStatus;

    @IsDateString()
    @IsOptional()
    issueDate?: string;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsNumber()
    @IsOptional()
    subtotal?: number;

    @IsNumber()
    @IsOptional()
    tax?: number;

    @IsNumber()
    @IsOptional()
    total?: number;

    @IsString()
    @IsOptional()
    cfdiUuid?: string;

    @IsString()
    @IsOptional()
    cfdiUrl?: string;

    @IsString()
    @IsOptional()
    pdf_url?: string;

    @IsString()
    @IsOptional()
    paymentForm?: string;

    @IsString()
    @IsOptional()
    paymentMethod?: string;

    @IsString()
    @IsOptional()
    usoCfdi?: string;

    @IsObject()
    @IsOptional()
    documents?: any;
}
