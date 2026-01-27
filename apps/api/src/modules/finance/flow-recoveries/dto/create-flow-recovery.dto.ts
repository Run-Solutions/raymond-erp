
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateFlowRecoveryDto {
    @IsString()
    client_id: string;

    @IsString()
    periodo: string;

    @IsNumber()
    montoInicial: number;

    @IsNumber()
    recuperacionesReales: number;

    @IsNumber()
    porcentajeRecuperado: number;

    @IsString()
    @IsOptional()
    notas?: string;
}
