import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, TenantCtx, TenantContext, CurrentUser, AuthUser, RequirePermissions } from '../../common';

@ApiTags('Tenant - Knowledge Hub')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/knowledge')
export class KnowledgeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('DASHBOARD_READ')
  @ApiOperation({ summary: 'List knowledge articles' })
  async list(@TenantCtx() ctx: TenantContext, @Query('category') category?: string) {
    const where: any = { tenantId: ctx.tenantId, deletedAt: null };
    if (category) where.category = category;
    return this.prisma.knowledgeArticle.findMany({
      where, orderBy: { updatedAt: 'desc' },
      include: { author: { select: { firstName: true, lastName: true } } },
    });
  }

  @Post()
  @RequirePermissions('DASHBOARD_READ')
  @ApiOperation({ summary: 'Create knowledge article' })
  async create(@TenantCtx() ctx: TenantContext, @CurrentUser() user: AuthUser, @Body() dto: any) {
    return this.prisma.knowledgeArticle.create({
      data: {
        tenantId: ctx.tenantId, authorId: user.id,
        title: dto.title, content: dto.content, category: dto.category ?? 'GENERAL',
        isPublished: dto.isPublished ?? false,
      },
    });
  }

  @Get(':id')
  @RequirePermissions('DASHBOARD_READ')
  @ApiOperation({ summary: 'Get article by ID' })
  async get(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    const article = await this.prisma.knowledgeArticle.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: { author: { select: { firstName: true, lastName: true } } },
    });
    await this.prisma.knowledgeArticle.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    return article;
  }

  @Put(':id')
  @RequirePermissions('DASHBOARD_READ')
  @ApiOperation({ summary: 'Update article' })
  async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: any) {
    return this.prisma.knowledgeArticle.update({
      where: { id },
      data: { title: dto.title, content: dto.content, category: dto.category, isPublished: dto.isPublished },
    });
  }

  @Delete(':id')
  @RequirePermissions('DASHBOARD_READ')
  @ApiOperation({ summary: 'Delete article' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    await this.prisma.knowledgeArticle.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id, deleted: true };
  }
}
