import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @RequirePermissions('BOOKING_CREATE')
  @ApiOperation({ summary: 'Create a new booking' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateBookingDto) {
    return this.bookingService.create(ctx.tenantId, ctx.userId, dto);
  }

  @Get()
  @RequirePermissions('BOOKING_READ')
  @ApiOperation({ summary: 'List bookings' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryBookingDto) {
    return this.bookingService.findAll(ctx.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('BOOKING_READ')
  @ApiOperation({ summary: 'Get booking by ID' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.bookingService.findById(ctx.tenantId, id);
  }

  @Put(':id')
  @RequirePermissions('BOOKING_UPDATE')
  @ApiOperation({ summary: 'Update booking' })
  async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.bookingService.update(ctx.tenantId, ctx.userId, id, dto);
  }

  @Post(':id/add-passenger')
  @RequirePermissions('BOOKING_UPDATE')
  @ApiOperation({ summary: 'Add passenger to booking' })
  async addPassenger(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: any) {
    return this.bookingService.addPassenger(ctx.tenantId, ctx.userId, id, dto);
  }

  @Post(':id/add-segment')
  @RequirePermissions('BOOKING_UPDATE')
  @ApiOperation({ summary: 'Add segment to booking' })
  async addSegment(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: any) {
    return this.bookingService.addSegment(ctx.tenantId, ctx.userId, id, dto);
  }

  @Post(':id/create-invoice')
  @RequirePermissions('INVOICE_CREATE')
  @ApiOperation({ summary: 'Create invoice from booking' })
  async createInvoice(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto?: any) {
    return this.bookingService.createInvoice(ctx.tenantId, ctx.userId, id, dto);
  }

  @Get(':id/timeline')
  @RequirePermissions('BOOKING_READ')
  @ApiOperation({ summary: 'Get booking activity timeline' })
  async getTimeline(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.bookingService.getTimeline(ctx.tenantId, id);
  }

  @Delete(':id')
  @RequirePermissions('BOOKING_DELETE')
  @ApiOperation({ summary: 'Soft delete booking' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.bookingService.remove(ctx.tenantId, ctx.userId, id);
  }
}
