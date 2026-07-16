export const Modules = [
  'TENANT', 'BRANCH', 'USER', 'ROLE', 'PERMISSION',
  'LEAD', 'CLIENT', 'FOLLOW_UP',
  'QUOTATION', 'BOOKING', 'TICKET',
  'INVOICE', 'RECEIPT', 'PAYMENT', 'EXPENSE', 'LEDGER',
  'REFUND', 'REISSUE', 'CANCELLATION',
  'EMPLOYEE', 'LEAVE', 'ATTENDANCE', 'PERFORMANCE',
  'COMMISSION', 'SALARY_RUN',
  'DOCUMENT', 'SETTINGS', 'AUDIT_LOG', 'REPORT', 'DASHBOARD',
  'NOTIFICATION', 'MASTER_DATA', 'VENDOR', 'INSURANCE', 'FEEDBACK',
  'JOURNAL', 'GL_ACCOUNT', 'ACCOUNTING_PERIOD',
  'SERVICE_TYPE', 'SERVICE_CASE', 'SERVICE_ITEM', 'WORKFLOW',
  'WORKFLOW_TASK', 'WORKFLOW_APPROVAL', 'SERVICE_DOCUMENT', 'SERVICE_REPORT',
] as const;

export const Actions = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'] as const;

export type ModuleName = (typeof Modules)[number];
export type ActionName = (typeof Actions)[number];

export function buildPermissionName(module: ModuleName, action: ActionName): string {
  return `${module}_${action}`;
}

export const AllPermissions = Modules.flatMap((module) =>
  Actions.map((action) => buildPermissionName(module, action)),
);
