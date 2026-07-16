export interface GLAccountInfo {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  normalBalance: string;
  controlAccountType?: string | null;
  allowManualPosting: boolean;
  isActive: boolean;
  parentAccountId?: string | null;
  description?: string | null;
}

export interface JournalEntryInfo {
  id: string;
  journalNumber?: string | null;
  journalType: string;
  entryDate: string;
  status: string;
  currencyCode: string;
  description?: string | null;
  sourceType?: string | null;
  sourceNumber?: string | null;
  postedAt?: string | null;
  totalAmount?: number;
  accountingPeriod?: { code: string; status: string } | null;
  items?: JournalItemInfo[];
  links?: Array<{ sourceType: string; sourceId: string; purpose: string }>;
  reversalOf?: { id: string; journalNumber?: string | null } | null;
}

export interface JournalItemInfo {
  id: string;
  lineNumber: number;
  debit: number;
  credit: number;
  functionalDebit: number;
  functionalCredit: number;
  description?: string | null;
  account: { accountCode: string; accountName: string };
}

export interface TrialBalanceAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  normalBalance: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface TrialBalanceResponse {
  accounts: TrialBalanceAccount[];
  totals: { debit: number; credit: number };
  isBalanced: boolean;
}

export interface PeriodInfo {
  id: string;
  code: string;
  periodNumber: number;
  startDate: string;
  endDate: string;
  status: string;
}

export interface FiscalYearInfo {
  id: string;
  code: string;
  startDate: string;
  endDate: string;
  status: string;
  periods: PeriodInfo[];
}

export interface BalanceSheetResponse {
  asOf: string;
  assets: { accounts: any[]; total: number };
  liabilities: { accounts: any[]; total: number };
  equity: { accounts: any[]; currentPeriodEarnings: number; total: number };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export interface IncomeStatementResponse {
  period: { from: string; to: string };
  revenue: { accounts: any[]; total: number };
  costOfServices: { accounts: any[]; total: number };
  grossProfit: number;
  expenses: { accounts: any[]; total: number };
  operatingProfit: number;
  otherIncome: { accounts: any[]; total: number };
  otherExpense: { accounts: any[]; total: number };
  netProfit: number;
}
