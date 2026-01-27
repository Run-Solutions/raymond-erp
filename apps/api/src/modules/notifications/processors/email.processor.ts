import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import { EmailNotificationPayload } from '../notifications.service';

@Processor('email')
export class EmailProcessor extends WorkerHost {
    private readonly logger = new Logger(EmailProcessor.name);
    private transporter: nodemailer.Transporter;

    constructor() {
        super();
        // Configure your email transporter
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async process(job: Job<EmailNotificationPayload>): Promise<any> {
        this.logger.log(`Processing email job ${job.id} for ${job.data.to}`);

        try {
            const info = await this.transporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@raymond-erp.com',
                to: job.data.to,
                subject: job.data.subject,
                html: this.renderTemplate(job.data.template, job.data.data),
            });

            this.logger.log(`Email sent: ${info.messageId}`);
            return info;
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Failed to send email: ${err.message}`);
            throw error;
        }
    }

    private renderTemplate(template: string, data: any): string {
        // Simple template rendering - in production, use a proper template engine
        switch (template) {
            case 'task-assigned':
                return `
                    <h2>Hi ${data.assigneeName},</h2>
                    <p>${data.assignedByName} has assigned you a new task:</p>
                    <h3>${data.taskTitle}</h3>
                    <p>Project: ${data.projectName}</p>
                    <p>Please review and start working on it.</p>
                `;
            case 'project-created':
                return `
                    <h2>Hi ${data.ownerName},</h2>
                    <p>Your project "${data.projectName}" has been created successfully.</p>
                    <p>You can now start adding tasks and team members.</p>
                `;
            default:
                return '<p>Notification from RAYMOND ERP</p>';
        }
    }
}
