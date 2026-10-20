import { daysBetween } from "./dates";

export type AgeingBucket = "current" | "d1_30" | "d31_60" | "d61_90" | "d90_plus";
export const AGEING_BUCKETS: AgeingBucket[] = ["current", "d1_30", "d31_60", "d61_90", "d90_plus"];

export interface InvoiceForAgeing {
  id: string;
  customerId: string;
  dueDate: Date;
  amountQ: number;
  paidQ: number;
  voided?: boolean;
}

export type InvoiceStatus = "open" | "partial" | "paid" | "overdue" | "void";

export function outstanding(inv: InvoiceForAgeing): number {
  return inv.voided ? 0 : Math.max(0, inv.amountQ - inv.paidQ);
}

export function daysOverdue(dueDate: Date, asOf: Date): number {
  return Math.max(0, daysBetween(dueDate, asOf));
}

export function bucketFor(dueDate: Date, asOf: Date): AgeingBucket {
  const late = daysBetween(dueDate, asOf);
  if (late <= 0) return "current";
  if (late <= 30) return "d1_30";
  if (late <= 60) return "d31_60";
  if (late <= 90) return "d61_90";
  return "d90_plus";
}

export function invoiceStatus(inv: InvoiceForAgeing, asOf: Date): InvoiceStatus {
  if (inv.voided) return "void";
  if (inv.paidQ >= inv.amountQ) return "paid";
  if (daysBetween(inv.dueDate, asOf) > 0) return "overdue";
  return inv.paidQ > 0 ? "partial" : "open";
}

export interface AgeingSummary {
  totalQ: number;
  overdueQ: number;
  buckets: Record<AgeingBucket, number>;
  openCount: number;
  overdueCount: number;
}

export function ageingSummary(invoices: InvoiceForAgeing[], asOf: Date): AgeingSummary {
  const buckets = Object.fromEntries(AGEING_BUCKETS.map((b) => [b, 0])) as Record<AgeingBucket, number>;
  let totalQ = 0;
  let overdueQ = 0;
  let openCount = 0;
  let overdueCount = 0;
  for (const inv of invoices) {
    const due = outstanding(inv);
    if (due <= 0) continue;
    const bucket = bucketFor(inv.dueDate, asOf);
    buckets[bucket] += due;
    totalQ += due;
    openCount++;
    if (bucket !== "current") {
      overdueQ += due;
      overdueCount++;
    }
  }
  return { totalQ, overdueQ, buckets, openCount, overdueCount };
}
