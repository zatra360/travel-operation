import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const QUOTATION_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'] as const;

export class CreateQuotationDto {
  @ApiPropertyOptional({ example: 'QTN-2026-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  quoteNumber?: string;

  @ApiPropertyOptional({ example: 'Umrah Package January' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ enum: QUOTATION_STATUSES, default: 'DRAFT' })
  @IsOptional()
  @IsIn(QUOTATION_STATUSES)
  status?: string;

  @ApiPropertyOptional({ description: 'Client ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Lead ID' })
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiPropertyOptional({ description: 'Assigned user ID' })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currencyCode?: string;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  taxTotal?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  discountTotal?: number;

  @ApiPropertyOptional({ example: 1050 })
  @IsOptional()
  @IsNumber()
  grandTotal?: number;

  @ApiPropertyOptional({ description: 'Valid until date' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terms?: string;

  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
