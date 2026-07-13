import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, clientId: string, actorId: string, dto: any) {
    await this.prisma.client.findFirstOrThrow({ where: { id: clientId, tenantId, deletedAt: null } });
    const orderNumber = dto.orderNumber || `ORD-${Date.now().toString(36).toUpperCase()}`;
    return this.prisma.order.create({
      data: { tenantId, clientId, orderNumber, status: 'PENDING', currencyCode: dto.currencyCode ?? 'USD', notes: dto.notes, createdById: actorId },
    });
  }

  async findByClient(tenantId: string, clientId: string) {
    return this.prisma.order.findMany({ where: { tenantId, clientId, deletedAt: null }, include: { items: true }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(tenantId: string, id: string) {
    const o = await this.prisma.order.findFirst({ where: { id, tenantId, deletedAt: null }, include: { items: { orderBy: { sortOrder: 'asc' } } } });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.order.update({ where: { id }, data: dto });
  }

  async addItem(tenantId: string, orderId: string, dto: any) {
    await this.findOne(tenantId, orderId);
    const item = await this.prisma.orderItem.create({
      data: {
        tenantId, orderId, title: dto.title, serviceType: dto.serviceType, description: dto.description,
        quantity: dto.quantity ?? 1, unitPrice: dto.unitPrice ?? 0, taxAmount: dto.taxAmount ?? 0,
        discountAmount: dto.discountAmount ?? 0,
        lineTotal: (dto.quantity ?? 1) * (dto.unitPrice ?? 0) + (dto.taxAmount ?? 0) - (dto.discountAmount ?? 0),
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.recalculateTotals(tenantId, orderId);
    return item;
  }

  async updateItem(tenantId: string, itemId: string, dto: any) {
    const item = await this.prisma.orderItem.findFirst({ where: { id: itemId, tenantId } });
    if (!item) throw new NotFoundException('Order item not found');
    const qty = dto.quantity ?? item.quantity;
    const price = dto.unitPrice ?? Number(item.unitPrice);
    const tax = dto.taxAmount ?? Number(item.taxAmount);
    const disc = dto.discountAmount ?? Number(item.discountAmount);
    const updated = await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { ...dto, lineTotal: qty * price + tax - disc },
    });
    await this.recalculateTotals(tenantId, item.orderId);
    return updated;
  }

  async removeItem(tenantId: string, itemId: string) {
    const item = await this.prisma.orderItem.findFirst({ where: { id: itemId, tenantId } });
    if (!item) throw new NotFoundException('Order item not found');
    await this.prisma.orderItem.delete({ where: { id: itemId } });
    await this.recalculateTotals(tenantId, item.orderId);
    return { id: itemId, deleted: true };
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.order.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async recalculateTotals(tenantId: string, orderId: string) {
    const items = await this.prisma.orderItem.findMany({ where: { orderId } });
    const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
    const taxTotal = items.reduce((s, i) => s + Number(i.taxAmount), 0);
    const discountTotal = items.reduce((s, i) => s + Number(i.discountAmount), 0);
    const grandTotal = subtotal + taxTotal - discountTotal;
    await this.prisma.order.update({ where: { id: orderId }, data: { subtotal, taxTotal, discountTotal, grandTotal } });
  }
}
