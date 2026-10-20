import { PrismaClient } from "@prisma/client";
import { addDays, today } from "../src/lib/domain/dates";
import { bootstrapBusiness } from "../src/lib/db/business";

// Demo data for local development: one business, a few customers, invoices in every ageing bucket.
const prisma = new PrismaClient();

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
  // A customer who pays on time, so the advance preview has a real history to score.
  const good = await prisma.customer.create({
    data: { businessId: business.id, name: "Güvənli MMC", voen: "7777777777", email: "guvenli@example.com" },
  });
  const statement = await prisma.bankStatement.create({ data: { businessId: business.id, fileName: "demo-history.csv" } });
  for (const [n, issueOffset] of [["FT-0901", -120], ["FT-0902", -90], ["FT-0903", -60]] as const) {
    const issueDate = addDays(t0, issueOffset);
    const dueDate = addDays(issueDate, 30);
    const inv = await prisma.invoice.create({
      data: { businessId: business.id, customerId: good.id, number: n, issueDate, dueDate, amountQ: 240000, vatQ: 36610 },
    });
    const tx = await prisma.bankTransaction.create({
      data: {
        businessId: business.id,
        statementId: statement.id,
        date: dueDate,
        amountQ: 240000,
        description: `Ödəniş ${n}`,
        counterparty: good.name,
        counterpartyVoen: good.voen,
        dedupeHash: `demo-${n}`,
      },
    });
    await prisma.paymentAllocation.create({ data: { transactionId: tx.id, invoiceId: inv.id, amountQ: 240000 } });
  }
  await prisma.invoice.create({
    data: {
      businessId: business.id,
      customerId: good.id,
      number: "FT-0904",
      issueDate: addDays(t0, -5),
      dueDate: addDays(t0, 25),
      amountQ: 180000,
      vatQ: 27458,
    },
  });
  console.log(`Seeded business ${business.name} with ${invoices.length + 4} invoices.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
