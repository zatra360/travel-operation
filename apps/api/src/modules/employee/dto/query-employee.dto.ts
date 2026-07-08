import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { EMPLOYEE_STATUSES } from './create-employee.dto';

export class QueryEmployeeDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: EMPLOYEE_STATUSES }) @IsOptional() @IsIn(EMPLOYEE_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
}
