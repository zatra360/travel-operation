import { IsString, IsNotEmpty, IsOptional, IsIn, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DOCUMENT_CATEGORIES } from './request-upload.dto';

export class CreateDocumentDto {
  @ApiProperty({ description: 'Storage key returned by request-upload' })
  @IsString()
  @IsNotEmpty()
  storageKey!: string;

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

  @ApiPropertyOptional({ example: 1048576 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional({
    example: 'Lead',
    description: 'Owner entity type this file is attached to',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  entity?: string;

  @ApiPropertyOptional({ description: 'Owner entity ID' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Branch the document belongs to' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
