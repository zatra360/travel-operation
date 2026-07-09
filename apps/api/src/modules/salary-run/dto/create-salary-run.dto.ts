import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSalaryRunDto {
  @ApiProperty({ example: 'January 2026' })
  @IsString() @IsNotEmpty() @MaxLength(50)
  period!: string;

  @ApiProperty({ description: 'Period start date' })
  @IsDateString()
  periodStart!: string;

  @ApiProperty({ description: 'Period end date' })
  @IsDateString()
  periodEnd!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  branchId?: string;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional() @IsString() @MaxLength(10)
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: 'DRAFT' })
  @IsOptional() @IsString()
  status?: string;
}
