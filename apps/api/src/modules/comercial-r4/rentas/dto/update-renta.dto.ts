import { IsString, IsOptional, IsNumber, IsBoolean, IsDateString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDetallesRentaDto {
    @IsString()
    @IsOptional()
    periodo_cobro?: string;

    @IsString()
    @IsOptional()
    mes_cobro?: string;

    @IsString()
    @IsOptional()
    oc_cliente?: string;

    @IsString()
    @IsOptional()
    tipo_renta?: string;

    @IsString()
    @IsOptional()
    moneda?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    renta_base?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    renta_real?: number;

    @IsString()
    @IsOptional()
    comentarios?: string;

    @IsBoolean()
    @IsOptional()
    mantenimiento?: boolean;

    @IsNumber()
    @IsOptional()
    @Min(0)
    pago_mantenimiento?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    descuento_dias_caidos?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    importe_recuperado?: number;
}

export class UpdateRentaDto {
    @IsString()
    @IsOptional()
    cuenta?: string;

    @IsString()
    @IsOptional()
    adc?: string;

    @IsString()
    @IsOptional()
    distribuidor?: string;

    @IsString()
    @IsOptional()
    no_registro_totvs?: string;

    @IsDateString()
    @IsOptional()
    fecha_recepcion?: string;

    @IsDateString()
    @IsOptional()
    fecha_pedido_totvs?: string;

    @IsDateString()
    @IsOptional()
    fecha_inicio?: string;

    @IsDateString()
    @IsOptional()
    fecha_fin?: string;

    @IsString()
    @IsOptional()
    estado?: string;

    // Estatus del equipo (tabla activos), no confundir con Renta.estado
    // Valores: Activo | Inactivo | Back Up | Inactivo con Cliente | Por Entregar | Por Retirar
    @IsString()
    @IsOptional()
    estatus?: string;
}
