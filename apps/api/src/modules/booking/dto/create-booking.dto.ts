import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const BOOKING_STATUSES = ['HELD', 'CONFIRMED', 'TICKETED', 'CANCELLED', 'REFUNDED', 'VOIDED'] as const;

export class CreateBookingDto {
  @ApiPropertyOptional({ example: 'BK-2026-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bookingRef?: string;

  @ApiPropertyOptional({ example: 'ABC123' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  pnrLocator?: string;

  @ApiPropertyOptional({ enum: BOOKING_STATUSES, default: 'HELD' })
  @IsOptional()
  @IsIn(BOOKING_STATUSES)
  status?: string;

  @ApiPropertyOptional({ description: 'Client ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Quotation ID' })
  @IsOptional()
  @IsString()
  quotationId?: string;

  @ApiPropertyOptional({ description: 'Lead ID' })
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiPropertyOptional({ description: 'Assigned user ID' })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Travel start date' })
  @IsOptional()
  @IsDateString()
  travelStart?: string;

  @ApiPropertyOptional({ description: 'Travel end date' })
  @IsOptional()
  @IsDateString()
  travelEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Hold expiry date/time' })
  @IsOptional()
  @IsDateString()
  holdExpiresAt?: string;

  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
