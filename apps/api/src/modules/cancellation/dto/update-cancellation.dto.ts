import { PartialType } from '@nestjs/swagger';
import { CreateCancellationDto } from './create-cancellation.dto';

export class UpdateCancellationDto extends PartialType(CreateCancellationDto) {}
