import { IsOptional, IsEnum, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { DispatchStatus, UrgencyLevel } from '@prisma/client';

export class QueryDispatchDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @IsOptional()
    @IsEnum(DispatchStatus)
    status?: DispatchStatus;

    @IsOptional()
    @IsEnum(UrgencyLevel)
    urgency_level?: UrgencyLevel;

    @IsOptional()
    @IsString()
    type?: 'sent' | 'received';
}
