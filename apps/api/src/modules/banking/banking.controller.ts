import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BankingService } from './banking.service';
import { CreateBankAccountDto, UpdateBankAccountDto, CreateCashRegisterDto, UpdateCashRegisterDto } from './dto/banking.dto';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

class CashMovementDto {
  amount!: number;
  notes?: string;
}

@ApiTags('Tenant - Banking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/banking')
export class BankingController {
  constructor(private readonly service: BankingService) {}

  @Post('accounts') @RequirePermissions('SETTINGS_UPDATE') @ApiOperation({ summary: 'Add bank account' })
  createAccount(@TenantCtx() ctx: TenantContext, @Body() dto: CreateBankAccountDto) { return this.service.createAccount(ctx.tenantId, ctx.userId, dto); }

  @Get('accounts') @RequirePermissions('SETTINGS_READ') @ApiOperation({ summary: 'List bank accounts' })
  listAccounts(@TenantCtx() ctx: TenantContext) { return this.service.listAccounts(ctx.tenantId); }

  @Get('accounts/:id') @RequirePermissions('SETTINGS_READ')
  getAccount(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.service.getAccount(ctx.tenantId, id); }

  @Put('accounts/:id') @RequirePermissions('SETTINGS_UPDATE')
  updateAccount(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateBankAccountDto) { return this.service.updateAccount(ctx.tenantId, ctx.userId, id, dto); }

  @Delete('accounts/:id') @RequirePermissions('SETTINGS_DELETE')
  deleteAccount(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.service.deleteAccount(ctx.tenantId, ctx.userId, id); }

  @Post('registers') @RequirePermissions('SETTINGS_UPDATE') @ApiOperation({ summary: 'Add cash register' })
  createRegister(@TenantCtx() ctx: TenantContext, @Body() dto: CreateCashRegisterDto) { return this.service.createRegister(ctx.tenantId, ctx.userId, dto); }

  @Get('registers') @RequirePermissions('SETTINGS_READ') @ApiOperation({ summary: 'List cash registers' })
  listRegisters(@TenantCtx() ctx: TenantContext) { return this.service.listRegisters(ctx.tenantId); }

  @Get('registers/:id') @RequirePermissions('SETTINGS_READ')
  getRegister(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.service.getRegister(ctx.tenantId, id); }

  @Put('registers/:id') @RequirePermissions('SETTINGS_UPDATE')
  updateRegister(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateCashRegisterDto) { return this.service.updateRegister(ctx.tenantId, ctx.userId, id, dto); }

  @Delete('registers/:id') @RequirePermissions('SETTINGS_DELETE')
  deleteRegister(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.service.deleteRegister(ctx.tenantId, ctx.userId, id); }

  @Post('registers/:id/deposit') @RequirePermissions('SETTINGS_UPDATE') @ApiOperation({ summary: 'Deposit to cash register' })
  deposit(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: CashMovementDto) { return this.service.deposit(ctx.tenantId, ctx.userId, id, dto.amount, dto.notes); }

  @Post('registers/:id/withdraw') @RequirePermissions('SETTINGS_UPDATE') @ApiOperation({ summary: 'Withdraw from cash register' })
  withdraw(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: CashMovementDto) { return this.service.withdraw(ctx.tenantId, ctx.userId, id, dto.amount, dto.notes); }
}
