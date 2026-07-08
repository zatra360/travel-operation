import { IsOptional, IsString, IsIn, IsBoolean, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { LEAD_STATUSES, LEAD_PRIORITIES } from './create-lead.dto';

export class QueryLeadDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: LEAD_STATUSES }) @IsOptional() @IsIn(LEAD_STATUSES) status?: string;
  @ApiPropertyOptional({ enum: LEAD_PRIORITIES }) @IsOptional() @IsIn(LEAD_PRIORITIES) priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedToId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serviceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() leadTemperature?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCorporateLead?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() travelDateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() travelDateTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() nextFollowUpFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() nextFollowUpTo?: string;
}
