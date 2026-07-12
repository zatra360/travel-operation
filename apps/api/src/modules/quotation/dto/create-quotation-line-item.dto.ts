import { IsString, IsOptional, IsInt, IsNumber, Min, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const SERVICE_TYPES = ['FLIGHT', 'HOTEL', 'VISA', 'INSURANCE', 'TRANSFER', 'TOUR', 'PACKAGE', 'OTHER'] as const;

export class CreateQuotationLineItemDto {
  @ApiPropertyOptional({ enum: SERVICE_TYPES, default: 'OTHER' })
  @IsOptional()
  @IsIn(SERVICE_TYPES)
  serviceType?: string;

  @ApiProperty({ example: 'Round-trip airfare DAC-JED' })
  @IsString()
  @MaxLength(300)
  title!: string;

  @ApiPropertyOptional({ example: 'Economy class, 2 checked bags' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;

  @ApiPropertyOptional({ example: 850.00, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number = 0;

  @ApiPropertyOptional({ description: 'Tax amount for this line item' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number = 0;

  @ApiPropertyOptional({ description: 'Discount amount for this line item' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number = 0;

  @ApiPropertyOptional({ description: 'Airline ID (for flight service type)' })
  @IsOptional()
  @IsString()
  airlineId?: string;

  @ApiPropertyOptional({ description: 'Origin airport ID (for flight service type)' })
  @IsOptional()
  @IsString()
  originAirportId?: string;

  @ApiPropertyOptional({ description: 'Destination airport ID (for flight service type)' })
  @IsOptional()
  @IsString()
  destAirportId?: string;

  @ApiPropertyOptional({ description: 'Route ID' })
  @IsOptional()
  @IsString()
  routeId?: string;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;

  @ApiPropertyOptional({ description: 'Additional metadata as JSON' })
  @IsOptional()
  metadata?: Record<string, any>;
}
