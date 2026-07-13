import { IsString, IsEmail, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John' })
  @IsString() @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString() @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: 'john@agency.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString() @MinLength(8) @MaxLength(100)
  password!: string;

  @ApiProperty({ example: 'My Travel Agency' })
  @IsString() @MinLength(2) @MaxLength(100)
  companyName!: string;

  @ApiPropertyOptional({ example: 'my-agency' })
  @IsOptional() @IsString() @MaxLength(50)
  companySlug?: string;
}
