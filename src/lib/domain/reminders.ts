import type { ReminderStage } from "@prisma/client";
import { addDays, addYears, daysBetween } from "./dates";
import { formatMoney } from "./money";

// Reminder schedule, relative to the due date. Reminders go out in the owner's name
// and stop as soon as the invoice is paid (legal review: ordinary commercial
// correspondence, no harassment).

export const STAGE_OFFSETS: Record<ReminderStage, number> = {
  BEFORE_DUE: -3,
  DUE: 0,
  OVERDUE_7: 7,
  OVERDUE_14: 14,
  OVERDUE_30: 30,
};

export const STAGES = Object.keys(STAGE_OFFSETS) as ReminderStage[];

export interface ReminderDecision {
  /** The stage to send now, if any. */
  send: ReminderStage | null;
  /** Earlier stages whose day has passed without a send; logged as skipped so they never fire late. */
  skip: ReminderStage[];
}

/**
 * Pick at most one reminder for an invoice today: the latest stage whose day has come
 * and that has not been handled. Older missed stages are skipped, so importing an
 * old invoice does not trigger a burst of emails.
 */
export function decideReminder(dueDate: Date, asOf: Date, handled: Set<ReminderStage>, enabled: Set<ReminderStage>): ReminderDecision {
  const reached = STAGES.filter((s) => daysBetween(addDays(dueDate, STAGE_OFFSETS[s]), asOf) >= 0);
  const pending = reached.filter((s) => !handled.has(s));
  if (!pending.length) return { send: null, skip: [] };
  const latest = pending[pending.length - 1];
  // A "due soon" note after the due date has passed would be wrong.
  const send = enabled.has(latest) && !(latest === "BEFORE_DUE" && daysBetween(dueDate, asOf) > 0) ? latest : null;
  return { send, skip: pending.filter((s) => s !== send) };
}

export function nextReminderDate(dueDate: Date, asOf: Date, handled: Set<ReminderStage>): { stage: ReminderStage; date: Date } | null {
  for (const s of STAGES) {
    const date = addDays(dueDate, STAGE_OFFSETS[s]);
    if (!handled.has(s) && daysBetween(asOf, date) >= 0) return { stage: s, date };
  }
  return null;
}

/** Limitation period for contractual claims: 3 years from the due date (Civil Code Art. 374). */
export function limitationEnds(dueDate: Date): Date {
  return addYears(dueDate, 3);
}

export interface TemplateVars {
  customer: string;
  business: string;
  number: string;
  amountQ: number;
  dueDate: Date;
  daysOverdue: number;
}

export function renderTemplate(text: string, v: TemplateVars): string {
  const date = v.dueDate.toISOString().slice(0, 10).split("-").reverse().join(".");
  const map: Record<string, string> = {
    customer: v.customer,
    business: v.business,
    number: v.number,
    amount: formatMoney(v.amountQ),
    due_date: date,
    days_overdue: String(v.daysOverdue),
  };
  return text.replace(/\{(\w+)\}/g, (m, key: string) => map[key] ?? m);
}

export const DEFAULT_TEMPLATES: Record<ReminderStage, { subject: string; body: string }> = {
  BEFORE_DUE: {
    subject: "{number} nömrəli hesab-faktura: ödəniş tarixi yaxınlaşır",
    body:
      "Hörmətli {customer},\n\n{number} nömrəli, {amount} məbləğində hesab-fakturanın ödəniş tarixi {due_date}-dir. " +
      "Ödənişi vaxtında etdiyiniz üçün öncədən təşəkkür edirik.\n\nHörmətlə,\n{business}",
  },
  DUE: {
    subject: "{number} nömrəli hesab-faktura: bu gün ödəniş günüdür",
    body:
      "Hörmətli {customer},\n\nXatırladırıq ki, {number} nömrəli, {amount} məbləğində hesab-fakturanın ödəniş günü bu gündür ({due_date}). " +
      "Ödənişi artıq etmisinizsə, bu məktubu nəzərə almayın.\n\nHörmətlə,\n{business}",
  },
  OVERDUE_7: {
    subject: "{number} nömrəli hesab-faktura: ödəniş {days_overdue} gün gecikir",
    body:
      "Hörmətli {customer},\n\n{number} nömrəli, {amount} məbləğində hesab-fakturanın ödəniş tarixi ({due_date}) {days_overdue} gün əvvəl keçib. " +
      "Xahiş edirik ödənişi yaxın günlərdə edəsiniz və ya bizimlə əlaqə saxlayasınız.\n\nHörmətlə,\n{business}",
  },
  OVERDUE_14: {
    subject: "{number} nömrəli hesab-faktura: ikinci xatırlatma",
    body:
      "Hörmətli {customer},\n\n{number} nömrəli, {amount} məbləğində hesab-faktura hələ də ödənilməyib (ödəniş tarixi {due_date}, {days_overdue} gün gecikmə). " +
      "Ödənişlə bağlı çətinlik varsa, cavab yazın, birlikdə həll yolu tapaq.\n\nHörmətlə,\n{business}",
  },
  OVERDUE_30: {
    subject: "{number} nömrəli hesab-faktura: təcili ödəniş tələbi",
    body:
      "Hörmətli {customer},\n\n{number} nömrəli, {amount} məbləğində hesab-fakturanın ödənişi {days_overdue} gündür gecikir. " +
      "Xahiş edirik ödənişi 5 iş günü ərzində edəsiniz və ya ödəniş planını bizimlə razılaşdırasınız.\n\nHörmətlə,\n{business}",
  },
};
