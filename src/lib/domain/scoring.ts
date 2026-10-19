import { daysBetween } from "./dates";

// Debtor score from the business's own payment history with that customer.
// The deck scores debtors from e-qaimə history; here that history is the invoices
// and confirmed payments already in FinOps.

export type DebtorGrade = "A" | "B" | "C" | "D" | "new";

export interface PaidInvoiceHistory {
  dueDate: Date;
  /** Date the invoice was fully paid (the date of the last matched payment). */
  paidDate: Date;
}

export interface DebtorScore {
  grade: DebtorGrade;
  paidCount: number;
  onTimeShare: number;
  avgDaysLate: number;
  /** Outstanding invoices more than 60 days overdue. */
  seriouslyLateOpen: number;
}

export function scoreDebtor(history: PaidInvoiceHistory[], seriouslyLateOpen = 0): DebtorScore {
  const paidCount = history.length;
  if (paidCount === 0) {
    return { grade: seriouslyLateOpen > 0 ? "D" : "new", paidCount, onTimeShare: 0, avgDaysLate: 0, seriouslyLateOpen };
  }
  const lateDays = history.map((h) => Math.max(0, daysBetween(h.dueDate, h.paidDate)));
  const onTime = lateDays.filter((d) => d <= 3).length;
  const onTimeShare = onTime / paidCount;
  const avgDaysLate = lateDays.reduce((a, b) => a + b, 0) / paidCount;

  let grade: DebtorGrade;
  if (seriouslyLateOpen > 0) grade = "D";
  else if (paidCount >= 3 && onTimeShare >= 0.8 && avgDaysLate <= 7) grade = "A";
  else if (onTimeShare >= 0.6 && avgDaysLate <= 15) grade = "B";
  else if (avgDaysLate <= 30) grade = "C";
  else grade = "D";
  return { grade, paidCount, onTimeShare, avgDaysLate, seriouslyLateOpen };
}
