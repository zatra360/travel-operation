import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignQuotationDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MaxLength(200)
  fullName!: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ description: 'Base64-encoded signature image' })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  consentGiven?: boolean;
}

export class ClientCommentDto {
  @ApiProperty({ example: 'Looks good, please proceed.' })
  @IsString()
  @MaxLength(2000)
  comment!: string;
}
