import { IsEnum, IsOptional, IsDateString, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryProjectDto {
    @ApiPropertyOptional({ enum: ProjectStatus, description: 'Filter by project status' })
    @IsEnum(ProjectStatus)
    @IsOptional()
    status?: ProjectStatus;

    @ApiPropertyOptional({ description: 'Filter projects starting after this date' })
    @IsDateString()
    @IsOptional()
    start_dateFrom?: string;

    @ApiPropertyOptional({ description: 'Filter projects starting before this date' })
    @IsDateString()
    @IsOptional()
    start_dateTo?: string;

    @ApiPropertyOptional({ description: 'Filter projects ending after this date' })
    @IsDateString()
    @IsOptional()
    endDateFrom?: string;

    @ApiPropertyOptional({ description: 'Filter projects ending before this date' })
    @IsDateString()
    @IsOptional()
    endDateTo?: string;

    @ApiPropertyOptional({ description: 'Search by name or description' })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
    @IsInt()
    @Min(1)
    @Type(() => Number)
    @IsOptional()
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1 })
    @IsInt()
    @Min(1)
    @Type(() => Number)
    @IsOptional()
    limit?: number = 20;
}
