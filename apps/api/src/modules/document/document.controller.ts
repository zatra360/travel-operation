import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { RequestUploadDto } from './dto/request-upload.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload-url')
  @RequirePermissions('DOCUMENT_CREATE')
  @ApiOperation({ summary: 'Request a presigned upload URL for R2' })
  async requestUpload(@TenantCtx() ctx: TenantContext, @Body() dto: RequestUploadDto) {
    return this.documentService.requestUpload(ctx.tenantId, dto);
  }

  @Post()
  @RequirePermissions('DOCUMENT_CREATE')
  @ApiOperation({ summary: 'Register an uploaded document' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateDocumentDto) {
    return this.documentService.create(ctx.tenantId, ctx.userId, dto);
  }

  @Get()
  @RequirePermissions('DOCUMENT_READ')
  @ApiOperation({ summary: 'List documents for current tenant' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryDocumentDto) {
    return this.documentService.findAll(ctx.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('DOCUMENT_READ')
  @ApiOperation({ summary: 'Get document metadata by ID' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.documentService.findById(ctx.tenantId, id);
  }

  @Get(':id/download')
  @RequirePermissions('DOCUMENT_READ')
  @ApiOperation({ summary: 'Get a presigned download URL (sensitive access audited)' })
  async download(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.documentService.getDownloadUrl(ctx.tenantId, ctx.userId, id);
  }

  @Delete(':id')
  @RequirePermissions('DOCUMENT_DELETE')
  @ApiOperation({ summary: 'Soft delete a document' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.documentService.remove(ctx.tenantId, ctx.userId, id);
  }
}
