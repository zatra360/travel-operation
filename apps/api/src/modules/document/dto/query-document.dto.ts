import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DOCUMENT_CATEGORIES } from './request-upload.dto';

export class QueryDocumentDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by file name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: DOCUMENT_CATEGORIES })
  @IsOptional()
  @IsIn(DOCUMENT_CATEGORIES)
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by owner entity type' })
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiPropertyOptional({ description: 'Filter by owner entity ID' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Filter by branch ID' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
