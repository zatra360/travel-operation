import { IsString, IsNotEmpty, IsOptional, IsEmail, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const;
export const LEAD_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export class CreateLeadDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+8801712345678' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ enum: LEAD_STATUSES, default: 'NEW' })
  @IsOptional()
  @IsIn(LEAD_STATUSES)
  status?: string;

  @ApiPropertyOptional({ enum: LEAD_PRIORITIES, default: 'MEDIUM' })
  @IsOptional()
  @IsIn(LEAD_PRIORITIES)
  priority?: string;

  @ApiPropertyOptional({ example: 'WEBSITE' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @ApiPropertyOptional({ example: 'FLIGHT' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  serviceType?: string;

  @ApiPropertyOptional({ example: 'Interested in umrah package' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'User ID the lead is assigned to' })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Branch the lead belongs to' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
