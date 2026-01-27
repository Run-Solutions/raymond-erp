import { IsOptional, IsUUID, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySprintDto {
    @IsUUID()
    @IsOptional()
    project_id?: string;

    @IsDateString()
    @IsOptional()
    start_dateFrom?: string;

    @IsDateString()
    @IsOptional()
    start_dateTo?: string;

    @IsInt()
    @Min(1)
    @Type(() => Number)
    @IsOptional()
    page?: number = 1;

    @IsInt()
    @Min(1)
    @Type(() => Number)
    @IsOptional()
    limit?: number = 20;
}
