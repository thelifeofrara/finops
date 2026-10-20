import type { AccountType, RuleDirection } from "@prisma/client";

// A small chart of accounts based on Azerbaijan's national accounting plan for
// commercial organisations. Codes follow the national plan; the list is cut down
// to what a small business needs in its first year.

export type SystemAccount = "bank" | "receivables" | "vat_payable" | "revenue" | "suspense" | "owner_equity";

export interface AccountDef {
  code: string;
  nameAz: string;
  nameEn: string;
  type: AccountType;
  system?: SystemAccount;
}

export const DEFAULT_CHART: AccountDef[] = [
  { code: "221", nameAz: "Kassa", nameEn: "Cash on hand", type: "ASSET" },
  { code: "223", nameAz: "Bank hesablaşma hesabları", nameEn: "Bank accounts", type: "ASSET", system: "bank" },
  { code: "211", nameAz: "Alıcıların debitor borcları", nameEn: "Receivables from customers", type: "ASSET", system: "receivables" },
  { code: "531", nameAz: "Malsatanlara kreditor borcları", nameEn: "Payables to suppliers", type: "LIABILITY" },
  { code: "521", nameAz: "Vergi öhdəlikləri", nameEn: "Tax liabilities", type: "LIABILITY", system: "vat_payable" },
  { code: "533", nameAz: "Əməyin ödənişi üzrə öhdəliklər", nameEn: "Salaries payable", type: "LIABILITY" },
  { code: "301", nameAz: "Nizamnamə kapitalı / sahibkarın vəsaiti", nameEn: "Owner's capital", type: "EQUITY", system: "owner_equity" },
  { code: "601", nameAz: "Satış", nameEn: "Sales revenue", type: "INCOME", system: "revenue" },
  { code: "611", nameAz: "Digər əməliyyat gəlirləri", nameEn: "Other operating income", type: "INCOME" },
  { code: "701", nameAz: "Satışın maya dəyəri", nameEn: "Cost of sales", type: "EXPENSE" },
  { code: "711", nameAz: "Kommersiya xərcləri", nameEn: "Selling and marketing", type: "EXPENSE" },
  { code: "721", nameAz: "İnzibati xərclər", nameEn: "Administrative expenses", type: "EXPENSE" },
  { code: "7211", nameAz: "Əmək haqqı", nameEn: "Salaries", type: "EXPENSE" },
  { code: "7212", nameAz: "İcarə", nameEn: "Rent", type: "EXPENSE" },
  { code: "7213", nameAz: "Kommunal xərclər", nameEn: "Utilities", type: "EXPENSE" },
  { code: "7214", nameAz: "Rabitə və internet", nameEn: "Telecom and internet", type: "EXPENSE" },
  { code: "731", nameAz: "Bank xidmətləri", nameEn: "Bank fees", type: "EXPENSE" },
  { code: "901", nameAz: "Vergi ödənişləri", nameEn: "Taxes paid", type: "EXPENSE" },
  { code: "999", nameAz: "Təsnif edilməmiş", nameEn: "Uncategorised", type: "EXPENSE", system: "suspense" },
];

export interface KeywordRule {
  keywords: string[];
  code: string;
  direction: RuleDirection;
}

// Built-in rules applied when nothing learned matches. Lower-case, matched against the description.
export const KEYWORD_RULES: KeywordRule[] = [
  { keywords: ["əmək haqqı", "emek haqqi", "maaş", "maas", "salary"], code: "7211", direction: "OUT" },
  { keywords: ["icarə", "icare", "kirayə", "rent"], code: "7212", direction: "OUT" },
  { keywords: ["azərişıq", "azerisiq", "azəriqaz", "azeriqaz", "azərsu", "azersu", "elektrik", "qaz haqqı"], code: "7213", direction: "OUT" },
  { keywords: ["azercell", "bakcell", "nar mobile", "aztelekom", "internet", "baktelecom"], code: "7214", direction: "OUT" },
  { keywords: ["komissiya", "xidmət haqqı", "bank fee", "commission"], code: "731", direction: "OUT" },
  { keywords: ["vergi", "dvx", "ədv", "edv", "sadələşdirilmiş", "dsmf", "sosial sığorta", "tax"], code: "901", direction: "OUT" },
  { keywords: ["reklam", "marketinq", "instagram", "facebook", "google ads", "meta"], code: "711", direction: "OUT" },
  { keywords: ["nizamnamə", "kapital", "sahibkarın vəsaiti", "capital"], code: "301", direction: "IN" },
];
