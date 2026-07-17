import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const TICKET_STATUSES = ['PENDING', 'ISSUED', 'VOIDED', 'REFUNDED', 'REISSUED'] as const;

export class CreateTicketDto {
  @ApiPropertyOptional({ example: 'TKT-2026-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ticketNumber?: string;

  @ApiProperty({ description: 'Booking ID this ticket belongs to' })
  @IsString()
  @IsNotEmpty()
  bookingId!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  passengerName?: string;

  @ApiPropertyOptional({ description: 'Passenger ID from booking passengers' })
  @IsOptional()
  @IsString()
  passengerId?: string;

  @ApiPropertyOptional({ description: 'Airline ID from master data' })
  @IsOptional()
  @IsString()
  airlineId?: string;

  @ApiPropertyOptional({ enum: TICKET_STATUSES, default: 'PENDING' })
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: string;

  @ApiPropertyOptional({ description: 'Date when ticket was issued' })
  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @ApiPropertyOptional({ description: 'Date when ticket was voided' })
  @IsOptional()
  @IsDateString()
  voidAt?: string;

  @ApiPropertyOptional({ description: 'Additional ticket metadata (JSON)' })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
