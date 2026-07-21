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

const SAFE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
] as const;

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
  @IsIn(SAFE_MIME_TYPES, { message: 'Unsupported file type. Allowed: PDF, images, Office documents, CSV, text' })
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
