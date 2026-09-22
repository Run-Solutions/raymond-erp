import { Controller, Post, UseInterceptors, UploadedFile, HttpException, HttpStatus, Req, UseGuards, Query, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CargaMasivaService } from './carga-masiva.service';

@Controller('r4/carga-masiva')
@UseGuards(JwtAuthGuard)
export class CargaMasivaController {
    constructor(private readonly cargaMasivaService: CargaMasivaService) {}

    /**
     * POST /api/r4/carga-masiva
     * Carga completa (Administrador/Gerente): procesa todos los registros del archivo sin restricción de ADC.
     */
    @Post()
    @UseInterceptors(FileInterceptor('file'))
    async uploadFlotillaRentas(@UploadedFile() file: Express.Multer.File, @Req() req: any, @Query('aplicar') aplicar?: string) {
        if (!file) {
            throw new HttpException('No se proporcionó un archivo', HttpStatus.BAD_REQUEST);
        }
        const userId = req.user?.id || 'sistema_importacion';
        const doApply = aplicar === undefined || aplicar === '' ? true : (aplicar === '1' || aplicar === 'true');
        return this.cargaMasivaService.procesarArchivo(file, userId, undefined, doApply);
    }

    /**
     * POST /api/r4/carga-masiva/parcial
     * Carga parcial (ADC): solo procesa registros cuya columna ADC coincida con el nombre del usuario autenticado.
     * Los registros de otros ADCs en el archivo serán ignorados.
     */
    @Post('parcial')
    @UseInterceptors(FileInterceptor('file'))
    async uploadParcial(@UploadedFile() file: Express.Multer.File, @Req() req: any, @Query('aplicar') aplicar?: string) {
        if (!file) {
            throw new HttpException('No se proporcionó un archivo', HttpStatus.BAD_REQUEST);
        }
        const userId = req.user?.id || 'sistema_importacion';
        // Build the ADC name from the authenticated user (supports adc_asociado_name, first/last name, email)
        const userFirstName = req.user?.first_name || req.user?.firstName || '';
        const userLastName = req.user?.last_name || req.user?.lastName || '';
        const fullName = `${userFirstName} ${userLastName}`.trim();
        const adcNombre = req.user?.adc_asociado_name || req.user?.adcAsociadoName || fullName || userFirstName || req.user?.email || '';

        if (!adcNombre) {
            throw new HttpException('No se pudo determinar el nombre del ADC autenticado.', HttpStatus.BAD_REQUEST);
        }

        const doApply = aplicar === undefined || aplicar === '' ? true : (aplicar === '1' || aplicar === 'true');
        return this.cargaMasivaService.procesarArchivo(file, userId, adcNombre, doApply);
    }

    private buildReporteCsv(result: any): string {
        const cols = ['TIPO', 'SERIE', 'RENTA_ID', 'CAMPO', 'ANTERIOR', 'NUEVO', 'MOTIVO', 'DETALLE'];
        const esc = (v: any): string => {
            const s = String(v ?? '');
            return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        };
        const filas = [
            ...result.aplicados.map((a: any) => ['APLICADO', a.serie, a.renta_id, a.campo, a.anterior, a.nuevo, '', a.detalle || '']),
            ...result.excluidos.map((e: any) => ['EXCLUIDO', e.serie, e.renta_id, e.campo, '', '', e.motivo, e.detalle]),
        ];
        return [cols.join(','), ...filas.map(f => f.map(esc).join(','))].join('\n');
    }

    /**
     * POST /api/r4/carga-masiva/actualizar-valores
     * Parche puntual de monedas desde el archivo maestro (CSV/Excel: CLIENTE, SERIE, MONEDA, MONEDA SERVICIO).
     * - Sin ?aplicar (o aplicar=false): dry-run, NO escribe nada en la BD (devuelve reporte JSON).
     * - Con ?aplicar=1: escribe solo condiciones.moneda_pago_distribuidor (y moneda de detalles_renta cuando aplica)
     *   y devuelve como descargable el CSV con APLICADOS (rollback) + EXCLUIDOS.
     */
    @Post('actualizar-valores')
    @UseInterceptors(FileInterceptor('file'))
    async actualizarValores(@UploadedFile() file: Express.Multer.File, @Query('aplicar') aplicar: string, @Res() res: Response) {
        if (!file) {
            throw new HttpException('No se proporcionó un archivo', HttpStatus.BAD_REQUEST);
        }
        const doApply = aplicar === '1' || aplicar === 'true';
        const result = await this.cargaMasivaService.actualizarValores(file, doApply);

        if (!doApply) {
            return res.json({
                success: true,
                dry_run: true,
                mensaje: 'Análisis en seco: no se escribió nada en la BD.',
                total_filas: result.total_filas,
                resumen: result.resumen,
                primeros12_aplicados: result.aplicados.slice(0, 12),
                excluidos: result.excluidos,
                aplicar_para_escribir: 'Re-envía el mismo archivo con ?aplicar=1 para escribir en BD.',
            });
        }

        const csv = this.buildReporteCsv(result);
        res.set({
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="reporte_actualizacion_valores_${new Date().toISOString().slice(0, 10)}.csv"`,
        });
        return res.send('\uFEFF' + csv);
    }
}
