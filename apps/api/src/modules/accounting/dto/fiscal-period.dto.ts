import { IsString, IsOptional, IsIn, IsDateString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFiscalYearDto {
  @ApiProperty({ example: 'FY2026' })
  @IsString()
  @MaxLength(20)
  code!: string;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2027-06-30' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ enum: ['MONTHLY', 'NONE'], default: 'MONTHLY', description: 'Auto-generate accounting periods' })
  @IsOptional()
  @IsIn(['MONTHLY', 'NONE'])
  generatePeriods?: string;
}

export class ClosePeriodDto {
  @ApiProperty({ enum: ['SOFT_CLOSE', 'CLOSE', 'LOCK'] })
  @IsIn(['SOFT_CLOSE', 'CLOSE', 'LOCK'])
  action!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReopenPeriodDto {
  @ApiProperty({ description: 'Justification is mandatory for reopening a period' })
  @IsString()
  @MinLength(5)
  reason!: string;

  @ApiPropertyOptional({ description: 'Approving user id (must differ from requester)' })
  @IsOptional()
  @IsString()
  approvedById?: string;
}
