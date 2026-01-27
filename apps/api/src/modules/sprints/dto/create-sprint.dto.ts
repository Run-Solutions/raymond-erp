import { IsString, IsDateString, IsOptional, IsUUID, IsArray } from 'class-validator';

export class CreateSprintDto {
    @IsString()
    name: string;

    @IsUUID()
    project_id: string;

    @IsDateString()
    start_date: string;

    @IsDateString()
    end_date: string;

    @IsString()
    @IsOptional()
    goal?: string;

    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    memberIds?: string[];
}
