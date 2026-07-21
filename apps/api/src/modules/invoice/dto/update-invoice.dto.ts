import { OmitType } from '@nestjs/swagger';
import { CreateInvoiceDto } from './create-invoice.dto';

export class UpdateInvoiceDto extends OmitType(CreateInvoiceDto, ['paidAmount', 'dueAmount'] as const) {}
