import { IsString, IsOptional, IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePhaseDto {
    @ApiProperty({ example: 'Planning', description: 'The name of the phase' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ example: 'Initial planning and requirements gathering', description: 'Description of the phase' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ example: '#3B82F6', description: 'Hex color for the phase' })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiPropertyOptional({ example: 1, description: 'Order of the phase' })
    @IsInt()
    @IsOptional()
    order?: number;
}
