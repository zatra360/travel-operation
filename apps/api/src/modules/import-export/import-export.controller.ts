import { Controller, Post, Get, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { ImportService } from '../../common/services/import.service';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

@ApiTags('Tenant - Import/Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
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
}
