# FinOps

Get paid faster and keep your books, for small businesses in Azerbaijan.

## Run locally

```bash
docker compose up -d        # Postgres on :5432, Mailpit (email inbox) on http://localhost:8025
cp .env.example .env
npm install
npx prisma migrate dev      # create tables
npm run seed                # demo business, customers and invoices in every ageing bucket
npm run dev                 # app at http://localhost:3000
npm run reminders:once      # send due reminders once (DRY_RUN=1 to only log them)
npm run worker              # or keep running and send reminders every WORKER_INTERVAL_MINUTES
```

## Checks

```bash
npm run lint
npm run typecheck
npm test
```

## Sign in

Login is by one-time email link (no passwords). Locally the email lands in Mailpit at http://localhost:8025.
After `npm run seed`, sign in as **demo@finops.local** to see the demo business. Any other email starts a new
account and goes through business setup.

Sample files to try the importers are in `examples/` (`bank-statement.csv`, `eqaime.xml`).

## What is built

- **Login**: email magic links (15 minutes, single use, stored hashed), 30-day sessions, rate-limited link requests, business setup with consents.
- **Receivables**: ageing dashboard (current, 1–30, 31–60, 61–90, 90+ days), open invoice list, unmatched-payment nudge.
- **Invoices**: create invoices with payment terms and VAT; invoice page with payments, reminder log, next reminder, limitation date, void, reminder on/off, customer email and pause.
- **Reminders**: escalating schedule per invoice, one reminder per stage, Azerbaijani templates editable in Settings, logged per invoice.
- **Bank statement import**: CSV with Azerbaijani, English or Russian headers; duplicates skipped on re-upload; new transactions auto-categorised.
- **e-qaimə XML import**: sales invoices become invoices (customer found or created by VÖEN); purchase invoices and duplicates are skipped.
- **Payments**: suggested invoice matches with reasons, one-click confirm, manual match, undo; category picker that learns per counterparty.
- **Books**: trial balance and profit and loss for any period, built from invoices and bank transactions.
- **Tax calendar**: deadlines for the next 12 months by regime, simplified tax estimate for the last and current quarter, VAT threshold watch.
- **Invoice advance preview**: debtor grade, indicative advance and fee per open invoice, "I'm interested" to measure demand.
- **Languages**: Azerbaijani and English, switchable in the header and remembered per user.

## Not built yet

Real e-qaimə export samples should be checked against the parser (element names are matched by alias in
`src/lib/domain/eqaime.ts`), Excel bank statements, multi-user businesses, and a partner integration for advances.

## Notes

- Money is stored as integers in qəpik.
- FinOps never lends. The discounting quote is an indicative preview until a licensed bank or NBCI partner signs (see the legal review in `deliverables/` on PR #1 of the original repository).
- Filing deadlines are a guide. Confirm them on e-taxes.gov.az.
