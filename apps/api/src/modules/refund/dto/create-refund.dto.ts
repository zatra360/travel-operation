import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRefundDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsString() @IsNotEmpty()
  bookingId!: string;

  @ApiPropertyOptional({ description: 'Ticket ID' })
  @IsOptional() @IsString()
  ticketId?: string;

  @ApiPropertyOptional({ description: 'Invoice ID' })
  @IsOptional() @IsString()
  invoiceId?: string;

  @ApiPropertyOptional({ description: 'Client ID' })
  @IsOptional() @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  requestedAmount?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: 'REQUESTED' })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  branchId?: string;
}
