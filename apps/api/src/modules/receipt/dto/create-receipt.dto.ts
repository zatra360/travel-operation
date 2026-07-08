import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReceiptDto {
  @ApiProperty({ example: 'RCP-2026-0001' })
  @IsString() @IsNotEmpty() @MaxLength(50)
  receiptNumber!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  invoiceId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(30)
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional() @IsString() @MaxLength(10)
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  reference?: string;

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
