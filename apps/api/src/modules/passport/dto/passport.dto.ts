import { IsString, IsOptional, IsBoolean, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePassportDto {
  @ApiProperty({ example: 'A01234567' })
  @IsString()
  @MaxLength(50)
  passportNumber!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MaxLength(200)
  fullName!: string;

  @ApiProperty({ example: '2030-01-15' })
  @IsDateString()
  expiryDate!: string;

  @ApiPropertyOptional({ example: '2020-01-15' })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional({ example: 'Bangladeshi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;

  @ApiPropertyOptional({ example: 'BD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePassportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  passportNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
