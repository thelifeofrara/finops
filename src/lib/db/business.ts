import { prisma } from "./prisma";
import { DEFAULT_CHART } from "../domain/chart";
import { DEFAULT_TEMPLATES, STAGES } from "../domain/reminders";

// The MVP has one signed-in business. Login is not built yet, so the first business in the
// database is used. Replace this with the session lookup when auth lands.
export async function currentBusiness() {
  const business = await prisma.business.findFirst({ orderBy: { createdAt: "asc" } });
  if (!business) throw new Error("No business yet. Run `npm run seed` first.");
  return business;
}

/** Creates the default chart of accounts and reminder templates for a new business. */
export async function bootstrapBusiness(businessId: string) {
  await prisma.account.createMany({
    data: DEFAULT_CHART.map((a) => ({ businessId, code: a.code, nameAz: a.nameAz, nameEn: a.nameEn, type: a.type, system: a.system ?? null })),
    skipDuplicates: true,
  });
  await prisma.reminderTemplate.createMany({
    data: STAGES.map((stage) => ({ businessId, stage, subject: DEFAULT_TEMPLATES[stage].subject, body: DEFAULT_TEMPLATES[stage].body })),
    skipDuplicates: true,
  });
}
