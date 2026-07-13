import { Controller, Get, Put, Delete, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';
import { UpdateSettingDto } from './dto/update-setting.dto';

@ApiTags('Tenant - Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermissions('SETTINGS_READ')
  @ApiOperation({ summary: 'Get all settings for current tenant' })
  async getAll(@TenantCtx() ctx: TenantContext) {
    return this.settingsService.getAll(ctx.tenantId);
  }

  @Get(':key')
  @RequirePermissions('SETTINGS_READ')
  @ApiOperation({ summary: 'Get setting by key' })
  async get(@TenantCtx() ctx: TenantContext, @Param('key') key: string) {
    return this.settingsService.get(ctx.tenantId, key);
  }

  @Put(':key')
  @RequirePermissions('SETTINGS_UPDATE')
  @ApiOperation({ summary: 'Create or update a setting' })
  async set(
    @TenantCtx() ctx: TenantContext,
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ) {
    return this.settingsService.set(ctx.tenantId, key, dto.value);
  }

  @Delete(':key')
  @RequirePermissions('SETTINGS_UPDATE')
  @ApiOperation({ summary: 'Delete a setting' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('key') key: string) {
    await this.settingsService.delete(ctx.tenantId, key);
    return { success: true };
  }
}

@Controller('tenant/settings/custom-fields')
@ApiTags('Tenant - Custom Fields')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class CustomFieldsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermissions('SETTINGS_READ')
  async list(@TenantCtx() ctx: TenantContext) {
    return this.settingsService.getCustomFields(ctx.tenantId);
  }

  @Post()
  @RequirePermissions('SETTINGS_UPDATE')
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: any) {
    return this.settingsService.addCustomField(ctx.tenantId, dto);
  }

  @Delete(':id')
  @RequirePermissions('SETTINGS_UPDATE')
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.settingsService.removeCustomField(ctx.tenantId, id);
  }
}
