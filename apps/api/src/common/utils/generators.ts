export function generateBusinessNumber(prefix: string, tenantSlug: string, count: number): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}${y}${m}-${seq}`;
}
