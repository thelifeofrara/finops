import { prisma } from "./prisma";
import { DEFAULT_CHART } from "../domain/chart";
import { DEFAULT_TEMPLATES, STAGES } from "../domain/reminders";

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
