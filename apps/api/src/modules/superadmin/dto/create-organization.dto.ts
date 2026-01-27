import { IsString, IsEmail, IsOptional, MinLength, Matches } from 'class-validator';

export class CreateOrganizationDto {
    @IsString()
    @MinLength(2)
    name: string;

    @IsString()
    @Matches(/^[a-z0-9-]+$/, {
        message: 'Slug must contain only lowercase letters, numbers, and hyphens',
    })
    @IsOptional()
    slug?: string;

    @IsEmail()
    adminEmail: string;

    @IsString()
    @MinLength(2)
    adminFirstName: string;

    @IsString()
    @MinLength(2)
    adminLastName: string;

    @IsString()
    @MinLength(8)
    adminPassword: string;
}
