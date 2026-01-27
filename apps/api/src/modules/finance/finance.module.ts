import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccountsController } from './accounts/accounts.controller';
import { AccountsService } from './accounts/accounts.service';
import { JournalEntriesController } from './journal-entries/journal-entries.controller';
import { JournalEntriesService } from './journal-entries/journal-entries.service';
import { FinanceReportsController } from './reports/reports.controller';
import { FinanceReportsService } from './reports/reports.service';

import { AccountsReceivableController } from './accounts-receivable/accounts-receivable.controller';
import { AccountsReceivableService } from './accounts-receivable/accounts-receivable.service';

import { AccountsPayableController } from './accounts-payable/accounts-payable.controller';
import { AccountsPayableService } from './accounts-payable/accounts-payable.service';

import { FixedCostsController } from './fixed-costs/fixed-costs.controller';
import { FixedCostsService } from './fixed-costs/fixed-costs.service';

import { InvoicesController } from './invoices/invoices.controller';
import { InvoicesService } from './invoices/invoices.service';
import { FinanceDashboardController } from './dashboard/dashboard.controller';

import { PurchaseOrdersController } from './purchase-orders/purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders/purchase-orders.service';

import { FlowRecoveriesController } from './flow-recoveries/flow-recoveries.controller';
import { FlowRecoveriesService } from './flow-recoveries/flow-recoveries.service';
import { PaymentComplementsModule } from './payment-complements/payment-complements.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PaymentComplementsModule, forwardRef(() => NotificationsModule)],
    controllers: [AccountsController, JournalEntriesController, FinanceReportsController, AccountsReceivableController, AccountsPayableController, FixedCostsController, InvoicesController, FinanceDashboardController, PurchaseOrdersController, FlowRecoveriesController],
    providers: [AccountsService, JournalEntriesService, FinanceReportsService, PrismaService, AccountsReceivableService, AccountsPayableService, FixedCostsService, InvoicesService, PurchaseOrdersService, FlowRecoveriesService],
    exports: [AccountsService, JournalEntriesService, FinanceReportsService, AccountsReceivableService, AccountsPayableService, FixedCostsService, InvoicesService, PurchaseOrdersService, FlowRecoveriesService],
})
export class FinanceModule { }
