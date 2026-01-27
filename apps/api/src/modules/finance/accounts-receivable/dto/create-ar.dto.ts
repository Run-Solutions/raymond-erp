import { IsString, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class CreateAccountReceivableDto {
    @IsString()
    project_id: string;

    @IsString()
    @IsOptional()
    client_id?: string;

    @IsString()
    concepto: string;

    @IsNumber()
    monto: number;

    @IsDateString()
    @IsOptional()
    fecha_vencimiento?: string;

    @IsNumber()
    @IsOptional()
    monto_pagado?: number;

    @IsNumber()
    @IsOptional()
    monto_restante?: number;

    @IsEnum(PaymentStatus)
    @IsOptional()
    status?: PaymentStatus;

    @IsString()
    @IsOptional()
    notas?: string;
}
