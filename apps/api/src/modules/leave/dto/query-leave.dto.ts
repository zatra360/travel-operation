import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { LEAVE_STATUSES } from './create-leave.dto';

export class QueryLeaveDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
  @ApiPropertyOptional({ enum: LEAVE_STATUSES }) @IsOptional() @IsIn(LEAVE_STATUSES) status?: string;
}
