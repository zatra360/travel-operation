import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString, MaxLength, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const EMPLOYEE_STATUSES = ['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'] as const;

export class CreateEmployeeDto {
  @ApiPropertyOptional({ example: 'EMP-001' })
  @IsOptional() @IsString() @MaxLength(50)
  employeeCode?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  departmentId?: string;

  @ApiProperty({ example: 'John' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  position?: string;

  @ApiPropertyOptional({ enum: EMPLOYEE_STATUSES, default: 'ACTIVE' })
  @IsOptional() @IsIn(EMPLOYEE_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  joinedAt?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  branchId?: string;
}
