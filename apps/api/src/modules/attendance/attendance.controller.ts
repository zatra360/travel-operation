import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Attendance') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}
  @Post() @RequirePermissions('ATTENDANCE_CREATE') @ApiOperation({ summary: 'Create attendance record' }) async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateAttendanceDto) { return this.attendanceService.create(ctx.tenantId, ctx.userId, dto); }
  @Get() @RequirePermissions('ATTENDANCE_READ') @ApiOperation({ summary: 'List attendance' }) async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryAttendanceDto) { return this.attendanceService.findAll(ctx.tenantId, query); }
  @Get(':id') @RequirePermissions('ATTENDANCE_READ') @ApiOperation({ summary: 'Get attendance' }) async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.attendanceService.findById(ctx.tenantId, id); }
  @Put(':id') @RequirePermissions('ATTENDANCE_UPDATE') @ApiOperation({ summary: 'Update attendance' }) async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateAttendanceDto) { return this.attendanceService.update(ctx.tenantId, ctx.userId, id, dto); }
}
