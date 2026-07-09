import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryReissueDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bookingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}
