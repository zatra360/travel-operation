import { IsString, IsOptional, IsIn, IsNumber, IsDateString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const PAYMENT_STATUSES = ['PENDING', 'RECEIVED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED'] as const;

export class CreatePaymentDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  invoiceId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional() @IsString() @MaxLength(10)
  currencyCode?: string;

  @ApiPropertyOptional({ description: 'Rate to convert transaction currency to base currency', default: 1 })
  @IsOptional() @IsNumber()
  exchangeRate?: number;

  @ApiPropertyOptional({ description: 'Tenant base/reporting currency (defaults to transaction currency)' })
  @IsOptional() @IsString() @MaxLength(10)
  baseCurrencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(30)
  paymentMethod?: string;

  @ApiPropertyOptional({ enum: PAYMENT_STATUSES, default: 'PENDING' })
  @IsOptional() @IsIn(PAYMENT_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  bankAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  receivedAt?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  branchId?: string;
}
