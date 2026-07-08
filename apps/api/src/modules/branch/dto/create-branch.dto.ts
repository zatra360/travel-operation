import { IsString, IsNotEmpty, Matches, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty({ example: 'Head Office' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'HQ' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_]+$/, { message: 'Code must contain only uppercase letters, numbers, and underscores' })
  @MaxLength(20)
  code!: string;

  @ApiPropertyOptional({ example: '123 Main St, City' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+8801712345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'branch@travelo.com' })
  @IsOptional()
  @IsString()
  email?: string;
}
