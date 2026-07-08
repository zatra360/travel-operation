import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsIn,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CLIENT_TYPES = ['PERSON', 'COMPANY'] as const;
export const CLIENT_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED'] as const;
export const CLIENT_GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;

export class CreateClientDto {
  @ApiProperty({ example: 'Jane Smith' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  displayName!: string;

  @ApiPropertyOptional({ enum: CLIENT_TYPES, default: 'PERSON' })
  @IsOptional()
  @IsIn(CLIENT_TYPES)
  type?: string;

  @ApiPropertyOptional({ enum: CLIENT_STATUSES, default: 'ACTIVE' })
  @IsOptional()
  @IsIn(CLIENT_STATUSES)
  status?: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+8801712345678' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'Acme Travels Ltd' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  companyName?: string;

  @ApiPropertyOptional({ description: 'Nationality ID' })
  @IsOptional()
  @IsString()
  nationalityId?: string;

  @ApiPropertyOptional({ example: '1990-01-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: CLIENT_GENDERS })
  @IsOptional()
  @IsIn(CLIENT_GENDERS)
  gender?: string;

  @ApiPropertyOptional({ description: 'Branch the client belongs to' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
