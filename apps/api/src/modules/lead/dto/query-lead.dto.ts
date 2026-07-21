import { IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryLeadDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
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
