import { IsOptional, IsString, IsNumber, IsIn, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const INSURANCE_TYPES = ['TRAVEL', 'MEDICAL', 'CANCELLATION', 'BAGGAGE', 'COMPREHENSIVE'];
const INSURANCE_STATUSES = ['ACTIVE', 'EXPIRED', 'CANCELLED', 'CLAIMED'];

export class CreateInsuranceDto {
  @ApiProperty() @IsString() policyNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() providerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bookingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clientId?: string;
  @ApiPropertyOptional({ enum: INSURANCE_TYPES }) @IsOptional() @IsIn(INSURANCE_TYPES) insuranceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coverage?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() premium?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currencyCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sumInsured?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
}

export class UpdateInsuranceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() policyNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() providerId?: string;
  @ApiPropertyOptional({ enum: INSURANCE_TYPES }) @IsOptional() @IsIn(INSURANCE_TYPES) insuranceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coverage?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() premium?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sumInsured?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional({ enum: INSURANCE_STATUSES }) @IsOptional() @IsIn(INSURANCE_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class QueryInsuranceDto {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bookingId?: string;
}
