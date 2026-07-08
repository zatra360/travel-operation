import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const DOCUMENT_CATEGORIES = [
  'PASSPORT',
  'NID',
  'VISA',
  'TICKET',
  'INVOICE',
  'RECEIPT',
  'QUOTATION',
  'EMPLOYEE',
  'SUPPLIER_AGREEMENT',
  'AUDIT_EVIDENCE',
  'OTHER',
] as const;

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export class RequestUploadDto {
  @ApiProperty({ example: 'passport-john.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  mimeType!: string;

  @ApiProperty({ enum: DOCUMENT_CATEGORIES })
  @IsIn(DOCUMENT_CATEGORIES)
  category!: string;

  @ApiPropertyOptional({ example: 1048576, description: 'File size in bytes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_UPLOAD_BYTES)
  sizeBytes?: number;
}
