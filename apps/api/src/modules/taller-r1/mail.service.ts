import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class TallerR1MailService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(TallerR1MailService.name);

    constructor(private configService: ConfigService) {
        // Inicianalizar transporter con configuración de .env (Pendiente de definir por el usuario)
        const host = this.configService.get<string>('SMTP_HOST');
        const port = this.configService.get<number>('SMTP_PORT');
        const user = this.configService.get<string>('SMTP_USER');
        const pass = this.configService.get<string>('SMTP_PASS');

        if (host && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
            });
            this.logger.log('Mail storage initialized successfully');
        } else {
            this.logger.warn('SMTP configuration missing. Mails will be logged but not sent.');
        }
    }

    async sendRenovadoCompletionEmail(data: {
        serial: string,
        solicitud_id: string,
        tecnico: string,
        fecha: Date,
        cliente?: string
    }) {
        const subject = `Renovado Finalizado - Equipo ${data.serial}`;
        const html = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #e11d48; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Renovado Completado</h1>
        </div>
        <div style="padding: 30px;">
          <p>Se ha finalizado el proceso de renovación para el siguiente equipo:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Serial:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.serial}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Cliente:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.cliente || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Técnico Responsable:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.tecnico}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Fecha de Finalización:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.fecha.toLocaleString()}</td>
            </tr>
          </table>
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            El equipo ha sido liberado en el stock con estado <strong>Stock renovado</strong>.
          </p>
        </div>
        <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #999;">
          &copy; ${new Date().getFullYear()} Raymond ERP - Taller R1
        </div>
      </div>
    `;

        if (this.transporter) {
            try {
                await this.transporter.sendMail({
                    from: `"Raymond Taller R1" <${this.configService.get('SMTP_USER')}>`,
                    to: this.configService.get('NOTIFICATION_EMAILS') || 'admin@raymond.com',
                    subject,
                    html,
                });
                this.logger.log(`Completion email sent for ${data.serial}`);
            } catch (error: any) {
                this.logger.error(`Failed to send email for ${data.serial}: ${error.message}`);
            }
        } else {
            this.logger.log(`[DRY RUN] Email would be sent for ${data.serial}`);
            this.logger.debug(html);
        }
    }
}
