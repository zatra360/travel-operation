import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString, IsInt, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'HOLIDAY'] as const;

export class CreateAttendanceDto {
  @ApiProperty() @IsString() @IsNotEmpty() employeeId!: string;
  @ApiProperty() @IsDateString() date!: string;
  @ApiPropertyOptional({ enum: ATTENDANCE_STATUSES, default: 'PRESENT' }) @IsOptional() @IsIn(ATTENDANCE_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() clockIn?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() clockOut?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
