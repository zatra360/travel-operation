import { IsString, IsNotEmpty, IsOptional, IsEmail, IsIn, IsBoolean, IsInt, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const;
export const LEAD_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export class CreateLeadDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString() @IsNotEmpty() @MaxLength(150) fullName!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) primaryMobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) whatsappNumber?: string;

  @ApiPropertyOptional({ enum: LEAD_STATUSES, default: 'NEW' }) @IsOptional() @IsIn(LEAD_STATUSES) status?: string;
  @ApiPropertyOptional({ enum: LEAD_PRIORITIES, default: 'MEDIUM' }) @IsOptional() @IsIn(LEAD_PRIORITIES) priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) serviceType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedToId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;

  // Travel requirement
  @ApiPropertyOptional() @IsOptional() @IsString() travelCategory?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDomestic?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() tripType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departureCity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() destinationCity?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() numAdults?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() numChildren?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() numInfants?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() preferredTravelDate?: string;

  // Source
  @ApiPropertyOptional() @IsOptional() @IsString() sourcePlatform?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() campaignName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referralSource?: string;
}
