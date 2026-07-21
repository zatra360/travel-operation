import { IsString, IsOptional, IsBoolean, IsIn, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const GL_ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE', 'OTHER_INCOME', 'OTHER_EXPENSE'] as const;
export const NORMAL_BALANCES = ['DEBIT', 'CREDIT'] as const;
export const CONTROL_ACCOUNT_TYPES = [
  'ACCOUNTS_RECEIVABLE', 'ACCOUNTS_PAYABLE', 'INVENTORY', 'CASH', 'BANK',
  'TAX_PAYABLE', 'TAX_RECEIVABLE', 'PAYROLL_PAYABLE', 'PETTY_CASH', 'RETAINED_EARNINGS',
] as const;

export class CreateGLAccountDto {
  @ApiProperty({ example: '1000' })
  @IsString()
  @MaxLength(20)
  accountCode!: string;

  @ApiProperty({ example: 'Cash in Hand' })
  @IsString()
  @MaxLength(200)
  accountName!: string;

  @ApiProperty({ enum: GL_ACCOUNT_TYPES })
  @IsIn(GL_ACCOUNT_TYPES)
  accountType!: string;

  @ApiProperty({ enum: NORMAL_BALANCES })
  @IsIn(NORMAL_BALANCES)
  normalBalance!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentAccountId?: string;

  @ApiPropertyOptional({ enum: CONTROL_ACCOUNT_TYPES })
  @IsOptional()
  @IsIn(CONTROL_ACCOUNT_TYPES)
  controlAccountType?: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowManualPosting?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateGLAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  accountName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentAccountId?: string;

  @ApiPropertyOptional({ enum: CONTROL_ACCOUNT_TYPES })
  @IsOptional()
  @IsIn(CONTROL_ACCOUNT_TYPES)
  controlAccountType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowManualPosting?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
