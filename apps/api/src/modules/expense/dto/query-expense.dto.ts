import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { EXPENSE_STATUSES } from './create-expense.dto';

export class QueryExpenseDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: EXPENSE_STATUSES }) @IsOptional() @IsIn(EXPENSE_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
}
