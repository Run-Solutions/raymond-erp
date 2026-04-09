import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, IsOptional } from 'class-validator';

export class SolicitarAccesoDto {
    @IsEmail({}, { message: 'Dirección de correo inválida' })
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, { message: 'La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales' })
    password: string;

    @IsString()
    @IsNotEmpty()
    first_name: string;

    @IsString()
    @IsNotEmpty()
    last_name: string;

    @IsString()
    @IsNotEmpty()
    ubicacion: string; // Sitio (R1, R2, R3, etc.)
}
