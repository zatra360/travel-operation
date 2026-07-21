# Audit Sample Reference

Location: `C:\Dev\Projects\Travel Operation\Audit Sample`

## Contents

| File/Folder | Description |
|---|---|
| `Tripnow Limited 23-24 Final For Audit.pdf/xlsx` | Bangladesh statutory financials (year ended June 30, 2024) — travel/tourism company under Companies Act 1994 |
| `Tripnow Limited 24-25 Final For Audit.pdf/xlsx` | Same company, subsequent year |
| `GB Accounts Basic Sole Trader 2025-04-05 (Apr25) Excel 2007/` | UK sole trader bookkeeping templates |
| `GB Accounts Company 2026-05-31 (May26) Excel 2007/` | UK limited company statutory templates |

---

## Tripnow Limited — Workbook Structure (IAS/IFRS format, Bangladesh Taka)

| Sheet | Mapping to Audit-First ERP Prompt |
|---|---|
| **BS** | Statement of Financial Position (Balance Sheet): Assets (Non-current: PPE, Current: Cash), Equity (Share Capital, Retained Earnings), Liabilities (Trade Payables, Provisions). Maps to: `chart_of_accounts`, `journal_entries`, financial reporting section 34. |
| **I&E** | Statement of Profit or Loss & Comprehensive Income: Revenue, Cost of Services, Gross Profit, Administrative Expenses, Selling & Distribution Expenses, Operating Profit, Other Income, Net Profit Before Tax, Income Tax, Net Profit After Tax. Maps to: Sell/Expense/Revenue accounting flows. |
| **Equity** | Statement of Changes in Equity: Share Capital, Retained Earnings opening/closing, Net profit for the year. Maps to: Equity accounts in `chart_of_accounts`. |
| **CF** | Statement of Cash Flows: Operating Activities (Net Profit, Changes in Working Capital: Receivables, Payables, Inventory, Loan), Investing Activities, Financing Activities. Maps to: `journal_items` + reconciliation framework. |
| **Policy Note** | Accounting policies: Going concern, historical cost, accrual basis, IAS 1/2/7/8/10/12/16/23/24/32, IFRS 7/15 compliance, revenue recognition 5-step, depreciation (reducing balance), provisions, income tax. Maps to: fiscal year / accounting period configuration and posting rules. |
| **NOTES** | Detailed notes to accounts — Share Capital, Retained Earnings, Provision for Expense, Trade & Other Payables, Revenue, Cost of Services, Administrative Expenses (salary, rent, audit fee, internet, stationary, fooding, mobile, legal, conveyance, etc.), Selling & Distribution Expenses, Finance Expense, Property Plant & Equipment (Furniture, Computer, Office Equipment), Cash & Cash Equivalents (multiple bank accounts), Related Parties. Maps to: Master data + expense module + fixed asset register. |
| **FA** | Fixed Assets schedule: Particulars, Cost (opening + additions - disposals), Depreciation (rate %, opening, charge for year, disposals), Written Down Value. Maps to: `item_categories` for fixed assets, depreciation schedules. |
| **Tripnow Monthly** | Monthly expense breakdown: Jan-Dec columns with line items (Marketing, Repair & Maintenance, Bank Charges etc.). Maps to: Expense module monthly reporting, `expense_reports`, analytics dashboard period views. |

### Key Audit Outputs Expected (from Tripnow sample)

1. **Statement of Financial Position** — Balance sheet with current/non-current classification, signed by Director/Chairman/Auditor
2. **Income Statement** — Full P&L with Gross Profit, Operating Profit, Net Profit Before/After Tax
3. **Statement of Changes in Equity** — Share Capital + Retained Earnings movement
4. **Cash Flow Statement** — Operating, Investing, Financing sections
5. **Accounting Policies** — IAS/IFRS compliance statement, depreciation method, revenue recognition policy
6. **Notes to Accounts** — Schedule of each balance-sheet and income-statement line item
7. **Fixed Asset Register** — Cost, accumulated depreciation, WDV per asset
8. **Monthly Expense Register** — Itemized monthly breakdown
9. **Bank Reconciliation** — Multiple bank accounts listed with balances
10. **Share Capital Register** — Shareholder names, shares, amounts

---

## UK GB Accounts Templates — Workbook Structure

### Financialaccounts.xlsx
| Sheet | Purpose |
|---|---|
| OpenAccounts | Opening trial balance / account balances |
| TrialBalance | Working trial balance |
| MnthP&L | Monthly profit & loss |
| PubP&L | Published/formatted P&L |
| PubBalSht | Published/formatted Balance Sheet |
| PubNotes | Notes to published accounts |
| Report | Accountant's report |
| CorporationTax / CT600 | Corporation tax computation & filing template |
| WagesInterface | Payroll/wages summary |
| Stock | Inventory/stock valuation |
| Admin | Administrative items |

### Sales.xlsx
OpeningDebtors → Month 01-12 revenue → ClosingDebtors

### Purchases.xlsx
OpeningCreditors → Month 01-12 purchases → ClosingCreditors

### Other UK Templates
- Cashaccount.xlsx — Bank/cash transaction register
- Creditcardaccount.xlsx — Credit card transaction register
- Currentaccount.xlsx — Current account register
- Savingaccount.xlsx — Savings account register
- Salesinvoice.xlsx — Sales invoice template
- Vatreturns.xlsx — VAT return template
- Fixedassets.xlsx — Fixed asset register
- Payslips.xlsx — Employee payslip generation
- Expensesform.xlsx — Expense claim form
- Dividend Voucher.docx — Dividend voucher template
- Companysecretary.xlsx, CT600OnlineLookALike.xlsx, Company Accounts User Guide.pdf, Payslip User Guide.pdf

---

## Cross-Reference: Audit-First ERP Prompt Reports (Section 34)

The Tripnow + GB Accounts samples validate these required reports:

| Prompt Report | Evidence in Sample |
|---|---|
| Trial Balance | `Financialaccounts.xlsx` → TrialBalance sheet |
| General Ledger | Implicit in all TB/BS/I&E sheets |
| Balance Sheet | Tripnow `BS`, GB `PubBalSht` |
| Income Statement | Tripnow `I&E`, GB `MnthP&L` / `PubP&L` |
| Cash Flow Statement | Tripnow `CF` |
| Statement of Changes in Equity | Tripnow `Equity` |
| AR Aging / AP Aging | GB `OpeningDebtors`/`ClosingDebtors`, `OpeningCreditors`/`ClosingCreditors` |
| Customer Statement | Implicit in Sales.xlsx monthly breakdowns |
| Vendor Statement | Implicit in Purchases.xlsx monthly breakdowns |
| Inventory Valuation | GB `Stock` sheet |
| Stock Movement Register | GB `Stock` sheet |
| Fixed Asset Register / Depreciation Schedule | Tripnow `FA`, GB `Fixedassets.xlsx` |
| Purchase Register | GB `Purchases.xlsx` (12-month purchase book) |
| Sales Register | GB `Sales.xlsx` (12-month sales book) |
| Expense Register | Tripnow `NOTES`, `Tripnow Monthly`, GB `expensesform.xlsx` |
| Tax Register | GB `Vatreturns.xlsx`, `CT600` |
| Bank Reconciliation | Tripnow `NOTES` (bank accounts listed with balances), GB `Cashaccount.xlsx` |
| Payroll Register | GB `WagesInterface`, `Payslips.xlsx` |
| Period-Close Checklist | Implicit in policy notes / audit sign-off lines |
| Audit Log Register | Not present in Excel samples — must be designed per audit-first principles |
