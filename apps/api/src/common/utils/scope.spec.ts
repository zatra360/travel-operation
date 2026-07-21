import { enforceBranchScope } from './scope';

describe('enforceBranchScope', () => {
  it('hard-scopes the where clause to the active branch', () => {
    const where: Record<string, unknown> = { tenantId: 't1', deletedAt: null };
    enforceBranchScope(where, 'b1');
    expect(where.branchId).toBe('b1');
  });

  it('overrides any client-supplied branch filter (prevents cross-branch read)', () => {
    const where: Record<string, unknown> = { tenantId: 't1', branchId: 'attacker-branch' };
    enforceBranchScope(where, 'b1');
    expect(where.branchId).toBe('b1');
  });

  it('leaves the where clause untouched when there is no active branch', () => {
    const where: Record<string, unknown> = { tenantId: 't1', branchId: 'b2' };
    enforceBranchScope(where, undefined);
    expect(where.branchId).toBe('b2');
  });

  it('does not add a branch filter for tenant-wide contexts', () => {
    const where: Record<string, unknown> = { tenantId: 't1' };
    enforceBranchScope(where, undefined);
    expect('branchId' in where).toBe(false);
  });

  it('returns the same object reference it was given', () => {
    const where: Record<string, unknown> = { tenantId: 't1' };
    expect(enforceBranchScope(where, 'b1')).toBe(where);
  });
});
