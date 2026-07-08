import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ example: true })
  success!: boolean;

  data!: T;

  @ApiProperty()
  timestamp!: string;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ example: true })
  success!: boolean;

  data!: T[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  timestamp!: string;
}
