import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const LEAVE_TYPES = ['SICK', 'ANNUAL', 'UNPAID', 'MATERNITY', 'PATERNITY', 'EMERGENCY', 'OTHER'] as const;
export const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;

export class CreateLeaveDto {
  @ApiProperty() @IsString() @IsNotEmpty() employeeId!: string;
  @ApiProperty({ enum: LEAVE_TYPES }) @IsString() @IsIn(LEAVE_TYPES) leaveType!: string;
  @ApiProperty() @IsDateString() startDate!: string;
  @ApiProperty() @IsDateString() endDate!: string;
  @ApiPropertyOptional({ enum: LEAVE_STATUSES, default: 'PENDING' }) @IsOptional() @IsIn(LEAVE_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
