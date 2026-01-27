import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { NotificationType } from './types/notification-type.enum';

export interface EmailNotificationPayload {
    to: string;
    subject: string;
    template: string;
    data: any;
}

export interface InAppNotificationPayload {
    user_id: string;
    title: string;
    message: string;
    type: string;
    link?: string;
    organization_id?: string;
    metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        @InjectQueue('email') private emailQueue: Queue,
        @InjectQueue('notifications') private notificationsQueue: Queue,
        private readonly prisma: PrismaService,
    ) {}

    async sendEmail(payload: EmailNotificationPayload) {
        await this.emailQueue.add('send-email', payload, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
        });
    }

    async createInAppNotification(payload: InAppNotificationPayload) {
        await this.notificationsQueue.add('in-app-notification', payload);
    }

    async notifyTaskAssigned(task_id: string, assignee_id: string, assignedBy: string) {
        const [task, assignee, assigner] = await Promise.all([
            this.prisma.tasks.findUnique({
                where: { id: task_id },
                include: { projects: true },
            }),
            this.prisma.users.findUnique({ where: { id: assignee_id } }),
            this.prisma.users.findUnique({ where: { id: assignedBy } }),
        ]);

        if (!task || !assignee || !assigner) return;

        // Send email
        await this.sendEmail({
            to: assignee.email,
            subject: `New Task Assigned: ${task.title}`,
            template: 'task-assigned',
            data: {
                assigneeName: assignee.first_name,
                taskTitle: task.title,
                projectName: task.project.name,
                assignedByName: `${assigner.first_name} ${assigner.last_name}`,
            },
        });

        // Create in-app notification
        await this.createInAppNotification({
            user_id: assignee_id,
            title: 'New Task Assigned',
            message: `${assigner.first_name} assigned you "${task.title}"`,
            type: 'TASK_ASSIGNED',
            link: `/projects/${task.project_id}/tasks/${task_id}`,
        });
    }

    async notifyProjectCreated(project_id: string, owner_id: string) {
        const [project, owner] = await Promise.all([
            this.prisma.projects.findUnique({ where: { id: project_id } }),
            this.prisma.users.findUnique({ where: { id: owner_id } }),
        ]);

        if (!project || !owner) return;

        await this.sendEmail({
            to: owner.email,
            subject: `Project Created: ${project.name}`,
            template: 'project-created',
            data: {
                ownerName: owner.first_name,
                projectName: project.name,
            },
        });

        await this.createInAppNotification({
            user_id: owner_id,
            title: 'Project Created',
            message: `Project "${project.name}" has been created successfully`,
            type: 'PROJECT_CREATED',
            link: `/projects/${project_id}`,
            organization_id: project.organization_id,
            metadata: { project_id },
        });
    }

    // CRUD Methods
    async findAll(user_id: string, organization_id: string | null, query: any) {
        const where: any = {
            user_id,
        };

        if (organization_id) {
            where.organization_id = organization_id;
        }

        if (query.type) {
            where.type = query.type;
        }

        if (query.read !== undefined) {
            where.read = query.read === 'true' || query.read === true;
        }

        const [notifications, total] = await Promise.all([
            this.prisma.notifications.findMany({
                where,
                orderBy: { created_at: 'desc' },
                take: query.limit || 20,
                skip: query.offset || 0,
                include: {
                    users: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            avatar_url: true,
                        },
                    },
                },
            }),
            this.prisma.notifications.count({ where }),
        ]);

        return {
            data: notifications,
            total,
            limit: query.limit || 20,
            offset: query.offset || 0,
        };
    }

    async findOne(user_id: string, id: string) {
        return this.prisma.notifications.findFirst({
            where: {
                id,
                user_id,
            },
            include: {
                users: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        avatar_url: true,
                    },
                },
            },
        });
    }

    async markAsRead(user_id: string, id: string) {
        return this.prisma.notifications.updateMany({
            where: {
                id,
                user_id,
                read: false,
            },
            data: {
                read: true,
                read_at: new Date(),
            },
        });
    }

    async markAllAsRead(user_id: string, organization_id: string | null) {
        const where: any = {
            user_id,
            read: false,
        };

        if (organization_id) {
            where.organization_id = organization_id;
        }

        return this.prisma.notifications.updateMany({
            where,
            data: {
                read: true,
                read_at: new Date(),
            },
        });
    }

    async delete(user_id: string, id: string) {
        return this.prisma.notifications.deleteMany({
            where: {
                id,
                user_id,
            },
        });
    }

    async getUnreadCount(user_id: string, organization_id: string | null) {
        const where: any = {
            user_id,
            read: false,
        };

        if (organization_id) {
            where.organization_id = organization_id;
        }

        return this.prisma.notifications.count({ where });
    }

    // ============================================
    // HELPER METHODS FOR ALL MODULES
    // ============================================

    /**
     * Notify a single user
     */
    async notifyUser(
        user_id: string,
        type: NotificationType,
        title: string,
        message: string,
        options?: {
            link?: string;
            organization_id?: string;
            metadata?: Record<string, any>;
        },
    ) {
        try {
            await this.createInAppNotification({
                user_id,
                title,
                message,
                type: type as string,
                link: options?.link,
                organization_id: options?.organization_id,
                metadata: options?.metadata,
            });
        } catch (error) {
            this.logger.error(`Failed to notify user ${user_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Notify multiple users
     */
    async notifyUsers(
        user_ids: string[],
        type: NotificationType,
        title: string,
        message: string,
        options?: {
            link?: string;
            organization_id?: string;
            metadata?: Record<string, any>;
        },
    ) {
        const notifications = user_ids.map(user_id =>
            this.createInAppNotification({
                user_id,
                title,
                message,
                type: type as string,
                link: options?.link,
                organization_id: options?.organization_id,
                metadata: options?.metadata,
            }),
        );

        try {
            await Promise.all(notifications);
        } catch (error) {
            this.logger.error(`Failed to notify users: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // ============================================
    // DISPATCHES (COMMAND CENTER)
    // ============================================

    async notifyDispatchReceived(dispatch_id: string, recipient_id: string, sender_name: string, organization_id: string) {
        await this.notifyUser(
            recipient_id,
            NotificationType.DISPATCH_RECEIVED,
            'Nuevo Despacho Recibido',
            `${sender_name} te ha enviado un nuevo despacho`,
            {
                link: `/dispatches/${dispatch_id}`,
                organization_id,
                metadata: { dispatch_id },
            },
        );
    }

    async notifyDispatchResolved(dispatch_id: string, sender_id: string, resolver_name: string, organization_id: string) {
        await this.notifyUser(
            sender_id,
            NotificationType.DISPATCH_RESOLVED,
            'Despacho Resuelto',
            `${resolver_name} ha resuelto tu despacho`,
            {
                link: `/dispatches/${dispatch_id}`,
                organization_id,
                metadata: { dispatch_id },
            },
        );
    }

    async notifyDispatchConvertedToTask(dispatch_id: string, task_id: string, recipient_id: string, organization_id: string) {
        await this.notifyUser(
            recipient_id,
            NotificationType.DISPATCH_CONVERTED_TO_TASK,
            'Despacho Convertido a Tarea',
            'Tu despacho ha sido convertido en una tarea',
            {
                link: `/tasks/${task_id}`,
                organization_id,
                metadata: { dispatch_id, task_id },
            },
        );
    }

    // ============================================
    // ACCOUNTS PAYABLE (CUENTAS POR PAGAR)
    // ============================================

    async notifyAccountPayableDue(account_payable_id: string, user_id: string, concepto: string, fecha_vencimiento: Date, organization_id: string) {
        const daysUntilDue = Math.ceil((fecha_vencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const message = daysUntilDue <= 0
            ? `La cuenta por pagar "${concepto}" está vencida`
            : `La cuenta por pagar "${concepto}" vence en ${daysUntilDue} día${daysUntilDue !== 1 ? 's' : ''}`;

        await this.notifyUser(
            user_id,
            daysUntilDue <= 0 ? NotificationType.ACCOUNT_PAYABLE_OVERDUE : NotificationType.ACCOUNT_PAYABLE_DUE,
            daysUntilDue <= 0 ? 'Cuenta por Pagar Vencida' : 'Cuenta por Pagar Próxima a Vencer',
            message,
            {
                link: `/finance/accounts-payable/${account_payable_id}`,
                organization_id,
                metadata: { account_payable_id, fecha_vencimiento: fecha_vencimiento.toISOString() },
            },
        );
    }

    async notifyAccountPayablePaid(account_payable_id: string, user_id: string, concepto: string, organization_id: string) {
        await this.notifyUser(
            user_id,
            NotificationType.ACCOUNT_PAYABLE_PAID,
            'Cuenta por Pagar Pagada',
            `La cuenta por pagar "${concepto}" ha sido pagada`,
            {
                link: `/finance/accounts-payable/${account_payable_id}`,
                organization_id,
                metadata: { account_payable_id },
            },
        );
    }

    // ============================================
    // ACCOUNTS RECEIVABLE (CUENTAS POR COBRAR)
    // ============================================

    async notifyAccountReceivableDue(account_receivable_id: string, user_id: string, concepto: string, fecha_vencimiento: Date, organization_id: string) {
        const daysUntilDue = Math.ceil((fecha_vencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const message = daysUntilDue <= 0
            ? `La cuenta por cobrar "${concepto}" está vencida`
            : `La cuenta por cobrar "${concepto}" vence en ${daysUntilDue} día${daysUntilDue !== 1 ? 's' : ''}`;

        await this.notifyUser(
            user_id,
            daysUntilDue <= 0 ? NotificationType.ACCOUNT_RECEIVABLE_OVERDUE : NotificationType.ACCOUNT_RECEIVABLE_DUE,
            daysUntilDue <= 0 ? 'Cuenta por Cobrar Vencida' : 'Cuenta por Cobrar Próxima a Vencer',
            message,
            {
                link: `/finance/accounts-receivable/${account_receivable_id}`,
                organization_id,
                metadata: { account_receivable_id, fecha_vencimiento: fecha_vencimiento.toISOString() },
            },
        );
    }

    async notifyAccountReceivablePaid(account_receivable_id: string, user_id: string, concepto: string, organization_id: string) {
        await this.notifyUser(
            user_id,
            NotificationType.ACCOUNT_RECEIVABLE_PAID,
            'Cuenta por Cobrar Pagada',
            `La cuenta por cobrar "${concepto}" ha sido pagada`,
            {
                link: `/finance/accounts-receivable/${account_receivable_id}`,
                organization_id,
                metadata: { account_receivable_id },
            },
        );
    }

    // ============================================
    // PURCHASE ORDERS (ÓRDENES DE COMPRA)
    // ============================================

    async notifyPurchaseOrderCreated(purchase_order_id: string, created_by_id: string, folio: string, organization_id: string) {
        await this.notifyUser(
            created_by_id,
            NotificationType.PURCHASE_ORDER_CREATED,
            'Orden de Compra Creada',
            `La orden de compra ${folio} ha sido creada`,
            {
                link: `/finance/purchase-orders/${purchase_order_id}`,
                organization_id,
                metadata: { purchase_order_id, folio },
            },
        );
    }

    async notifyPurchaseOrderStatusChanged(
        purchase_order_id: string,
        user_id: string,
        folio: string,
        status: 'APPROVED' | 'REJECTED' | 'PAID',
        organization_id: string,
    ) {
        const typeMap = {
            APPROVED: NotificationType.PURCHASE_ORDER_APPROVED,
            REJECTED: NotificationType.PURCHASE_ORDER_REJECTED,
            PAID: NotificationType.PURCHASE_ORDER_PAID,
        };

        const titleMap = {
            APPROVED: 'Orden de Compra Aprobada',
            REJECTED: 'Orden de Compra Rechazada',
            PAID: 'Orden de Compra Pagada',
        };

        await this.notifyUser(
            user_id,
            typeMap[status],
            titleMap[status],
            `La orden de compra ${folio} ha sido ${status === 'APPROVED' ? 'aprobada' : status === 'REJECTED' ? 'rechazada' : 'pagada'}`,
            {
                link: `/finance/purchase-orders/${purchase_order_id}`,
                organization_id,
                metadata: { purchase_order_id, folio, status },
            },
        );
    }

    // ============================================
    // EXPENSES (GASTOS)
    // ============================================

    async notifyExpenseStatusChanged(
        expense_id: string,
        user_id: string,
        amount: number,
        status: 'SUBMITTED' | 'APPROVED' | 'REJECTED',
        organization_id: string,
    ) {
        const typeMap = {
            SUBMITTED: NotificationType.EXPENSE_SUBMITTED,
            APPROVED: NotificationType.EXPENSE_APPROVED,
            REJECTED: NotificationType.EXPENSE_REJECTED,
        };

        const titleMap = {
            SUBMITTED: 'Gasto Enviado para Aprobación',
            APPROVED: 'Gasto Aprobado',
            REJECTED: 'Gasto Rechazado',
        };

        await this.notifyUser(
            user_id,
            typeMap[status],
            titleMap[status],
            `Tu gasto de $${amount.toFixed(2)} ha sido ${status === 'SUBMITTED' ? 'enviado para aprobación' : status === 'APPROVED' ? 'aprobado' : 'rechazado'}`,
            {
                link: `/expenses/${expense_id}`,
                organization_id,
                metadata: { expense_id, amount, status },
            },
        );
    }

    // ============================================
    // TIME ENTRIES (REGISTRO DE TIEMPO)
    // ============================================

    async notifyTimeEntryStatusChanged(
        time_entry_id: string,
        user_id: string,
        hours: number,
        status: 'SUBMITTED' | 'APPROVED' | 'REJECTED',
        organization_id: string,
    ) {
        const typeMap = {
            SUBMITTED: NotificationType.TIME_ENTRY_SUBMITTED,
            APPROVED: NotificationType.TIME_ENTRY_APPROVED,
            REJECTED: NotificationType.TIME_ENTRY_REJECTED,
        };

        const titleMap = {
            SUBMITTED: 'Registro de Tiempo Enviado',
            APPROVED: 'Registro de Tiempo Aprobado',
            REJECTED: 'Registro de Tiempo Rechazado',
        };

        await this.notifyUser(
            user_id,
            typeMap[status],
            titleMap[status],
            `Tu registro de ${hours} hora${hours !== 1 ? 's' : ''} ha sido ${status === 'SUBMITTED' ? 'enviado para aprobación' : status === 'APPROVED' ? 'aprobado' : 'rechazado'}`,
            {
                link: `/time-entries/${time_entry_id}`,
                organization_id,
                metadata: { time_entry_id, hours, status },
            },
        );
    }

    // ============================================
    // INVOICES (FACTURAS)
    // ============================================

    async notifyInvoiceCreated(invoice_id: string, user_id: string, number: string, amount: number, organization_id: string) {
        await this.notifyUser(
            user_id,
            NotificationType.INVOICE_CREATED,
            'Factura Creada',
            `La factura ${number} por $${amount.toFixed(2)} ha sido creada`,
            {
                link: `/finance/invoices/${invoice_id}`,
                organization_id,
                metadata: { invoice_id, number, amount },
            },
        );
    }

    async notifyInvoicePaid(invoice_id: string, user_id: string, number: string, amount: number, organization_id: string) {
        await this.notifyUser(
            user_id,
            NotificationType.INVOICE_PAID,
            'Factura Pagada',
            `La factura ${number} por $${amount.toFixed(2)} ha sido pagada`,
            {
                link: `/finance/invoices/${invoice_id}`,
                organization_id,
                metadata: { invoice_id, number, amount },
            },
        );
    }

    // ============================================
    // QUOTES (COTIZACIONES)
    // ============================================

    async notifyQuoteStatusChanged(
        quote_id: string,
        user_id: string,
        numero: string,
        status: 'CREATED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED',
        organization_id: string,
    ) {
        const typeMap = {
            CREATED: NotificationType.QUOTE_CREATED,
            ACCEPTED: NotificationType.QUOTE_ACCEPTED,
            REJECTED: NotificationType.QUOTE_REJECTED,
            EXPIRED: NotificationType.QUOTE_EXPIRED,
        };

        const titleMap = {
            CREATED: 'Cotización Creada',
            ACCEPTED: 'Cotización Aceptada',
            REJECTED: 'Cotización Rechazada',
            EXPIRED: 'Cotización Expirada',
        };

        await this.notifyUser(
            user_id,
            typeMap[status],
            titleMap[status],
            `La cotización ${numero} ha sido ${status === 'CREATED' ? 'creada' : status === 'ACCEPTED' ? 'aceptada' : status === 'REJECTED' ? 'rechazada' : 'expirada'}`,
            {
                link: `/quotes/${quote_id}`,
                organization_id,
                metadata: { quote_id, numero, status },
            },
        );
    }

    // ============================================
    // REQUISITIONS (REQUISICIONES)
    // ============================================

    async notifyRequisitionStatusChanged(
        requisition_id: string,
        user_id: string,
        descripcion: string,
        status: 'CREATED' | 'APPROVED' | 'REJECTED',
        organization_id: string,
    ) {
        const typeMap = {
            CREATED: NotificationType.REQUISITION_CREATED,
            APPROVED: NotificationType.REQUISITION_APPROVED,
            REJECTED: NotificationType.REQUISITION_REJECTED,
        };

        const titleMap = {
            CREATED: 'Requisición Creada',
            APPROVED: 'Requisición Aprobada',
            REJECTED: 'Requisición Rechazada',
        };

        await this.notifyUser(
            user_id,
            typeMap[status],
            titleMap[status],
            `La requisición "${descripcion}" ha sido ${status === 'CREATED' ? 'creada' : status === 'APPROVED' ? 'aprobada' : 'rechazada'}`,
            {
                link: `/requisitions/${requisition_id}`,
                organization_id,
                metadata: { requisition_id, descripcion, status },
            },
        );
    }

    // ============================================
    // RECOVERIES (RECUPERACIONES)
    // ============================================

    async notifyRecoveryCreated(recovery_id: string, user_id: string, descripcion: string, organization_id: string) {
        await this.notifyUser(
            user_id,
            NotificationType.RECOVERY_CREATED,
            'Recuperación Creada',
            `Se ha creado una nueva recuperación: "${descripcion}"`,
            {
                link: `/recoveries/${recovery_id}`,
                organization_id,
                metadata: { recovery_id, descripcion },
            },
        );
    }

    async notifyRecoveryCompleted(recovery_id: string, user_id: string, descripcion: string, monto_recuperado: number, organization_id: string) {
        await this.notifyUser(
            user_id,
            NotificationType.RECOVERY_COMPLETED,
            'Recuperación Completada',
            `La recuperación "${descripcion}" ha sido completada. Monto recuperado: $${monto_recuperado.toFixed(2)}`,
            {
                link: `/recoveries/${recovery_id}`,
                organization_id,
                metadata: { recovery_id, descripcion, monto_recuperado },
            },
        );
    }

    // ============================================
    // FIXED COSTS (COSTOS FIJOS)
    // ============================================

    async notifyFixedCostDue(fixed_cost_id: string, user_id: string, nombre: string, monto: number, proximo_pago: Date, organization_id: string) {
        const daysUntilDue = Math.ceil((proximo_pago.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const message = `El costo fijo "${nombre}" ($${monto.toFixed(2)}) vence en ${daysUntilDue} día${daysUntilDue !== 1 ? 's' : ''}`;

        await this.notifyUser(
            user_id,
            NotificationType.FIXED_COST_DUE,
            'Costo Fijo Próximo a Vencer',
            message,
            {
                link: `/finance/fixed-costs/${fixed_cost_id}`,
                organization_id,
                metadata: { fixed_cost_id, nombre, monto, proximo_pago: proximo_pago.toISOString() },
            },
        );
    }
}
