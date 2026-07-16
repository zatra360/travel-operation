import { IsString, IsNotEmpty, IsOptional, IsEmail, IsBoolean, IsInt, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeadDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString() @IsNotEmpty() @MaxLength(150) fullName!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) primaryMobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) whatsappNumber?: string;

  @ApiPropertyOptional({ default: 'NEW' }) @IsOptional() @IsString() @MaxLength(50) status?: string;
  @ApiPropertyOptional({ default: 'MEDIUM' }) @IsOptional() @IsString() @MaxLength(50) priority?: string;
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

  // Reference data IDs
  @ApiPropertyOptional() @IsOptional() @IsString() countryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departureAirportId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() destinationAirportId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() preferredAirlineIds?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cabinTypeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() approxBudget?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() returnDate?: string;
}
