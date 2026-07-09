import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReissueDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsString() @IsNotEmpty()
  bookingId!: string;

  @ApiPropertyOptional({ description: 'Old Ticket ID' })
  @IsOptional() @IsString()
  oldTicketId?: string;

  @ApiPropertyOptional({ description: 'Client ID' })
  @IsOptional() @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  fareDifference?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  serviceCharge?: number;

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
