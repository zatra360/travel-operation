import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Guards platform-level endpoints (`/platform/*`).
 *
 * Platform administration must never be reachable through tenant-scoped
 * permissions. A tenant admin may legitimately hold permissions such as
 * `USER_CREATE` or `TENANT_UPDATE` *within their own tenant*, but those must
 * not grant access to platform-wide resources (other tenants, platform users,
 * global reference data). This guard requires an explicit platform super-admin.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!user.isPlatformSuperAdmin) {
      throw new ForbiddenException('Platform administrator access is required');
    }

    return true;
  }
}
