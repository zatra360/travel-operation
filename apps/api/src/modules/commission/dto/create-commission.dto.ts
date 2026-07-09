import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommissionDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsString() @IsNotEmpty()
  employeeId!: string;

  @ApiProperty({ description: 'Source type (BOOKING, TICKET, QUOTATION)' })
  @IsString() @MaxLength(50)
  sourceType!: string;

  @ApiPropertyOptional({ description: 'Source ID' })
  @IsOptional() @IsString()
  sourceId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional() @IsString() @MaxLength(10)
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  calculationBasis?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: 'PENDING' })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  branchId?: string;
}
