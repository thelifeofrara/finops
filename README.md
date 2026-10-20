# FinOps

Get paid faster and keep your books, for small businesses in Azerbaijan.

## Run locally

```bash
docker compose up -d        # Postgres on :5432, Mailpit (email inbox) on http://localhost:8025
cp .env.example .env
npm install
npx prisma migrate dev      # create tables
npm run seed                # demo business with customers, invoices, payment history
npm run dev                 # app at http://localhost:3000
```

Sign in with `demo@finops.local` (or any email). The sign-in link arrives in the Mailpit inbox at http://localhost:8025. A new user gets an onboarding step that sets up the business.

Reminders: `npm run reminders:once`, or keep the worker running with `npm run worker`. Set `DRY_RUN=1` to only log them.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## What is built

- **Sign-in and onboarding**: email login link, then business setup with a suggested tax regime and consent.
- **Receivables**: ageing dashboard (current, 1–30, 31–60, 61–90, 90+ days) and open invoices.
- **Invoices**: create invoices with payment terms and VAT.
- **Import**: bank statement CSV (Azerbaijani, English or Russian headers; duplicates skipped) and e-qaimə XML.
- **Payments**: matching incoming money to open invoices, with suggestions the owner confirms. Other money is categorised here.
- **Ledger**: balanced double-entry trial balance, income, expenses, profit, uncategorised amounts, and category choices that the app remembers per counterparty.
- **Tax**: regime, simplified-tax preparation for the previous quarter, and a filing calendar.
- **Advance**: indicative advance quotes per invoice, based on the customer's payment history. "I'm interested" records demand. No money moves.
- **Language**: Azerbaijani by default, English via the switch in the header.

## Not built yet

- e-qaimə layout: the parser reads invoice fields by name, but has not yet been checked against a real State Tax Service export.
- Editing reminder templates in the app (the defaults are in `src/lib/domain/reminders.ts`).
- Direct filing with the State Tax Service and live partner funding. Both need agreements (see the legal review).

## Notes

- Money is stored as integers in qəpik.
- FinOps never lends. The discounting quote is an indicative preview until a licensed bank or NBCI partner signs (see the legal review in `deliverables/` on PR #1 of the original repository).
- Filing deadlines are a guide. Confirm them on e-taxes.gov.az.
