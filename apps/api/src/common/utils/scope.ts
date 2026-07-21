/**
 * Tenant / branch query-scoping helpers.
 *
 * These centralize how list queries are constrained so that isolation rules are
 * applied consistently across every module instead of being re-implemented (and
 * potentially forgotten) in each service.
 */

/**
 * Hard-scopes a Prisma `where` object to the request's active branch.
 *
 * When a request carries a verified active branch context (the `X-Branch-Id`
 * header, validated by `TenantGuard`), results are constrained to that branch.
 * This intentionally OVERRIDES any client-supplied `branchId` filter so a user
 * cannot read another branch's records by manipulating the query string.
 *
 * When there is no active branch context, the caller keeps its existing
 * behaviour (e.g. a tenant-wide role may list across all branches, optionally
 * narrowing via a query filter).
 */
export function enforceBranchScope<T extends Record<string, any>>(
  where: T,
  activeBranchId?: string,
): T {
  if (activeBranchId) {
    (where as Record<string, any>).branchId = activeBranchId;
  }
  return where;
}
