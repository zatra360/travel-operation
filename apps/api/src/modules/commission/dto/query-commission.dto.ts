import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryCommissionDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  branchId?: string;
}
