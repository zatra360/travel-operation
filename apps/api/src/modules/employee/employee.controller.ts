import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeeDto } from './dto/query-employee.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Employees') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}
  @Post() @RequirePermissions('EMPLOYEE_CREATE') @ApiOperation({ summary: 'Create employee' }) async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateEmployeeDto) { return this.employeeService.create(ctx.tenantId, ctx.userId, dto); }
  @Get() @RequirePermissions('EMPLOYEE_READ') @ApiOperation({ summary: 'List employees' }) async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryEmployeeDto) { return this.employeeService.findAll(ctx.tenantId, query); }
  @Get(':id') @RequirePermissions('EMPLOYEE_READ') @ApiOperation({ summary: 'Get employee' }) async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.employeeService.findById(ctx.tenantId, id); }
  @Put(':id') @RequirePermissions('EMPLOYEE_UPDATE') @ApiOperation({ summary: 'Update employee' }) async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) { return this.employeeService.update(ctx.tenantId, ctx.userId, id, dto); }
  @Delete(':id') @RequirePermissions('EMPLOYEE_DELETE') @ApiOperation({ summary: 'Soft delete employee' }) async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.employeeService.remove(ctx.tenantId, ctx.userId, id); }
}
