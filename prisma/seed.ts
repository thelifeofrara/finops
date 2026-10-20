import { addDays, today } from "../src/lib/domain/dates";
import { bootstrapBusiness } from "../src/lib/db/business";
import { autoCategorise } from "../src/lib/db/bank";
import { prisma } from "../src/lib/db/prisma";
import { dedupeHash } from "../src/lib/domain/bankStatement";

// Demo data for local development: one business, a few customers, invoices in every ageing bucket,
// paid history (so debtor grades and advance quotes show), and a bank statement with payments to match.
// Sign in as demo@finops.local; the link arrives in Mailpit (http://localhost:8025).

async function main() {
  await prisma.$transaction([
    prisma.paymentAllocation.deleteMany(),
    prisma.bankTransaction.deleteMany(),
    prisma.bankStatement.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.reminderLog.deleteMany(),
    prisma.reminderTemplate.deleteMany(),
    prisma.categoryRule.deleteMany(),
    prisma.account.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  const user = await prisma.user.create({ data: { email: "demo@finops.local" } });
  const business = await prisma.business.create({
    data: {
      ownerId: user.id,
      name: "Demo Biznes FDV",
      voen: "1000000001",
      legalForm: "INDIVIDUAL_ENTREPRENEUR",
      taxRegime: "SIMPLIFIED",
      replyToEmail: "demo@finops.local",
      consentTaxDataAt: new Date(),
      consentPersonalDataAt: new Date(),
    },
  });
  await bootstrapBusiness(business.id);

  const nur = await prisma.customer.create({ data: { businessId: business.id, name: "Nur Market", voen: "1234567890", email: "nur@example.com" } });
  const kur = await prisma.customer.create({ data: { businessId: business.id, name: "Kür MMC", email: "kur@example.com" } });
  const ay = await prisma.customer.create({ data: { businessId: business.id, name: "Ay Təmizlik", email: "ay@example.com" } });

  const t0 = today();
  const invoices = [
    { c: nur, n: "FT-1001", issue: -40, terms: 30, amount: 350000 },
    { c: kur, n: "FT-1002", issue: -10, terms: 14, amount: 120000 },
    { c: ay, n: "FT-1003", issue: -75, terms: 30, amount: 80000 },
    { c: nur, n: "FT-1004", issue: -100, terms: 30, amount: 210000 },
    { c: kur, n: "FT-1005", issue: -3, terms: 30, amount: 95000 },
  ];
  for (const i of invoices) {
    const issueDate = addDays(t0, i.issue);
    await prisma.invoice.create({
      data: {
        businessId: business.id,
        customerId: i.c.id,
        number: i.n,
        issueDate,
        dueDate: addDays(issueDate, i.terms),
        amountQ: i.amount,
        vatQ: Math.round((i.amount * 18) / 118),
      },
    });
  }

  // Paid history: Nur Market pays on time, Kür MMC about ten days late.
  const statement = await prisma.bankStatement.create({ data: { businessId: business.id, fileName: "demo-statement.csv" } });
  const addTx = (date: Date, amountQ: number, description: string, counterparty: string | null, counterpartyVoen: string | null = null) =>
    prisma.bankTransaction.create({
      data: {
        businessId: business.id,
        statementId: statement.id,
        date,
        amountQ,
        description,
        counterparty,
        counterpartyVoen,
        dedupeHash: dedupeHash({ date, amountQ, description, counterparty, counterpartyVoen }),
      },
    });
  const history = [
    { c: nur, n: "FT-0901", issue: -200, terms: 30, amount: 150000, late: 0 },
    { c: nur, n: "FT-0902", issue: -170, terms: 30, amount: 90000, late: 2 },
    { c: nur, n: "FT-0903", issue: -140, terms: 30, amount: 120000, late: 1 },
    { c: kur, n: "FT-0904", issue: -160, terms: 30, amount: 60000, late: 10 },
  ];
  for (const h of history) {
    const issueDate = addDays(t0, h.issue);
    const dueDate = addDays(issueDate, h.terms);
    const inv = await prisma.invoice.create({
      data: { businessId: business.id, customerId: h.c.id, number: h.n, issueDate, dueDate, amountQ: h.amount, vatQ: Math.round((h.amount * 18) / 118) },
    });
    const tx = await addTx(addDays(dueDate, h.late), h.amount, `${h.n} üzrə ödəniş`, h.c.name, h.c.voen);
    await prisma.paymentAllocation.create({ data: { transactionId: tx.id, invoiceId: inv.id, amountQ: h.amount } });
  }

  // Waiting to be matched or categorised on the Payments page.
  await addTx(addDays(t0, -2), 120000, "FT-1002 hesab-faktura üzrə ödəniş", "Kür MMC");
  await addTx(addDays(t0, -5), 100000, "Qismən ödəniş", "Nur Market", "1234567890");
  await addTx(addDays(t0, -20), -80000, "Oktyabr ayı üçün ofis icarəsi", "Bakı Ofis MMC");
  await addTx(addDays(t0, -18), -4500, "Azercell mobil rabitə", "Azercell");
  await addTx(addDays(t0, -15), -1200, "Bank xidmət haqqı", null);
  await addTx(addDays(t0, -12), -25000, "Mal alışı", "Təchizat MMC");
  await autoCategorise(business.id);

  console.log(`Seeded business ${business.name} with ${invoices.length + history.length} invoices. Sign in as ${user.email}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
