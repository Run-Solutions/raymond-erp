import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EditarOcTarifaDto {
  @IsString()
  orden_id: string;

  @IsNumber()
  @Min(0)
  tarifa: number;
}

export class EditarOcDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  orden_ids: string[];

  @IsString()
  periodo: string;

  @IsString()
  po: string;

  @IsOptional()
  @IsString()
  pedido_totvs?: string | null;

  @IsOptional()
  @IsString()
  fecha_pedido_totvs?: string | null;

  @IsOptional()
  @IsString()
  fecha_oc?: string | null;

  @IsOptional()
  @IsIn(['MXN', 'USD'])
  moneda?: 'MXN' | 'USD';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EditarOcTarifaDto)
  tarifas?: EditarOcTarifaDto[];
}
