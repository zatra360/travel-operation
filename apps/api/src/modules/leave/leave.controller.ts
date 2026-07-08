import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { QueryLeaveDto } from './dto/query-leave.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Leaves') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/leaves')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}
  @Post() @RequirePermissions('LEAVE_CREATE') @ApiOperation({ summary: 'Create leave request' }) async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateLeaveDto) { return this.leaveService.create(ctx.tenantId, ctx.userId, dto); }
  @Get() @RequirePermissions('LEAVE_READ') @ApiOperation({ summary: 'List leaves' }) async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryLeaveDto) { return this.leaveService.findAll(ctx.tenantId, query); }
  @Get(':id') @RequirePermissions('LEAVE_READ') @ApiOperation({ summary: 'Get leave' }) async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.leaveService.findById(ctx.tenantId, id); }
  @Put(':id') @RequirePermissions('LEAVE_UPDATE') @ApiOperation({ summary: 'Update leave' }) async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateLeaveDto) { return this.leaveService.update(ctx.tenantId, ctx.userId, id, dto); }
}
