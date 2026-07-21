import { PartialType } from '@nestjs/swagger';
import { CreateQuotationDto } from './create-quotation.dto';
import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateQuotationDto extends PartialType(CreateQuotationDto) {
  @ApiPropertyOptional({ description: 'Public share hash' })
  @IsOptional()
  @IsString()
  publicHash?: string;

  @ApiPropertyOptional({ description: 'Send status tracking' })
  @IsOptional()
  @IsString()
  sendStatus?: string;
}
