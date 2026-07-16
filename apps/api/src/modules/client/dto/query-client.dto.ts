import { IsOptional, IsString, IsIn, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { CLIENT_TYPES, CLIENT_STATUSES } from './create-client.dto';

export class QueryClientDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by name, email, or phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CLIENT_TYPES })
  @IsOptional()
  @IsIn(CLIENT_TYPES)
  type?: string;

  @ApiPropertyOptional({ enum: CLIENT_STATUSES })
  @IsOptional()
  @IsIn(CLIENT_STATUSES)
  status?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVip?: boolean;

  @ApiPropertyOptional({ enum: ['createdAt', 'activityScore'], default: 'createdAt' })
  @IsOptional()
  @IsIn(['createdAt', 'activityScore'])
  sortBy?: string;
}
