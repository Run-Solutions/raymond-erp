import { IsString, IsEnum, IsOptional, IsUUID, IsNumber, IsDateString, Min } from 'class-validator';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class CreateTaskDto {
    @IsString()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(TaskStatus)
    @IsOptional()
    status?: TaskStatus;

    @IsEnum(TaskPriority)
    @IsOptional()
    priority?: TaskPriority;

    @IsUUID()
    project_id: string;

    @IsUUID()
    @IsOptional()
    sprint_id?: string;

    @IsUUID()
    @IsOptional()
    assignee_id?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    position?: number;

    @IsDateString()
    @IsOptional()
    due_date?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    estimatedHours?: number;

    @IsString()
    @IsOptional()
    driveLink?: string;

    @IsString()
    @IsOptional()
    initialComment?: string;
}
