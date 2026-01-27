import { IsString, IsOptional, IsNumber, IsDateString, IsEnum, IsBoolean } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class CreateAccountPayableDto {
    @IsString()
    @IsOptional()
    supplier_id?: string;

    @IsString()
    @IsOptional()
    category_id?: string;

    @IsString()
    concepto: string;

    @IsNumber()
    monto: number;

    @IsDateString()
    @IsOptional()
    fecha_vencimiento?: string;

    @IsEnum(PaymentStatus)
    @IsOptional()
    status?: PaymentStatus;

    @IsBoolean()
    @IsOptional()
    pagado?: boolean;

    @IsDateString()
    @IsOptional()
    fecha_pago?: string;

    @IsString()
    @IsOptional()
    formaPago?: string;

    @IsString()
    @IsOptional()
    referenciaPago?: string;

    @IsString()
    @IsOptional()
    facturaUrl?: string;

    @IsString()
    @IsOptional()
    comprobanteUrl?: string;

    @IsString()
    @IsOptional()
    notas?: string;
}
