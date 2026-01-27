import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryPhaseDto {
    @ApiPropertyOptional({ example: 'Planning', description: 'Search by name' })
    @IsString()
    @IsOptional()
    search?: string;
}
