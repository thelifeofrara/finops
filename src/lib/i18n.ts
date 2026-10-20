import { cookies } from "next/headers";

// Two languages, Azerbaijani first. The choice is stored in a cookie so the switch works
// on every page without a URL change. Add a key here in both languages before using it.
export type Locale = "az" | "en";

const M = {
  appName: { az: "FinOps", en: "FinOps" },
  nav_receivables: { az: "Debitor borcları", en: "Receivables" },
  nav_invoices: { az: "Hesab-fakturalar", en: "Invoices" },
  nav_payments: { az: "Ödənişlər", en: "Payments" },
  nav_ledger: { az: "Mühasibat", en: "Ledger" },
  nav_tax: { az: "Vergilər", en: "Tax" },
  nav_discounting: { az: "Avans", en: "Advance" },
  nav_import: { az: "İdxal", en: "Import" },
  logout: { az: "Çıxış", en: "Sign out" },
  lang_switch: { az: "English", en: "Azərbaycanca" },
  save: { az: "Yadda saxla", en: "Save" },
  confirm: { az: "Təsdiq et", en: "Confirm" },
  skip: { az: "Keç", en: "Skip" },
  none: { az: "Yoxdur", en: "None" },
  number: { az: "Nömrə", en: "Number" },
  customer: { az: "Müştəri", en: "Customer" },
  due: { az: "Ödəniş tarixi", en: "Due date" },
  date: { az: "Tarix", en: "Date" },
  amount: { az: "Məbləğ", en: "Amount" },
  outstanding: { az: "Qalıq", en: "Outstanding" },
  status: { az: "Status", en: "Status" },
  description: { az: "Təyinat", en: "Description" },
  counterparty: { az: "Qarşı tərəf", en: "Counterparty" },
  category: { az: "Kateqoriya", en: "Category" },
  overdue: { az: "Gecikmiş", en: "Overdue" },
  totalOpen: { az: "Ümumi açıq borc", en: "Total open" },
  openInvoices: { az: "Açıq hesab-fakturalar", en: "Open invoices" },
  ageing: { az: "Yaşlanma", en: "Ageing" },
  noInvoices: { az: "Hələ hesab-faktura yoxdur.", en: "No invoices yet." },
  noItems: { az: "Hələ heç nə yoxdur.", en: "Nothing here yet." },
  bucket_current: { az: "Vaxtında", en: "Current" },
  bucket_d1_30: { az: "1–30 gün", en: "1–30 days" },
  bucket_d31_60: { az: "31–60 gün", en: "31–60 days" },
  bucket_d61_90: { az: "61–90 gün", en: "61–90 days" },
  bucket_d90_plus: { az: "90+ gün", en: "90+ days" },
  st_open: { az: "Açıq", en: "Open" },
  st_partial: { az: "Qismən ödənilib", en: "Part paid" },
  st_paid: { az: "Ödənilib", en: "Paid" },
  st_overdue: { az: "Gecikir", en: "Overdue" },
  st_void: { az: "Ləğv edilib", en: "Void" },
  // Login and onboarding
  login_title: { az: "Daxil ol", en: "Sign in" },
  login_email: { az: "E-poçt", en: "Email" },
  login_send: { az: "Link göndər", en: "Send link" },
  login_sent: { az: "E-poçtunuza daxil olma linki göndərildi. Linki 15 dəqiqə ərzində açın.", en: "We sent a sign-in link to your email. Open it within 15 minutes." },
  login_expired: { az: "Link köhnəlib və ya artıq istifadə olunub. Yenisini göndərin.", en: "The link has expired or was already used. Request a new one." },
  onb_title: { az: "Biznesinizi qurun", en: "Set up your business" },
  onb_sub: { az: "Bir neçə sual. Vergi rejimini biz təklif edəcəyik, siz təsdiqləyəcəksiniz.", en: "A few questions. We suggest a tax regime and you confirm it." },
  onb_name: { az: "Biznesin adı", en: "Business name" },
  onb_voen: { az: "VÖEN (istəyə görə)", en: "Tax ID, VÖEN (optional)" },
  onb_form: { az: "Hüquqi forma", en: "Legal form" },
  onb_ie: { az: "Fərdi sahibkar", en: "Individual entrepreneur" },
  onb_llc: { az: "MMC / ASC", en: "LLC / JSC" },
  onb_turnover: { az: "Bu il gözlənilən illik dövriyyə, ₼", en: "Expected annual turnover, ₼" },
  onb_vat: { az: "ƏDV-yə könüllü qeydiyyatda olmaq istəyirəm", en: "I want to register for VAT voluntarily" },
  onb_employees: { az: "İşçilərim var", en: "I have employees" },
  onb_consent_tax: { az: "Vergi məlumatlarımın FinOps tərəfindən hazırlanmasına razıyam (Vergi Məcəlləsi, m. 30.8)", en: "I consent to FinOps preparing my tax data (Tax Code, art. 30.8)" },
  onb_consent_personal: { az: "Şəxsi məlumatlarımın və müştərilərimin məlumatlarının işlənməsinə razıyam", en: "I consent to processing my personal data and my customers' data" },
  onb_continue: { az: "Davam et", en: "Continue" },
  // Receivables
  rec_title: { az: "Debitor borcları", en: "Receivables" },
  // Invoices
  inv_title: { az: "Hesab-fakturalar", en: "Invoices" },
  inv_new: { az: "Yeni hesab-faktura", en: "New invoice" },
  inv_name_placeholder: { az: "Müştəri adı", en: "Customer name" },
  inv_number_placeholder: { az: "Nömrə (məs. FT-1001)", en: "Number (e.g. INV-1001)" },
  inv_amount_placeholder: { az: "Məbləğ, ₼ (ƏDV daxil)", en: "Amount, ₼ (incl. VAT)" },
  inv_vat_placeholder: { az: "ƏDV məbləği, ₼ (boş ola bilər)", en: "VAT amount, ₼ (optional)" },
  inv_list: { az: "Siyahı", en: "All invoices" },
  // Import
  imp_title: { az: "İdxal", en: "Import" },
  imp_bank_help: { az: "Bank hesab çıxarışını CSV faylı kimi yükləyin. Başlıq sətri (Tarix, Mədaxil, Məxaric, Təyinat, Qarşı tərəf, VÖEN) avtomatik tanınır.", en: "Upload your bank statement as a CSV file. The header row (date, money in, money out, description, counterparty, VOEN) is detected automatically." },
  imp_bank_upload: { az: "Bank çıxarışı yüklə", en: "Upload bank statement" },
  imp_eqaime_help: { az: "e-qaimə fakturalarını XML faylı kimi yükləyin.", en: "Upload e-qaimə invoices as an XML file." },
  imp_eqaime_upload: { az: "e-qaimə yüklə", en: "Upload e-qaimə" },
  imp_recent: { az: "Son əməliyyatlar", en: "Recent transactions" },
  imp_go_payments: { az: "Ödənişləri uyğunlaşdır", en: "Match payments" },
  // Payments
  pay_title: { az: "Ödənişlər", en: "Payments" },
  pay_help: { az: "Daxil olan ödənişləri açıq hesab-fakturalarla uyğunlaşdırın. Təklifləri yoxlayın və təsdiq edin.", en: "Match incoming payments to open invoices. Review the suggestions and confirm." },
  pay_none: { az: "Uyğunlaşdırılacaq ödəniş yoxdur.", en: "No payments waiting to be matched." },
  pay_no_match: { az: "Uyğun hesab-faktura tapılmadı. Kateqoriya seçə bilərsiniz.", en: "No matching invoice found. You can choose a category." },
  pay_pick: { az: "Hesab-faktura seçin", en: "Choose an invoice" },
  // Ledger
  led_title: { az: "Mühasibat", en: "Ledger" },
  led_income: { az: "Gəlir", en: "Income" },
  led_expense: { az: "Xərc", en: "Expenses" },
  led_profit: { az: "Mənfəət", en: "Profit" },
  led_uncat: { az: "Kateqoriyasız", en: "Uncategorised" },
  led_tb: { az: "Mühasibat balansı", en: "Trial balance" },
  led_tx: { az: "Əməliyyatlar", en: "Transactions" },
  led_debit: { az: "Debet", en: "Debit" },
  led_credit: { az: "Kredit", en: "Credit" },
  led_balance: { az: "Qalıq", en: "Balance" },
  led_learn: { az: "Bu qarşı tərəf üçün yadda saxla", en: "Remember for this counterparty" },
  led_auto: { az: "avtomatik", en: "auto" },
  // Tax
  tax_title: { az: "Vergilər", en: "Tax" },
  tax_regime: { az: "Vergi rejimi", en: "Tax regime" },
  tax_simplified: { az: "Sadələşdirilmiş vergi", en: "Simplified tax" },
  tax_vat: { az: "ƏDV ilə", en: "VAT" },
  tax_non_vat: { az: "ƏDV-siz (ümumi)", en: "Non-VAT (general)" },
  tax_calendar: { az: "Bildiriş təqvimi", en: "Filing calendar" },
  tax_prepared: { az: "Hazırlanmış bəyanat", en: "Prepared declaration" },
  tax_disclaimer: { az: "Bu rəqəmlər təxminidir. Bəyannaməni özünüz e-taxes.gov.az-da təsdiqləyib təqdim edin və tarixləri yoxlayın.", en: "These figures are estimates. Check them, then file on e-taxes.gov.az yourself and verify the deadlines." },
  tax_base: { az: "Dövriyyə (quraşdırılmış əməliyyatlar)", en: "Turnover (receipts in the quarter)" },
  tax_rate: { az: "Dərəcə", en: "Rate" },
  tax_due: { az: "Ödəniləcək vergi", en: "Tax due" },
  tax_quarter: { az: "Rüb", en: "Quarter" },
  // Discounting
  adv_title: { az: "Avans (faktura üzrə)", en: "Advance on invoices" },
  adv_help: { az: "Hesab-fakturaları bank tərəfindən maliyyələşdirilən avans üçün təklif edirik. Bu, yalnız maraq ölçmək üçündür: pul hərəkət etmir.", en: "We show what an advance on each invoice could look like. This only measures interest: no money moves." },
  adv_eligible: { az: "Uyğundur", en: "Eligible" },
  adv_quote: { az: "Təklif", en: "Quote" },
  adv_fee: { az: "Haqq", en: "Fee" },
  adv_interest: { az: "Maraqlanıram", en: "I'm interested" },
  adv_thanks: { az: "Qeydə alındı. Təklif hazır olanda sizinlə əlaqə saxlanılacaq.", en: "Noted. We'll contact you when the offer is ready." },
  adv_reason_overdue: { az: "Gecikib", en: "Overdue" },
  adv_reason_small: { az: "Məbləğ çox kiçikdir", en: "Amount too small" },
  adv_reason_soon: { az: "Ödəniş tarixinə çox az qalıb", en: "Due too soon" },
  adv_reason_far: { az: "Ödəniş tarixi çox uzaqdadır", en: "Due too far away" },
  adv_reason_new: { az: "Müştəri tarixçəsi yoxdur", en: "No payment history with this customer" },
  adv_reason_risk: { az: "Risk səviyyəsi çox yüksəkdir", en: "Debtor risk too high" },
  adv_reason_paid: { az: "Ödənilib", en: "Paid" },
  adv_grade: { az: "Müştəri reytinqi", en: "Customer grade" },
  adv_days: { az: "gün", en: "days" },
  // e-qaimə
  eq_done: { az: "e-qaimə fakturaları idxal edildi", en: "e-qaimə invoices imported" },
  eq_none: { az: "XML-də hesab-faktura tapılmadı", en: "No invoices found in the XML" },
  bank_done: { az: "Əməliyyatlar idxal edildi", en: "Transactions imported" },
  err_file: { az: "Fayl seçilməyib.", en: "No file selected." },
  err_parse: { az: "Faylı oxumaq olmadı. Başlıq sətrini yoxlayın.", en: "Could not read the file. Check the header row." },
  err_required: { az: "Müştəri, nömrə və məbləğ tələb olunur.", en: "Customer, number and amount are required." },
  err_vat: { az: "ƏDV məbləği düzgün deyil.", en: "VAT amount is not valid." },
  err_consent: { az: "Razılıq tələb olunur.", en: "Consent is required." },
  err_name: { az: "Biznesin adı tələb olunur.", en: "Business name is required." },
  err_email: { az: "E-poçt düzgün deyil.", en: "Email address is not valid." },
} as const;

export type MessageKey = keyof typeof M;

export async function currentLocale(): Promise<Locale> {
  const jar = await cookies();
  return jar.get("lang")?.value === "en" ? "en" : "az";
}

/** Returns a translator for the request's language. */
export async function translator() {
  const locale = await currentLocale();
  return {
    locale,
    t: (key: MessageKey) => M[key][locale],
  };
}

/** Plain lookup for code that runs outside a request (worker, error messages in actions). */
export function msg(key: MessageKey, locale: Locale = "az"): string {
  return M[key][locale];
}
