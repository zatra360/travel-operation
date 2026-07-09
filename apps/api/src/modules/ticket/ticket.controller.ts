import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post()
  @RequirePermissions('TICKET_CREATE')
  @ApiOperation({ summary: 'Create a new ticket' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateTicketDto) {
    return this.ticketService.create(ctx.tenantId, ctx.userId, dto);
  }

  @Get()
  @RequirePermissions('TICKET_READ')
  @ApiOperation({ summary: 'List tickets' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryTicketDto) {
    return this.ticketService.findAll(ctx.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('TICKET_READ')
  @ApiOperation({ summary: 'Get ticket by ID' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.ticketService.findById(ctx.tenantId, id);
  }

  @Put(':id')
  @RequirePermissions('TICKET_UPDATE')
  @ApiOperation({ summary: 'Update ticket' })
  async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketService.update(ctx.tenantId, ctx.userId, id, dto);
  }

  @Post(':id/issue')
  @RequirePermissions('TICKET_UPDATE')
  @ApiOperation({ summary: 'Issue a ticket' })
  async issueTicket(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.ticketService.issueTicket(ctx.tenantId, ctx.userId, id);
  }

  @Post(':id/void')
  @RequirePermissions('TICKET_DELETE')
  @ApiOperation({ summary: 'Void a ticket' })
  async voidTicket(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.ticketService.voidTicket(ctx.tenantId, ctx.userId, id);
  }

  @Post(':id/refund')
  @RequirePermissions('TICKET_UPDATE')
  @ApiOperation({ summary: 'Refund a ticket' })
  async refundTicket(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.ticketService.refundTicket(ctx.tenantId, ctx.userId, id);
  }

  @Get(':id/timeline')
  @RequirePermissions('TICKET_READ')
  @ApiOperation({ summary: 'Get ticket activity timeline' })
  async getTimeline(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.ticketService.getTimeline(ctx.tenantId, id);
  }

  @Delete(':id')
  @RequirePermissions('TICKET_DELETE')
  @ApiOperation({ summary: 'Delete ticket' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.ticketService.remove(ctx.tenantId, ctx.userId, id);
  }
}
