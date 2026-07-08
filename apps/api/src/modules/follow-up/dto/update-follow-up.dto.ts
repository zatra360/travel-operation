import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsIn, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateFollowUpDto, FOLLOWUP_STATUSES } from './create-follow-up.dto';

export class UpdateFollowUpDto extends PartialType(CreateFollowUpDto) {
  @ApiPropertyOptional({ enum: FOLLOWUP_STATUSES })
  @IsOptional()
  @IsIn(FOLLOWUP_STATUSES)
  status?: string;

  @ApiPropertyOptional({ example: 'Client agreed to proceed' })
  @IsOptional()
  @IsString()
  outcome?: string;

  @ApiPropertyOptional({ example: '2026-07-10T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  completedAt?: string;
}
