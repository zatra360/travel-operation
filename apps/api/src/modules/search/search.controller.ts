import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from '../../common/services/search.service';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

@ApiTags('Tenant - Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @RequirePermissions('LEAD_READ')
  @ApiOperation({ summary: 'Search leads and clients via Meilisearch' })
  async find(@TenantCtx() ctx: TenantContext, @Query('q') q: string) {
    if (!q || q.length < 2) return { hits: [] };
    return { hits: await this.search.search(ctx.tenantId, q) };
  }
}
