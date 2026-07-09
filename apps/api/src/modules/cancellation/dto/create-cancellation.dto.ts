import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCancellationDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsString() @IsNotEmpty()
  bookingId!: string;

  @ApiPropertyOptional({ description: 'Ticket ID' })
  @IsOptional() @IsString()
  ticketId?: string;

  @ApiPropertyOptional({ description: 'Client ID' })
  @IsOptional() @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  cancellationCharge?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  refundableAmount?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  branchId?: string;

  @ApiPropertyOptional({ default: 'REQUESTED' })
  @IsOptional() @IsString()
  status?: string;
}
