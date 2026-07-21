import { IsString, IsEmail, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';
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
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password!: string;

  @ApiProperty({ example: 'My Travel Agency' })
  @IsString() @MinLength(2) @MaxLength(100)
  companyName!: string;

  @ApiPropertyOptional({ example: 'my-agency' })
  @IsOptional() @IsString() @MaxLength(50)
  companySlug?: string;
}
