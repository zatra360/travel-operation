import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { BranchModule } from './modules/branch/branch.module';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { PermissionModule } from './modules/permission/permission.module';
import { AuditModule } from './modules/audit/audit.module';
import { SettingsModule } from './modules/settings/settings.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { LeadModule } from './modules/lead/lead.module';
import { ClientModule } from './modules/client/client.module';
import { PassportModule } from './modules/passport/passport.module';
import { VisaModule } from './modules/visa/visa.module';
import { FollowUpModule } from './modules/follow-up/follow-up.module';
import { DocumentModule } from './modules/document/document.module';
import { QuotationModule } from './modules/quotation/quotation.module';
import { ContractModule } from './modules/contract/contract.module';
import { ServiceCatalogModule } from './modules/service-catalog/service-catalog.module';
import { TaxModule } from './modules/tax/tax.module';
import { CurrencyModule } from './modules/currency-settings/currency.module';
import { OrderModule } from './modules/order/order.module';
import { PackageController, SubscriptionController } from './modules/platform/subscription.controller';
import { PlatformModule } from './modules/platform/platform.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BookingModule } from './modules/booking/booking.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { ReceiptModule } from './modules/receipt/receipt.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { LeaveModule } from './modules/leave/leave.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { NotificationModule } from './modules/notification/notification.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { ActivityModule } from './modules/activity/activity.module';
import { RefundModule } from './modules/refund/refund.module';
import { CommissionModule } from './modules/commission/commission.module';
import { SalaryRunModule } from './modules/salary-run/salary-run.module';
import { ReissueModule } from './modules/reissue/reissue.module';
import { CancellationModule } from './modules/cancellation/cancellation.module';
import { HealthController } from './health.controller';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    StorageModule,
    AuthModule,
    TenantModule,
    BranchModule,
    UserModule,
    RoleModule,
    PermissionModule,
    AuditModule,
    SettingsModule,
    DashboardModule,
    LeadModule,
    ClientModule,
    PassportModule,
    VisaModule,
    FollowUpModule,
    DocumentModule,
    QuotationModule,
    ContractModule,
    ServiceCatalogModule,
    TaxModule,
    CurrencyModule,
    OrderModule,
    PlatformModule,
    ReportsModule,
    BookingModule,
    TicketModule,
    InvoiceModule,
    ReceiptModule,
    PaymentModule,
    ExpenseModule,
    LedgerModule,
    EmployeeModule,
    LeaveModule,
    AttendanceModule,
    PerformanceModule,
    NotificationModule,
    MasterDataModule,
    ActivityModule,
    RefundModule,
    CommissionModule,
    SalaryRunModule,
    ReissueModule,
    CancellationModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
