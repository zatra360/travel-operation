import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { INVOICE_STATUSES } from './create-invoice.dto';

export class QueryInvoiceDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: INVOICE_STATUSES })
  @IsOptional() @IsIn(INVOICE_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  branchId?: string;
}
