export const SLUG_REGEX = /^[a-z0-9-]+$/;
export const BRANCH_CODE_REGEX = /^[A-Z0-9_]+$/;
export const PHONE_REGEX = /^\+?[\d\s-]{7,20}$/;

export function isValidSlug(value: string): boolean {
  return SLUG_REGEX.test(value);
}

export function isValidBranchCode(value: string): boolean {
  return BRANCH_CODE_REGEX.test(value);
}

export function isValidPhone(value: string): boolean {
  return PHONE_REGEX.test(value);
}
