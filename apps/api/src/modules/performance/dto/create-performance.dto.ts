import { IsString, IsNotEmpty, IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const REVIEW_STATUSES = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ACKNOWLEDGED'] as const;

export class CreatePerformanceDto {
  @ApiProperty() @IsString() @IsNotEmpty() employeeId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reviewerId?: string;
  @ApiProperty({ example: '2026-Q2' }) @IsString() @IsNotEmpty() period!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() strengths?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() improvements?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ enum: REVIEW_STATUSES, default: 'DRAFT' }) @IsOptional() @IsIn(REVIEW_STATUSES) status?: string;
}
