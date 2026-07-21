import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMasterDataCategoryDto {
  @ApiProperty() @IsString() @IsNotEmpty() @Matches(/^[a-z0-9_-]+$/, { message: 'code must use lowercase letters, numbers, dashes, and underscores' }) code!: string;
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() module?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSystem?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateMasterDataCategoryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() module?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;
}

export class CreateMasterDataItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() categoryId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @Matches(/^[A-Z0-9_]+$/, { message: 'code must use uppercase letters, numbers, and underscores' }) code!: string;
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() displayName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^#?[0-9A-Fa-f]{3,8}$/, { message: 'color must be a valid hex color (e.g. #3B82F6)' }) color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[a-z0-9-]+$/, { message: 'icon must be lowercase alphanumeric with dashes' }) icon?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSystem?: boolean;
}

export class UpdateMasterDataItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() displayName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^#?[0-9A-Fa-f]{3,8}$/, { message: 'color must be a valid hex color (e.g. #3B82F6)' }) color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[a-z0-9-]+$/, { message: 'icon must be lowercase alphanumeric with dashes' }) icon?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpsertTenantOverrideDto {
  @ApiProperty() @IsString() @IsNotEmpty() categoryCode!: string;
  @ApiProperty() @IsString() @IsNotEmpty() code!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() displayName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() icon?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isHidden?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCustom?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
}

export class HideRestoreItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() categoryCode!: string;
  @ApiProperty() @IsString() @IsNotEmpty() code!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
}
