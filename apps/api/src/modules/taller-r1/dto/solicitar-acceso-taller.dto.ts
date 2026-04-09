import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SolicitarAccesoTallerDto {
    @IsEmail({}, { message: 'Dirección de correo inválida' })
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    password: string;

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    sitio: string; // R1, R2, R3
}
