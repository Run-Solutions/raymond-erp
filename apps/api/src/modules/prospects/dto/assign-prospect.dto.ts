import { IsString, IsOptional } from 'class-validator';

export class AssignProspectDto {
    @IsString()
    @IsOptional()
    assigned_to_id?: string;
}

