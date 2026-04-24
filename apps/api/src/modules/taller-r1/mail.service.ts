import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TallerR1MailService {
    private readonly logger = new Logger(TallerR1MailService.name);
    private readonly resendApiKey: string;
    private readonly resendFrom: string;
    private readonly baseUrl = 'https://api.resend.com';

    constructor(private configService: ConfigService) {
        this.resendApiKey = this.configService.get<string>('RESEND_API_KEY');
        this.resendFrom = this.configService.get<string>('RESEND_FROM_EMAIL') || 'Raymond ERP <onboarding@resend.dev>';

        if (this.resendApiKey && this.resendApiKey !== 're_xxxxxxxxxxxx') {
            this.logger.log('Resend Mail Service initialized successfully');
        } else {
            this.logger.warn('Resend API Key missing or default. Mails will be logged but not sent.');
        }
    }

    private async sendWithResend(payload: {
        to: string | string[],
        subject: string,
        html: string,
        attachments?: any[]
    }) {
        if (!this.resendApiKey || this.resendApiKey === 're_xxxxxxxxxxxx') {
            this.logger.warn(`[DRY RUN] Resend not configured. Subject: ${payload.subject}`);
            return;
        }

        try {
            const response = await axios.post(
                `${this.baseUrl}/emails`,
                {
                    from: this.resendFrom,
                    to: Array.isArray(payload.to) ? payload.to : [payload.to],
                    subject: payload.subject,
                    html: payload.html,
                    attachments: payload.attachments?.map(att => ({
                        filename: att.filename,
                        content: att.content // Resend expects base64 string directly
                    }))
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.resendApiKey}`,
                        'Content-Type': 'application/json',
                        'User-Agent': 'raymond-erp/1.0'
                    }
                }
            );

            this.logger.log(`Email sent via Resend: ${payload.subject} (ID: ${response.data.id})`);
            return response.data;
        } catch (error: any) {
            const errorData = error.response?.data;
            this.logger.error(`Resend API Error: ${JSON.stringify(errorData || error.message)}`);
            throw error;
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

        const to = this.configService.get('NOTIFICATION_EMAILS') || 'g.garzon@runsolutions-services.com';
        await this.sendWithResend({ to, subject, html });
    }

    async sendEntradaSalidaEmail(data: {
        tipo: 'Entrada' | 'Salida';
        folio: string;
        fecha: string;
        site?: string;
        pdfBase64?: string;
        excelBase64?: string;
    }) {
        const prefix = data.site ? data.site.toUpperCase() : 'R3';
        const subject = `${prefix} - ${data.tipo} - ${data.folio}`;

        // Dynamic recipients based on site
        let recipients: string[] = [];
        const siteKey = prefix.toUpperCase();

        if (siteKey === 'R1') {
            recipients = [
                'mherrera@raymond.com.mx',
                'ogomez@raymond.com.mx',
                'Taller_R1@raymond.com.mx',
                'psoto@raymond.com.mx'
            ];
        } else if (siteKey === 'R2' || siteKey === 'NAVES') {
            recipients = [
                'ogomez@raymond.com.mx',
                'taller@raymond.com.mx',
                'jruiz@raymond.com.mx',
                'psoto@raymond.com.mx',
                'mherrera@raymond.com.mx'
            ];
        } else if (siteKey === 'R3' || siteKey === 'FRONTERA') {
            recipients = [
                'mherrera@raymond.com.mx',
                'bodega03@rrodriguezsons.com',
                'jose.oziel@rrodriguezsons.com',
                'psoto@raymond.com.mx',
                'jruiz@raymond.com.mx'
            ];
        } else {
            recipients = ['it@runsolutions-services.com'];
        }

        const html = `
            <p>Hola,</p>
            <p>Se han generado los archivos correspondientes a la ${data.tipo.toLowerCase()} del folio: ${data.folio} con fecha de: ${data.fecha} (${data.tipo}s).</p>
            <br>
            <p>Saludos,</p>
            <p>Sistema de Reportes Logística Raymond</p>
        `;

        const attachments = [];
        if (data.excelBase64) {
            const excelData = data.excelBase64.split('base64,')[1] || data.excelBase64.replace(/^data:application\/[\w.-]+;base64,/, '');
            attachments.push({ filename: `Resumen_${data.folio}.xlsx`, content: excelData });
        }
        if (data.pdfBase64) {
            const pdfData = data.pdfBase64.split('base64,')[1] || data.pdfBase64.replace(/^data:application\/[\w.-]+;base64,/, '');
            attachments.push({ filename: `Resumen_${data.folio}.pdf`, content: pdfData });
        }

        await this.sendWithResend({ to: recipients, subject, html, attachments });
    }

    async sendRefaccionesEmail(data: {
        serial_equipo: string;
        excelBase64: string;
    }) {
        const subject = `Lista de Refacciones - Renovado Equipo ${data.serial_equipo}`;
        const recipients = [
            'Taller_R1@raymond.com.mx',
            'ogomez@raymond.com.mx'
        ];

        const html = `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden;">
                <div style="background-color: #0f172a; color: white; padding: 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 900;">Solicitud de Refacciones</h1>
                </div>
                <div style="padding: 30px; line-height: 1.6;">
                    <p style="font-size: 16px;">Hola,</p>
                    <p>Se adjunta el listado de refacciones solicitadas para el equipo con número de serie: <strong>${data.serial_equipo}</strong>.</p>
                    <p>Por favor, consulte el archivo Excel adjunto para ver los detalles.</p>
                </div>
                <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #eee;">
                    <p style="margin: 0; font-weight: bold;">Sistema de Reportes Logística Raymond</p>
                </div>
            </div>
        `;

        const attachments = [];
        if (data.excelBase64) {
            const excelData = data.excelBase64.split('base64,')[1] || data.excelBase64.replace(/^data:application\/[\w.-]+;base64,/, '');
            attachments.push({ filename: `Refacciones_${data.serial_equipo}.xlsx`, content: excelData });
        }

        await this.sendWithResend({ to: recipients, subject, html, attachments });
    }

    async sendUserApprovedEmail(to: string, username: string, sites: string[]) {
        const subject = 'Acceso Concedido - Raymond Taller';
        const sitesFormatted = sites.map(s => `<strong>${s}</strong>`).join(', ');

        const html = `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); color: white; padding: 40px; text-align: center;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px;">¡BIENVENIDO!</h1>
                    <p style="margin-top: 10px; opacity: 0.9;">Tu acceso ha sido aprobado</p>
                </div>
                <div style="padding: 40px; line-height: 1.6;">
                    <p style="font-size: 16px;">Hola <strong>${username}</strong>,</p>
                    <p>Nos complace informarte que tu solicitud de acceso al sistema Raymond ha sido <strong>aprobada exitosamente</strong>.</p>
                    
                    <div style="background-color: #f8fafc; border-radius: 15px; padding: 25px; margin: 30px 0; border: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">SITIOS ASIGNADOS</p>
                        <p style="margin: 0; font-size: 18px; color: #e11d48;">${sitesFormatted}</p>
                    </div>

                    <p>Ya puedes iniciar sesión con tu correo electrónico y la contraseña que registraste.</p>
                    
                    <div style="text-align: center; margin-top: 40px;">
                        <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/login" 
                           style="background-color: #e11d48; color: white; padding: 18px 35px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block;">
                            INICIAR SESIÓN AHORA
                        </a>
                    </div>
                </div>
                <div style="background-color: #f9fafb; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #eee;">
                    <p style="margin: 0; font-weight: bold; color: #64748b;">© ${new Date().getFullYear()} Raymond Corporation</p>
                    <p style="margin: 5px 0 0 0;">Desarrollado por</p>
                    <p style="margin: 2px 0 0 0; font-weight: 900; color: #e11d48; letter-spacing: 1px;">RUN SOLUTIONS & SERVICES</p>
                </div>
            </div>
        `;

        await this.sendWithResend({ to, subject, html });
    }

    async sendUserRejectedEmail(to: string, username: string) {
        const subject = 'Información sobre tu solicitud de acceso - Raymond Taller';

        const html = `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden;">
                <div style="background-color: #475569; color: white; padding: 40px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 900;">Solicitud de Acceso</h1>
                </div>
                <div style="padding: 40px; line-height: 1.6;">
                    <p style="font-size: 16px;">Hola <strong>${username}</strong>,</p>
                    <p>Gracias por tu interés en acceder al sistema Raymond.</p>
                    <p>Lamentamos informarte que, tras revisar tu solicitud, esta <strong>no ha sido aprobada</strong> en este momento.</p>
                    <p style="margin-top: 20px; color: #64748b;">Si consideras que esto es un error o necesitas más información, por favor contacta al administrador de tu sucursal.</p>
                </div>
                <div style="background-color: #f9fafb; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #eee;">
                    <p style="margin: 0; font-weight: bold; color: #64748b;">© ${new Date().getFullYear()} Raymond Corporation</p>
                    <p style="margin: 5px 0 0 0;">Desarrollado por</p>
                    <p style="margin: 2px 0 0 0; font-weight: 900; color: #e11d48; letter-spacing: 1px;">RUN SOLUTIONS & SERVICES</p>
                </div>
            </div>
        `;

        await this.sendWithResend({ to, subject, html });
    }
}
