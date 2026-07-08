import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingDto {
  @ApiProperty({ example: { defaultCurrency: 'USD', timezone: 'UTC' } })
  @IsNotEmpty()
  value: any;
}
