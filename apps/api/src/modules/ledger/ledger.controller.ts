import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';
import { QueryLedgerDto } from './dto/query-ledger.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Ledger') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get() @RequirePermissions('LEDGER_READ') @ApiOperation({ summary: 'List ledger entries' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryLedgerDto) { return this.ledgerService.findAll(ctx.tenantId, query, ctx.branchId); }
}
