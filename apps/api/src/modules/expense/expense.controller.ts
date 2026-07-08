import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Expenses') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/expenses')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post() @RequirePermissions('EXPENSE_CREATE') @ApiOperation({ summary: 'Create an expense' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateExpenseDto) { return this.expenseService.create(ctx.tenantId, ctx.userId, dto); }

  @Get() @RequirePermissions('EXPENSE_READ') @ApiOperation({ summary: 'List expenses' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryExpenseDto) { return this.expenseService.findAll(ctx.tenantId, query); }

  @Get(':id') @RequirePermissions('EXPENSE_READ') @ApiOperation({ summary: 'Get expense' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.expenseService.findById(ctx.tenantId, id); }

  @Put(':id') @RequirePermissions('EXPENSE_UPDATE') @ApiOperation({ summary: 'Update expense' })
  async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateExpenseDto) { return this.expenseService.update(ctx.tenantId, ctx.userId, id, dto); }

  @Delete(':id') @RequirePermissions('EXPENSE_DELETE') @ApiOperation({ summary: 'Soft delete expense' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.expenseService.remove(ctx.tenantId, ctx.userId, id); }
}
