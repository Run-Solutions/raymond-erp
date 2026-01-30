import { IsNotEmpty, IsString } from 'class-validator';

export class LoginTallerDto {
    @IsString()
    @IsNotEmpty()
    username: string; // Can be email or Usuario

    @IsString()
    @IsNotEmpty()
    password: string;
}
