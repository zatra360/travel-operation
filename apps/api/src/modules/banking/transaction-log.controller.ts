import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

@ApiTags('Tenant - Transaction Log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/transaction-logs')
export class TransactionLogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('PAYMENT_READ')
  @ApiOperation({ summary: 'List payment gateway transaction attempts' })
  async list(@TenantCtx() ctx: TenantContext, @Query('page') page = 1, @Query('limit') limit = 50) {
    const skip = (+page - 1) * +limit;
    const where = { tenantId: ctx.tenantId };
    const [data, total] = await Promise.all([
      this.prisma.transactionLog.findMany({
        where, orderBy: { attemptedAt: 'desc' }, skip, take: +limit,
        select: { id: true, gateway: true, gatewayRef: true, amount: true, currencyCode: true, status: true, errorMessage: true, requestPayload: true, responsePayload: true, attemptedAt: true, completedAt: true },
      }),
      this.prisma.transactionLog.count({ where }),
    ]);
    return { data, total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) };
  }
}
