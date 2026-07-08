import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { REVIEW_STATUSES } from './create-performance.dto';

export class QueryPerformanceDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
  @ApiPropertyOptional({ enum: REVIEW_STATUSES }) @IsOptional() @IsIn(REVIEW_STATUSES) status?: string;
}
