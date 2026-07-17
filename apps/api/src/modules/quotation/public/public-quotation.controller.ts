import { Controller, Get, Post, Put, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../../prisma/prisma.service';
import { SignQuotationDto, ClientCommentDto } from './esign.dto';
import { randomBytes } from 'crypto';

@ApiTags('Public - Quotation')
@Controller('public/quotations')
export class PublicQuotationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':hash')
  @ApiOperation({ summary: 'View a quotation by public hash (no auth required)' })
  async viewByHash(@Param('hash') hash: string, @Req() req: any) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { publicHash: hash },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' } },
        client: { select: { id: true, displayName: true, email: true } },
        sign: true,
      },
    });
    if (!quotation || quotation.deletedAt) return null;

    await this.prisma.quotation.update({
      where: { id: quotation.id },
      data: { lastViewedAt: new Date() },
    });

    return { ...quotation, signature: quotation.sign };
  }

  @Post(':hash/sign')
  @ApiOperation({ summary: 'Sign a quotation via public hash' })
  async sign(@Param('hash') hash: string, @Body() dto: SignQuotationDto, @Req() req: any) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { publicHash: hash },
      include: { sign: true },
    });
    if (!quotation || quotation.deletedAt) throw new Error('Quotation not found');

    const sign = await this.prisma.quotationSign.upsert({
      where: { quotationId: quotation.id },
      create: {
        quotationId: quotation.id,
        fullName: dto.fullName,
        email: dto.email,
        signature: dto.signature,
        ipAddress: req.ip || req.connection?.remoteAddress,
        consentGiven: dto.consentGiven ?? true,
      },
      update: {
        fullName: dto.fullName,
        email: dto.email,
        signature: dto.signature,
        ipAddress: req.ip || req.connection?.remoteAddress,
        consentGiven: dto.consentGiven ?? true,
      },
    });
    return sign;
  }

  @Put(':hash/comment')
  @ApiOperation({ summary: 'Submit a client comment on a quotation' })
  async comment(@Param('hash') hash: string, @Body() dto: ClientCommentDto) {
    const quotation = await this.prisma.quotation.findUnique({ where: { publicHash: hash } });
    if (!quotation || quotation.deletedAt) throw new Error('Quotation not found');

    return this.prisma.quotation.update({
      where: { id: quotation.id },
      data: { clientComment: dto.comment },
    });
  }

  @Post(':hash/accept')
  @ApiOperation({ summary: 'Accept a quotation via public hash' })
  async accept(@Param('hash') hash: string, @Req() req: any) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { publicHash: hash },
      include: { sign: true },
    });
    if (!quotation || quotation.deletedAt) throw new Error('Quotation not found');
    if (quotation.status !== 'SENT') throw new Error('Quotation is not in a sendable state');

    if (quotation.signatureRequired && !quotation.sign) {
      throw new Error('Signature is required before accepting this quotation');
    }

    await this.prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    return { success: true, status: 'ACCEPTED' };
  }

  @Post(':hash/reject')
  @ApiOperation({ summary: 'Reject a quotation via public hash' })
  async reject(@Param('hash') hash: string) {
    const quotation = await this.prisma.quotation.findUnique({ where: { publicHash: hash } });
    if (!quotation || quotation.deletedAt) throw new Error('Quotation not found');

    await this.prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: 'REJECTED', rejectedAt: new Date() },
    });

    return { success: true, status: 'REJECTED' };
  }
}
