import { IsString, IsNotEmpty, IsOptional, IsEmail, MinLength, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'TripNow Limited' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'tripnow-limited' })
  @IsString() @IsNotEmpty() @Matches(/^[a-z0-9-]+$/, { message: 'Slug must contain only lowercase letters, numbers, and hyphens' })
  @MaxLength(50)
  slug!: string;

  @ApiPropertyOptional({ example: 'owner@tripnow.com' })
  @IsOptional() @IsEmail()
  ownerEmail?: string;

  @ApiPropertyOptional({ description: 'Auto-create owner user if not exists' })
  @IsOptional() @IsString() @MinLength(6)
  ownerPassword?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  ownerFirstName?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  ownerLastName?: string;
}
