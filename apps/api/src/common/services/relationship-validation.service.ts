import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface ValidateLinkedParams {
  tenantId: string;
  clientId?: string | null;
  leadId?: string | null;
  quotationId?: string | null;
  bookingId?: string | null;
  ticketId?: string | null;
  invoiceId?: string | null;
  paymentId?: string | null;
  employeeId?: string | null;
  branchId?: string | null;
  assignedToId?: string | null;
}

@Injectable()
export class RelationshipValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validateLinkedEntities(params: ValidateLinkedParams): Promise<void> {
    const { tenantId } = params;
    if (!tenantId) throw new BadRequestException('tenantId is required for validation');

    const checks: Promise<void>[] = [];

    if (params.branchId) {
      checks.push(this.validateBranch(tenantId, params.branchId));
    }

    if (params.clientId) {
      checks.push(this.validateClient(tenantId, params.clientId));
    }

    if (params.leadId) {
      checks.push(this.validateLead(tenantId, params.leadId));
    }

    if (params.quotationId) {
      checks.push(this.validateQuotation(tenantId, params.quotationId));
    }

    if (params.bookingId) {
      checks.push(this.validateBooking(tenantId, params.bookingId));
    }

    if (params.ticketId) {
      checks.push(this.validateTicket(tenantId, params.ticketId));
    }

    if (params.invoiceId) {
      checks.push(this.validateInvoice(tenantId, params.invoiceId));
    }

    if (params.paymentId) {
      checks.push(this.validatePayment(tenantId, params.paymentId));
    }

    if (params.employeeId) {
      checks.push(this.validateEmployee(tenantId, params.employeeId));
    }

    if (params.assignedToId) {
      checks.push(this.validateUserTenant(tenantId, params.assignedToId));
    }

    if ((params as any).departmentId) {
      checks.push(this.validateDepartment(tenantId, (params as any).departmentId));
    }

    await Promise.all(checks);
  }

  async validateCrossEntityTenant(tenantId: string, linkedEntities: { type: string; id: string }[]): Promise<void> {
    const results = await Promise.all(
      linkedEntities.map(async ({ type, id }) => {
        let foundTenantId: string | null = null;
        switch (type) {
          case 'client':
            foundTenantId = (await this.prisma.client.findUnique({ where: { id }, select: { tenantId: true } }))?.tenantId ?? null;
            break;
          case 'lead':
            foundTenantId = (await this.prisma.lead.findUnique({ where: { id }, select: { tenantId: true } }))?.tenantId ?? null;
            break;
          case 'quotation':
            foundTenantId = (await this.prisma.quotation.findUnique({ where: { id }, select: { tenantId: true } }))?.tenantId ?? null;
            break;
          case 'booking':
            foundTenantId = (await this.prisma.booking.findUnique({ where: { id }, select: { tenantId: true } }))?.tenantId ?? null;
            break;
          case 'ticket':
            foundTenantId = (await this.prisma.ticket.findUnique({ where: { id }, select: { tenantId: true } }))?.tenantId ?? null;
            break;
          case 'invoice':
            foundTenantId = (await this.prisma.invoice.findUnique({ where: { id }, select: { tenantId: true } }))?.tenantId ?? null;
            break;
          case 'payment':
            foundTenantId = (await this.prisma.payment.findUnique({ where: { id }, select: { tenantId: true } }))?.tenantId ?? null;
            break;
          case 'employee':
            foundTenantId = (await this.prisma.employee.findUnique({ where: { id }, select: { tenantId: true } }))?.tenantId ?? null;
            break;
          case 'branch':
            foundTenantId = (await this.prisma.branch.findUnique({ where: { id }, select: { tenantId: true } }))?.tenantId ?? null;
            break;
          case 'refund':
            foundTenantId = (await this.prisma.refundRequest.findUnique({ where: { id }, select: { tenantId: true } }))?.tenantId ?? null;
            break;
          default:
            throw new BadRequestException(`Unknown entity type for cross-tenant validation: ${type}`);
        }

        if (!foundTenantId) {
          throw new BadRequestException(`${type} with id ${id} not found`);
        }

        if (foundTenantId !== tenantId) {
          throw new ForbiddenException(`${type} with id ${id} does not belong to this tenant`);
        }

        return foundTenantId;
      }),
    );
  }

  private async validateBranch(tenantId: string, branchId: string): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
      select: { id: true },
    });
    if (!branch) {
      throw new ForbiddenException(`Branch ${branchId} does not belong to this tenant`);
    }
  }

  private async validateClient(tenantId: string, clientId: string): Promise<void> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
      select: { id: true },
    });
    if (!client) {
      throw new ForbiddenException(`Client ${clientId} does not belong to this tenant`);
    }
  }

  private async validateLead(tenantId: string, leadId: string): Promise<void> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      select: { id: true },
    });
    if (!lead) {
      throw new ForbiddenException(`Lead ${leadId} does not belong to this tenant`);
    }
  }

  private async validateQuotation(tenantId: string, quotationId: string): Promise<void> {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: quotationId, tenantId },
      select: { id: true },
    });
    if (!quotation) {
      throw new ForbiddenException(`Quotation ${quotationId} does not belong to this tenant`);
    }
  }

  private async validateBooking(tenantId: string, bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
      select: { id: true },
    });
    if (!booking) {
      throw new ForbiddenException(`Booking ${bookingId} does not belong to this tenant`);
    }
  }

  private async validateTicket(tenantId: string, ticketId: string): Promise<void> {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, tenantId },
      select: { id: true },
    });
    if (!ticket) {
      throw new ForbiddenException(`Ticket ${ticketId} does not belong to this tenant`);
    }
  }

  private async validateInvoice(tenantId: string, invoiceId: string): Promise<void> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      select: { id: true },
    });
    if (!invoice) {
      throw new ForbiddenException(`Invoice ${invoiceId} does not belong to this tenant`);
    }
  }

  private async validatePayment(tenantId: string, paymentId: string): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      select: { id: true },
    });
    if (!payment) {
      throw new ForbiddenException(`Payment ${paymentId} does not belong to this tenant`);
    }
  }

  private async validateEmployee(tenantId: string, employeeId: string): Promise<void> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: { id: true },
    });
    if (!employee) {
      throw new ForbiddenException(`Employee ${employeeId} does not belong to this tenant`);
    }
  }

  private async validateUserTenant(tenantId: string, userId: string): Promise<void> {
    const membership = await this.prisma.userTenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
    if (!membership?.isActive) {
      throw new ForbiddenException(`User ${userId} is not an active member of this tenant`);
    }
  }

  private async validateDepartment(tenantId: string, departmentId: string): Promise<void> {
    const dept = await this.prisma.department.findFirst({
      where: { id: departmentId, tenantId },
      select: { id: true },
    });
    if (!dept) {
      throw new ForbiddenException(`Department ${departmentId} does not belong to this tenant`);
    }
  }
}
