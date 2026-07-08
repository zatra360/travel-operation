import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { FOLLOWUP_STATUSES, FOLLOWUP_CHANNELS } from './create-follow-up.dto';

export class QueryFollowUpDto extends PaginationDto {
  @ApiPropertyOptional({ enum: FOLLOWUP_STATUSES })
  @IsOptional()
  @IsIn(FOLLOWUP_STATUSES)
  status?: string;

  @ApiPropertyOptional({ enum: FOLLOWUP_CHANNELS })
  @IsOptional()
  @IsIn(FOLLOWUP_CHANNELS)
  channel?: string;

  @ApiPropertyOptional({ description: 'Filter by lead ID' })
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiPropertyOptional({ description: 'Filter by client ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filter by assigned user ID' })
  @IsOptional()
  @IsString()
  assignedToId?: string;
}
