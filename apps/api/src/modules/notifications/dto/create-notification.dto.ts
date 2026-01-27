import { IsString, IsEnum, IsOptional, IsUUID, IsObject } from 'class-validator';
import { NotificationType } from '../types/notification-type.enum';

export class CreateNotificationDto {
    @IsUUID()
    user_id: string;

    @IsString()
    title: string;

    @IsString()
    message: string;

    @IsEnum(NotificationType)
    type: NotificationType;

    @IsString()
    @IsOptional()
    link?: string;

    @IsUUID()
    @IsOptional()
    organization_id?: string;

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}

