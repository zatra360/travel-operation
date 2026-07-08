import { IsString, IsNotEmpty, IsOptional, IsEmail, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'Demo Travel Agency' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'demo-travel' })
  @IsString() @IsNotEmpty() @Matches(/^[a-z0-9-]+$/, { message: 'Slug must contain only lowercase letters, numbers, and hyphens' })
  @MaxLength(50)
  slug!: string;

  @ApiPropertyOptional({ example: 'owner@demo.com', description: 'Email of the tenant owner user' })
  @IsOptional() @IsEmail()
  ownerEmail?: string;
}
