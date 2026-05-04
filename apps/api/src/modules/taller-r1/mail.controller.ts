import { Controller, Post, Body } from '@nestjs/common';
import { TallerR1MailService } from './mail.service';
import { Public } from '../../common/decorators/public.decorator';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class SendDocumentsDto {
    @IsString()
    @IsIn(['Entrada', 'Salida'])
    tipo: 'Entrada' | 'Salida';

    @IsString()
    folio: string;

    @IsString()
    fecha: string;

    @IsString()
    @IsOptional()
    site?: string;

    @IsString()
    @IsOptional()
    pdfBase64?: string;

    @IsString()
    @IsOptional()
    excelBase64?: string;

    @IsString()
    @IsOptional()
    remision?: string;
}

export class SendRefaccionesDto {
    @IsString()
    serial_equipo: string;

    @IsString()
    excelBase64: string;
}

@Public()
@Controller('taller-r1/mail')
export class TallerR1MailController {
    constructor(private readonly mailService: TallerR1MailService) {}

    @Post('entradas-salidas')
    async sendDocuments(@Body() data: SendDocumentsDto) {
        await this.mailService.sendEntradaSalidaEmail(data);
        return { success: true, message: 'Email sent successfully' };
    }

    @Post('refacciones')
    async sendRefacciones(@Body() data: SendRefaccionesDto) {
        await this.mailService.sendRefaccionesEmail(data);
        return { success: true, message: 'Email sent successfully' };
    }
}
