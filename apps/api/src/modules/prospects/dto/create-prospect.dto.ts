import { IsString, IsOptional, IsEmail, IsEnum, IsInt, Min, Max, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { $Enums } from '@prisma/client';

type ProspectStatus = $Enums.ProspectStatus;
const ProspectStatus = $Enums.ProspectStatus;

export class CreateProspectDto {
    @IsString()
    nombre: string;

    @IsString()
    @IsOptional()
    rfc?: string;

    @IsString()
    @IsOptional()
    direccion?: string;

    @IsString()
    @IsOptional()
    telefono?: string;

    @IsString()
    @IsOptional()
    country_code?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    contacto?: string;

    @IsEnum(ProspectStatus)
    @IsOptional()
    status?: ProspectStatus;

    @IsString()
    @IsOptional()
    source?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    @Type(() => Number)
    estimated_value?: number;

    @IsInt()
    @Min(0)
    @Max(100)
    @IsOptional()
    probability?: number;

    @IsDateString()
    @IsOptional()
    expected_close_date?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsString()
    @IsOptional()
    assigned_to_id?: string;
}

