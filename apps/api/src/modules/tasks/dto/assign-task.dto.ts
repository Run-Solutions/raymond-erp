import { IsUUID } from 'class-validator';

export class AssignTaskDto {
    @IsUUID()
    assignee_id: string;
}
