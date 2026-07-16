import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const EXPENSE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'PAID'] as const;

export class CreateExpenseDto {
  @ApiPropertyOptional({ example: 'EXP-2026-0001' })
  @IsOptional() @IsString() @MaxLength(50)
  expenseNumber?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  vendorName?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  vendorId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional() @IsString() @MaxLength(10)
  currencyCode?: string;

  @ApiPropertyOptional({ enum: EXPENSE_STATUSES, default: 'PENDING' })
  @IsOptional() @IsIn(EXPENSE_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  expenseDate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  branchId?: string;
}
