import { IsString, IsOptional, IsBoolean, IsNumber, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCurrencyDto {
  @ApiProperty({ example: 'USD' })
  @IsString() @MaxLength(5) code!: string;
  @ApiProperty({ example: 'US Dollar' })
  @IsString() @MaxLength(100) name!: string;
  @ApiPropertyOptional({ example: '$' })
  @IsOptional() @IsString() @MaxLength(5) symbol?: string;
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional() @IsNumber() exchangeRate?: number;
  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional({ default: 2 })
  @IsOptional() @IsNumber() @Min(0) decimalPlaces?: number;
}

export class UpdateCurrencyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5) symbol?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() exchangeRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) decimalPlaces?: number;
}
