import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const FOLLOWUP_CHANNELS = ['PHONE', 'EMAIL', 'WHATSAPP', 'MEETING', 'SMS'] as const;
export const FOLLOWUP_STATUSES = ['PENDING', 'COMPLETED', 'CANCELLED', 'MISSED'] as const;

export class CreateFollowUpDto {
  @ApiProperty({ example: 'Call to discuss quotation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ example: '2026-07-10T09:30:00Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional({ enum: FOLLOWUP_CHANNELS, default: 'PHONE' })
  @IsOptional()
  @IsIn(FOLLOWUP_CHANNELS)
  channel?: string;

  @ApiPropertyOptional({ example: 'Discuss the umrah package pricing' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Related lead ID' })
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiPropertyOptional({ description: 'Related client ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'User the follow-up is assigned to' })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Branch the follow-up belongs to' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
