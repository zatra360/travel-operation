import { PartialType } from '@nestjs/swagger';
import { CreateSalaryRunDto } from './create-salary-run.dto';

export class UpdateSalaryRunDto extends PartialType(CreateSalaryRunDto) {}
