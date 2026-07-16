import { Type } from 'class-transformer';
import {
  IsString, IsOptional, IsIn, IsDateString, IsArray, ArrayMinSize,
  ValidateNested, IsNumber, Min, MaxLength, MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const JOURNAL_TYPES = ['GENERAL', 'MANUAL', 'SALES', 'PURCHASE', 'PAYMENT', 'RECEIPT', 'EXPENSE', 'INVENTORY', 'PAYROLL', 'TAX', 'OPENING', 'REVALUATION'] as const;

export class JournalLineDto {
  @ApiProperty()
  @IsString()
  accountId!: string;

  @ApiProperty({ example: 100, description: 'Positive debit amount in transaction currency (0 when credit line)' })
  @IsNumber()
  @Min(0)
  debit!: number;

  @ApiProperty({ example: 0, description: 'Positive credit amount in transaction currency (0 when debit line)' })
  @IsNumber()
  @Min(0)
  credit!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'CUSTOMER | VENDOR | EMPLOYEE' })
  @IsOptional()
  @IsIn(['CUSTOMER', 'VENDOR', 'EMPLOYEE'])
  partyType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  costCenter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxCodeId?: string;
}

export class CreateJournalDto {
  @ApiPropertyOptional({ enum: JOURNAL_TYPES, default: 'MANUAL' })
  @IsOptional()
  @IsIn(JOURNAL_TYPES)
  journalType?: string;

  @ApiProperty({ example: '2026-07-16' })
  @IsDateString()
  entryDate!: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0.00000001)
  exchangeRate?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  functionalCurrencyCode?: string;

  @ApiPropertyOptional({ description: 'Source document type (e.g. Invoice, Payment)' })
  @IsOptional()
  @IsString()
  sourceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [JournalLineDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines!: JournalLineDto[];
}

export class ApproveJournalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class ReverseJournalDto {
  @ApiProperty({ description: 'Justification is mandatory for reversals' })
  @IsString()
  @MinLength(5)
  reason!: string;

  @ApiPropertyOptional({ description: 'Accounting date for the reversal entry (defaults to now)' })
  @IsOptional()
  @IsDateString()
  entryDate?: string;
}

export class QueryJournalDto {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() journalType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
}
