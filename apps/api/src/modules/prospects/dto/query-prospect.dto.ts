import { IsOptional, IsString, IsEnum, IsInt, Min, IsDateString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { $Enums } from '@prisma/client';

type ProspectStatus = $Enums.ProspectStatus;
const ProspectStatus = $Enums.ProspectStatus;

export class QueryProspectDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(ProspectStatus)
    status?: ProspectStatus;

    @IsOptional()
    @IsArray()
    @IsEnum(ProspectStatus, { each: true })
    @Type(() => String)
    statuses?: ProspectStatus[];

    @IsOptional()
    @IsString()
    assigned_to_id?: string;

    @IsOptional()
    @IsDateString()
    expected_close_date_from?: string;

    @IsOptional()
    @IsDateString()
    expected_close_date_to?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    limit?: number = 20;
}

