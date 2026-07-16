import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'] as const;

export class CreateInvoiceDto {
  @ApiPropertyOptional({ example: 'INV-2026-0001' })
  @IsOptional() @IsString() @MaxLength(50)
  invoiceNumber?: string;

  @ApiPropertyOptional({ enum: INVOICE_STATUSES, default: 'DRAFT' })
  @IsOptional() @IsIn(INVOICE_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Quotation ID' })
  @IsOptional() @IsString()
  quotationId?: string;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional() @IsString() @MaxLength(10)
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  subtotal?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  taxAmount?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  discountAmount?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  totalAmount?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  paidAmount?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  dueAmount?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  issuedAt?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  branchId?: string;
}
