export const SERVICE_TYPE_SYSTEM_CODES = [
  'AIR_TICKET', 'VISA', 'HOTEL', 'TOUR', 'INSURANCE', 'TRANSFER',
  'UMRAH', 'HAJJ', 'MEDICAL_TOURISM', 'STUDENT_VISA', 'MANPOWER', 'CRUISE',
] as const;

/** Legacy free-text aliases still accepted on input, normalized on write. */
export const LEGACY_SERVICE_TYPE_ALIASES: Record<string, string> = {
  FLIGHT: 'AIR_TICKET',
  AIR: 'AIR_TICKET',
  TICKET: 'AIR_TICKET',
};

/**
 * Normalizes any historical/free-text service type value to a stable
 * system code. Returns null for empty input; unknown values are returned
 * upper-snake-cased so they remain visible (and stay string-only).
 */
export function normalizeServiceTypeCode(value?: string | null): string | null {
  if (!value || !value.trim()) return null;
  const canonical = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return LEGACY_SERVICE_TYPE_ALIASES[canonical] ?? canonical;
}

export function isSystemServiceTypeCode(value?: string | null): boolean {
  const normalized = normalizeServiceTypeCode(value);
  return normalized !== null && (SERVICE_TYPE_SYSTEM_CODES as readonly string[]).includes(normalized);
}

/**
 * Resolves the ServiceType id for any legacy or system code.
 * Returns { code, id } where id is null for unknown/non-system values.
 * Works with PrismaService or a transaction client.
 */
export async function resolveServiceTypeRef(
  db: { serviceType: { findUnique: (args: { where: { systemCode: string } }) => Promise<{ id: string } | null> } },
  value?: string | null,
): Promise<{ code: string | null; id: string | null }> {
  const code = normalizeServiceTypeCode(value);
  if (!code || !(SERVICE_TYPE_SYSTEM_CODES as readonly string[]).includes(code)) {
    return { code, id: null };
  }
  const type = await db.serviceType.findUnique({ where: { systemCode: code } });
  return { code, id: type?.id ?? null };
}
