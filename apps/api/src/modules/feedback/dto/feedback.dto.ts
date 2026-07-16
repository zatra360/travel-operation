import { IsOptional, IsString, IsNumber, IsIn, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const FEEDBACK_CATEGORIES = ['SERVICE', 'BOOKING', 'TICKETING', 'VISA', 'HOTEL', 'TRANSPORT', 'GENERAL'];

export class CreateFeedbackDto {
  @ApiPropertyOptional() @IsOptional() @IsString() bookingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clientId?: string;
  @ApiProperty() @IsInt() @Min(1) @Max(5) rating!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(10) npsScore?: number;
  @ApiPropertyOptional({ enum: FEEDBACK_CATEGORIES }) @IsOptional() @IsIn(FEEDBACK_CATEGORIES) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublic?: boolean;
}

export class QueryFeedbackDto {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() bookingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
}
