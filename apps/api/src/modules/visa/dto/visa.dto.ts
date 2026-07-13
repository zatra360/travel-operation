import { IsString, IsOptional, IsIn, IsInt, IsBoolean, IsDateString, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const VISA_STATUSES = ['PENDING', 'APPLIED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED'] as const;
export const VISA_TYPES = ['TOURIST', 'BUSINESS', 'WORK', 'STUDENT', 'TRANSIT', 'UMRAH', 'HAJJ', 'MEDICAL', 'DIPLOMATIC', 'OTHER'] as const;
export const ENTRY_TYPES = ['SINGLE', 'MULTIPLE', 'DOUBLE'] as const;

export class CreateVisaDto {
  @ApiPropertyOptional({ enum: VISA_TYPES, default: 'TOURIST' })
  @IsOptional()
  @IsIn(VISA_TYPES)
  visaType?: string;

  @ApiPropertyOptional({ example: 'USA1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  visaNumber?: string;

  @ApiPropertyOptional({ description: 'Destination country ID' })
  @IsOptional()
  @IsString()
  countryId?: string;

  @ApiPropertyOptional({ description: 'Linked passport ID' })
  @IsOptional()
  @IsString()
  passportId?: string;

  @ApiPropertyOptional({ enum: VISA_STATUSES, default: 'PENDING' })
  @IsOptional()
  @IsIn(VISA_STATUSES)
  status?: string;

  @ApiPropertyOptional({ enum: ENTRY_TYPES })
  @IsOptional()
  @IsIn(ENTRY_TYPES)
  entryType?: string;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  applicationDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateVisaDto {
  @ApiPropertyOptional({ enum: VISA_TYPES })
  @IsOptional()
  @IsIn(VISA_TYPES)
  visaType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  visaNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passportId?: string;

  @ApiPropertyOptional({ enum: VISA_STATUSES })
  @IsOptional()
  @IsIn(VISA_STATUSES)
  status?: string;

  @ApiPropertyOptional({ enum: ENTRY_TYPES })
  @IsOptional()
  @IsIn(ENTRY_TYPES)
  entryType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  applicationDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  approvalDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
