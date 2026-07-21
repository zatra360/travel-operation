import { IsString, IsOptional, IsIn, IsNumber, IsBoolean, IsDateString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export const PROJECT_STATUSES = ['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;
export const PROJECT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export const PROJECT_STATUS_TRANSITIONS: Record<string, string[]> = {
  PLANNING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: ['PLANNING'],
};

export class CreateProjectDto {
  @ApiProperty({ example: 'Umrah Package Q3' })
  @IsString() @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PROJECT_STATUSES, default: 'PLANNING' })
  @IsOptional() @IsIn(PROJECT_STATUSES)
  status?: string;

  @ApiPropertyOptional({ enum: PROJECT_PRIORITIES, default: 'MEDIUM' })
  @IsOptional() @IsIn(PROJECT_PRIORITIES)
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @IsNumber() @Min(0)
  budget?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(10)
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PROJECT_STATUSES })
  @IsOptional() @IsIn(PROJECT_STATUSES)
  status?: string;

  @ApiPropertyOptional({ enum: PROJECT_PRIORITIES })
  @IsOptional() @IsIn(PROJECT_PRIORITIES)
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  budget?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(10)
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}

export class QueryProjectDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PROJECT_STATUSES })
  @IsOptional() @IsIn(PROJECT_STATUSES)
  status?: string;
}

export class AddProjectMemberDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiPropertyOptional({ default: 'MEMBER' })
  @IsOptional() @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  hourlyRate?: number;
}

export class UpdateProjectMemberDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  hourlyRate?: number;
}
