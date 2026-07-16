import { IsString, IsOptional, IsBoolean, IsInt, IsObject, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConfigureServiceTypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Tenant display-name override (system code never changes)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultBranchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultTeamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultAssigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultWorkflowTemplateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;
}
