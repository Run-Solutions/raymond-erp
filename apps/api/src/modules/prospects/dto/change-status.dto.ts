import { IsEnum } from 'class-validator';
import { $Enums } from '@prisma/client';

type ProspectStatus = $Enums.ProspectStatus;
const ProspectStatus = $Enums.ProspectStatus;

export class ChangeStatusDto {
    @IsEnum(ProspectStatus)
    status: ProspectStatus;
}

