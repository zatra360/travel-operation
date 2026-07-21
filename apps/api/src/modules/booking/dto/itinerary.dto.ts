import { IsOptional, IsString, IsNumber, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateItineraryDayDto {
  @ApiProperty() @IsInt() dayNumber!: number;
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() activities?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hotelName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hotelConfirmation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() meals?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transfers?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guideName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sortOrder?: number;
}

export class UpdateItineraryDayDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() dayNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() activities?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hotelName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hotelConfirmation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() meals?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transfers?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guideName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sortOrder?: number;
}
