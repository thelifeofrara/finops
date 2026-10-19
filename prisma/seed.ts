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
  console.log(`Seeded business ${business.name} with ${invoices.length} invoices.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
