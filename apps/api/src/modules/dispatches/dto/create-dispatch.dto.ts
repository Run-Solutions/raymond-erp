import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { UrgencyLevel } from '@prisma/client';

export class CreateDispatchDto {
    @IsString()
    @IsNotEmpty()
    content: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    link?: string;

    @IsUUID()
    @IsNotEmpty()
    recipient_id: string;

    @IsEnum(UrgencyLevel)
    @IsOptional()
    urgency_level?: UrgencyLevel;

    @IsDateString()
    @IsOptional()
    due_date?: string;
}
