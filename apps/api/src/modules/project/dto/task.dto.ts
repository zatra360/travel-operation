import { IsString, IsOptional, IsIn, IsNumber, IsBoolean, IsDateString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export class CreateTaskDto {
  @ApiProperty({ example: 'Design landing page' })
  @IsString() @MaxLength(300)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TASK_STATUSES, default: 'TODO' })
  @IsOptional() @IsIn(TASK_STATUSES)
  status?: string;

  @ApiPropertyOptional({ enum: TASK_PRIORITIES, default: 'MEDIUM' })
  @IsOptional() @IsIn(TASK_PRIORITIES)
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  kanbanOrder?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  isMilestone?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  estimatedHours?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  parentTaskId?: string;
}

export class UpdateTaskDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(300)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TASK_STATUSES })
  @IsOptional() @IsIn(TASK_STATUSES)
  status?: string;

  @ApiPropertyOptional({ enum: TASK_PRIORITIES })
  @IsOptional() @IsIn(TASK_PRIORITIES)
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  kanbanOrder?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isMilestone?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  estimatedHours?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  parentTaskId?: string;
}

export class ReorderTaskDto {
  @ApiProperty()
  @IsString()
  taskId!: string;

  @ApiProperty({ enum: TASK_STATUSES })
  @IsIn(TASK_STATUSES)
  status!: string;

  @ApiProperty()
  @IsNumber()
  kanbanOrder!: number;
}

export class QueryTaskDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TASK_STATUSES })
  @IsOptional() @IsIn(TASK_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  assignedToId?: string;
}

export class CreateChecklistDto {
  @ApiProperty({ example: 'Verify API endpoints' })
  @IsString() @MaxLength(300)
  title!: string;
}

export class CreateTimeLogDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  taskId?: string;

  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  endTime?: string;

  @ApiProperty({ default: 0 })
  @IsNumber() @Min(0)
  duration!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  billable?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  hourlyRate?: number;
}

export class UpdateTimeLogDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  taskId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  billable?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  hourlyRate?: number;
}

export class AddDependencyDto {
  @ApiProperty()
  @IsString()
  dependsOnTaskId!: string;
}
