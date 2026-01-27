import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
    @ApiProperty({ example: 'Project Manager', description: 'Role name' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Manages projects and teams', description: 'Role description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: false, description: 'Is system role', required: false, default: false })
    @IsBoolean()
    @IsOptional()
    is_system?: boolean;

    @ApiProperty({ example: 50, description: 'Role level (1-100)', required: false, default: 1 })
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(100)
    level?: number;

    @ApiProperty({ example: 'Management', description: 'Role category', required: false })
    @IsString()
    @IsOptional()
    category?: string;
}
