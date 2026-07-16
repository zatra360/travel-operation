import { Type } from 'class-transformer';
import {
  IsString, IsOptional, IsIn, IsBoolean, IsNumber, IsObject, IsArray,
  ArrayMinSize, ValidateNested, IsDateString, MaxLength, MinLength, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CASE_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export class AddServiceItemDto {
  @ApiProperty({ example: 'AIR_TICKET', description: 'Immutable service type system code' })
  @IsString()
  serviceTypeCode!: string;

  @ApiPropertyOptional({ enum: CASE_PRIORITIES })
  @IsOptional()
  @IsIn(CASE_PRIORITIES)
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Supplier (Vendor) id' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  targetCompletionDate?: string;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceAmount?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  supplierCost?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @ApiPropertyOptional({ description: 'Service-specific fields (route, destination, visa country, ...)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateServiceCaseDto {
  @ApiProperty({ example: 'Dubai trip for the Rahman family' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiPropertyOptional({ enum: CASE_PRIORITIES })
  @IsOptional()
  @IsIn(CASE_PRIORITIES)
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ example: 'WALK_IN' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiProperty({ type: [AddServiceItemDto], description: 'One or more connected services' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AddServiceItemDto)
  items!: AddServiceItemDto[];
}

export class QueryServiceCaseDto {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedToId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() teamId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serviceTypeCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

export class AssignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;
}

export class CloseCaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Close even while items are active (requires reason; recorded in audit)' })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class ReopenCaseDto {
  @ApiProperty()
  @IsString()
  @MinLength(5)
  reason!: string;
}

export class CancelItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  reason!: string;
}

export class TransitionDto {
  @ApiProperty({ example: 'REQUIREMENTS_COLLECTED' })
  @IsString()
  toStageCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CompleteChecklistDto {
  @ApiPropertyOptional({ description: 'Completion evidence (note, link, reference)' })
  @IsOptional()
  @IsString()
  evidence?: string;
}

export class RequestApprovalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class DecideApprovalDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class RequestCaseDocumentDto {
  @ApiProperty()
  @IsString()
  serviceCaseItemId!: string;

  @ApiProperty({ example: 'PASSPORT' })
  @IsString()
  @MaxLength(50)
  documentType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ enum: ['STANDARD', 'SENSITIVE', 'MEDICAL'] })
  @IsOptional()
  @IsIn(['STANDARD', 'SENSITIVE', 'MEDICAL'])
  accessClassification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class TransitionCaseDocumentDto {
  @ApiProperty({ enum: ['RECEIVED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'RESUBMITTED', 'VERIFIED', 'SUBMITTED', 'EXPIRED', 'REJECTED', 'ARCHIVED'] })
  @IsIn(['RECEIVED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'RESUBMITTED', 'VERIFIED', 'SUBMITTED', 'EXPIRED', 'REJECTED', 'ARCHIVED'])
  status!: string;

  @ApiPropertyOptional({ description: 'Storage Document id from the existing document upload flow' })
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  correctionInstructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
