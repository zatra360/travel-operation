import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../../common/storage/storage.service';
import { RequestUploadDto } from './dto/request-upload.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';

const SENSITIVE_CATEGORIES = new Set(['PASSPORT', 'NID', 'VISA']);

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  async requestUpload(tenantId: string, dto: RequestUploadDto) {
    if (!this.storage.isEnabled()) {
      throw new BadRequestException('File storage is not configured on this server.');
    }
    const storageKey = this.storage.buildKey(tenantId, dto.category, dto.fileName);
    const uploadUrl = await this.storage.getUploadUrl(storageKey, dto.mimeType);
    return { uploadUrl, storageKey, expiresIn: 900 };
  }

  async create(tenantId: string, actorId: string, dto: CreateDocumentDto) {
    const doc = await this.prisma.document.create({
      data: {
        tenantId,
        branchId: dto.branchId ?? null,
        uploadedById: actorId,
        category: dto.category,
        fileName: dto.fileName,
        storageKey: dto.storageKey,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes ?? null,
        entity: dto.entity ?? null,
        entityId: dto.entityId ?? null,
      },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'DOCUMENT',
      'Document',
      doc.id,
      'CREATE',
      {
        category: doc.category,
        fileName: doc.fileName,
      },
      doc.branchId ?? undefined,
    );

    return doc;
  }

  async findAll(tenantId: string, query: QueryDocumentDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, deletedAt: null };
    if (query.category) where.category = query.category;
    if (query.entity) where.entity = query.entity;
    if (query.entityId) where.entityId = query.entityId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) where.fileName = { contains: query.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async getDownloadUrl(tenantId: string, actorId: string, id: string) {
    const doc = await this.findById(tenantId, id);
    const url = await this.storage.getDownloadUrl(doc.storageKey, doc.fileName);

    if (SENSITIVE_CATEGORIES.has(doc.category)) {
      await this.audit.logMutation(
        actorId,
        tenantId,
        'DOCUMENT',
        'Document',
        doc.id,
        'EXPORT',
        {
          category: doc.category,
          fileName: doc.fileName,
          access: 'download',
        },
        doc.branchId ?? undefined,
      );
    }

    return { url, fileName: doc.fileName, expiresIn: 900 };
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const doc = await this.findById(tenantId, id);

    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'DOCUMENT',
      'Document',
      doc.id,
      'DELETE',
      {
        category: doc.category,
        fileName: doc.fileName,
      },
      doc.branchId ?? undefined,
    );

    return { id, deleted: true };
  }
}
