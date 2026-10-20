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

## What is built

- **Receivables**: ageing dashboard (current, 1–30, 31–60, 61–90, 90+ days), open invoice list.
- **Invoices**: create invoices with payment terms and VAT.
- **Reminders**: escalating schedule per invoice, one reminder per stage, Azerbaijani templates, logged per invoice.
- **Bank statement import**: CSV with Azerbaijani, English or Russian headers; duplicates skipped on re-upload.
- **Domain logic** (`src/lib/domain`): money in qəpik, ageing, debtor scoring, invoice discounting quote, payment-to-invoice matching, transaction categorisation, a balanced double-entry ledger, filing calendar.

## Not built yet

Login (the first business in the database is used), e-qaimə XML import, payment matching UI, ledger and trial balance pages, tax calendar page, discounting preview page, English UI.

## Notes

- Money is stored as integers in qəpik.
- FinOps never lends. The discounting quote is an indicative preview until a licensed bank or NBCI partner signs (see the legal review in `deliverables/` on PR #1 of the original repository).
- Filing deadlines are a guide. Confirm them on e-taxes.gov.az.
