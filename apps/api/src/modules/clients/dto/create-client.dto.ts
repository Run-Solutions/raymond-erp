import { IsString, IsOptional, IsEmail, IsBoolean } from 'class-validator';

export class CreateClientDto {
    @IsString()
    nombre: string;

    @IsString()
    @IsOptional()
    run_cliente?: string;

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

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}
