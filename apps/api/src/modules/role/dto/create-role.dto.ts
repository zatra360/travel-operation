import { IsString, IsNotEmpty, IsOptional, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'Sales Manager' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Manages sales team and leads' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['cm5abc123...', 'cm5def456...'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
}
