import { IsString, IsNotEmpty, Matches, MinLength } from 'class-validator';

export class SetupPasswordDto {
    @IsString()
    @IsNotEmpty()
    setupToken: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, { message: 'La contraseña debe contener al menos una mayúscula y un número' })
    password: string;
}