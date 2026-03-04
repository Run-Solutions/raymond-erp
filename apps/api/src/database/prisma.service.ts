import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { prismaTenantExtension } from '../common/extensions/prisma-tenant.extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private _extended: ReturnType<typeof prismaTenantExtension> | null = null;

    async onModuleInit() {
        try {
            await this.$connect();
            console.log('✅ Base de datos principal conectada');
        } catch (error) {
            console.error('⚠️ No se pudo conectar a la base de datos principal, pero la API seguirá funcionando.', error);
        }
        this._extended = prismaTenantExtension(this) as any;
    }

    // Use a getter that returns the extended client or falls back to base
    private get extended() {
        return this._extended || this;
    }

    // Plural models - delegate to extended client
    get users() { return (this.extended as any).users; }
    get tasks() { return (this.extended as any).tasks; }
    get projects() { return (this.extended as any).projects; }
    get organizations() { return (this.extended as any).organizations; }
    get roles() { return (this.extended as any).roles; }
    get permissions() { return (this.extended as any).permissions; }
    get sessions() { return (this.extended as any).sessions; }
    get password_reset_tokens() { return (this.extended as any).password_reset_tokens; }
    get audit_logs() { return (this.extended as any).audit_logs; }
    get clients() { return (this.extended as any).clients; }
    get prospects() { return (this.extended as any).prospects; }
    get suppliers() { return (this.extended as any).suppliers; }
    get invoices() { return (this.extended as any).invoices; }
    get accounts() { return (this.extended as any).accounts; }
    get journal_entries() { return (this.extended as any).journal_entries; }
    get journal_lines() { return (this.extended as any).journal_lines; }
    get accounts_payable() { return (this.extended as any).accounts_payable; }
    get accounts_receivable() { return (this.extended as any).accounts_receivable; }
    get payment_complements() { return (this.extended as any).payment_complements; }
    get purchase_orders() { return (this.extended as any).purchase_orders; }
    get quotes() { return (this.extended as any).quotes; }
    get requisitions() { return (this.extended as any).requisitions; }
    get recoveries() { return (this.extended as any).recoveries; }
    get fixed_costs() { return (this.extended as any).fixed_costs; }
    get flow_recoveries() { return (this.extended as any).flow_recoveries; }
    get expenses() { return (this.extended as any).expenses; }
    get dispatches() { return (this.extended as any).dispatches; }
    get attachments() { return (this.extended as any).attachments; }
    get comments() { return (this.extended as any).comments; }
    get sprints() { return (this.extended as any).sprints; }
    get time_entries() { return (this.extended as any).time_entries; }
    get categories() { return (this.extended as any).categories; }
    get phases() { return (this.extended as any).phases; }
    get api_keys() { return (this.extended as any).api_keys; }
    get webhooks() { return (this.extended as any).webhooks; }
    get organization_modules() { return (this.extended as any).organization_modules; }
    get role_permissions() { return (this.extended as any).role_permissions; }

    // Singular aliases
    get user() { return this.users; }
    get task() { return this.tasks; }
    get project() { return this.projects; }
    get organization() { return this.organizations; }
    get role() { return this.roles; }
    get permission() { return this.permissions; }
    get session() { return this.sessions; }
    get passwordResetToken() { return this.password_reset_tokens; }
    get auditLog() { return this.audit_logs; }
    get client() { return this.clients; }
    get prospect() { return this.prospects; }
    get supplier() { return this.suppliers; }
    get invoice() { return this.invoices; }
    get account() { return this.accounts; }
    get journalEntry() { return this.journal_entries; }
    get journalLine() { return this.journal_lines; }
    get accountPayable() { return this.accounts_payable; }
    get accountReceivable() { return this.accounts_receivable; }
    get paymentComplement() { return this.payment_complements; }
    get purchaseOrder() { return this.purchase_orders; }
    get quote() { return this.quotes; }
    get requisition() { return this.requisitions; }
    get recovery() { return this.recoveries; }
    get fixedCost() { return this.fixed_costs; }
    get flowRecovery() { return this.flow_recoveries; }
    get expense() { return this.expenses; }
    get dispatch() { return this.dispatches; }
    get attachment() { return this.attachments; }
    get comment() { return this.comments; }
    get sprint() { return this.sprints; }
    get timeEntry() { return this.time_entries; }
    get category() { return this.categories; }
    get phase() { return this.phases; }
    get apiKey() { return this.api_keys; }
    get webhook() { return this.webhooks; }
    get organizationModule() { return this.organization_modules; }
    get rolePermission() { return this.role_permissions; }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
