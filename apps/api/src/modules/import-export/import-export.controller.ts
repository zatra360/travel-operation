import { Controller, Post, Get, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { ImportService } from '../../common/services/import.service';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

@ApiTags('Tenant - Import/Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('tenant')
export class ImportExportController {
  constructor(private readonly importService: ImportService) {}

  @Post('leads/import')
  @RequirePermissions('LEAD_CREATE')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import leads from CSV file' })
  @UseInterceptors(FileInterceptor('file'))
  async importLeads(@TenantCtx() ctx: TenantContext, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('No file uploaded');
    const rows = this.importService.parseCSV(file.buffer);
    return this.importService.importLeads(ctx.tenantId, ctx.branchId, rows);
  }

  @Post('clients/import')
  @RequirePermissions('CLIENT_CREATE')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import clients from CSV file' })
  @UseInterceptors(FileInterceptor('file'))
  async importClients(@TenantCtx() ctx: TenantContext, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('No file uploaded');
    const rows = this.importService.parseCSV(file.buffer);
    return this.importService.importClients(ctx.tenantId, ctx.branchId, rows);
  }

  @Get('leads/export')
  @RequirePermissions('LEAD_READ')
  @ApiOperation({ summary: 'Export leads as CSV' })
  async exportLeads(@TenantCtx() ctx: TenantContext, @Res() res: Response) {
    const csv = await this.importService.exportLeadsCSV(ctx.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads-export.csv');
    res.send(csv);
  }

  @Get('clients/export')
  @RequirePermissions('CLIENT_READ')
  @ApiOperation({ summary: 'Export clients as CSV' })
  async exportClients(@TenantCtx() ctx: TenantContext, @Res() res: Response) {
    const csv = await this.importService.exportClientsCSV(ctx.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=clients-export.csv');
    res.send(csv);
  }

  @Get('bookings/export')
  @RequirePermissions('BOOKING_READ')
  @ApiOperation({ summary: 'Export bookings as CSV' })
  async exportBookings(@TenantCtx() ctx: TenantContext, @Res() res: Response) {
    const csv = await this.importService.exportBookingsCSV(ctx.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bookings-export.csv');
    res.send(csv);
  }

  @Get('invoices/export')
  @RequirePermissions('INVOICE_READ')
  @ApiOperation({ summary: 'Export invoices as CSV' })
  async exportInvoices(@TenantCtx() ctx: TenantContext, @Res() res: Response) {
    const csv = await this.importService.exportInvoicesCSV(ctx.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=invoices-export.csv');
    res.send(csv);
  }

  @Get('payments/export')
  @RequirePermissions('PAYMENT_READ')
  @ApiOperation({ summary: 'Export payments as CSV' })
  async exportPayments(@TenantCtx() ctx: TenantContext, @Res() res: Response) {
    const csv = await this.importService.exportPaymentsCSV(ctx.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=payments-export.csv');
    res.send(csv);
  }

  @Get('tickets/export')
  @RequirePermissions('TICKET_READ')
  @ApiOperation({ summary: 'Export tickets as CSV' })
  async exportTickets(@TenantCtx() ctx: TenantContext, @Res() res: Response) {
    const csv = await this.importService.exportTicketsCSV(ctx.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=tickets-export.csv');
    res.send(csv);
  }

  @Get('quotations/export')
  @RequirePermissions('QUOTATION_READ')
  @ApiOperation({ summary: 'Export quotations as CSV' })
  async exportQuotations(@TenantCtx() ctx: TenantContext, @Res() res: Response) {
    const csv = await this.importService.exportQuotationsCSV(ctx.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=quotations-export.csv');
    res.send(csv);
  }

  @Get('employees/export')
  @RequirePermissions('EMPLOYEE_READ')
  @ApiOperation({ summary: 'Export employees as CSV' })
  async exportEmployees(@TenantCtx() ctx: TenantContext, @Res() res: Response) {
    const csv = await this.importService.exportEmployeesCSV(ctx.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=employees-export.csv');
    res.send(csv);
  }

  @Get('expenses/export')
  @RequirePermissions('EXPENSE_READ')
  @ApiOperation({ summary: 'Export expenses as CSV' })
  async exportExpenses(@TenantCtx() ctx: TenantContext, @Res() res: Response) {
    const csv = await this.importService.exportExpensesCSV(ctx.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses-export.csv');
    res.send(csv);
  }
}
