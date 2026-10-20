import { prisma } from "./prisma";
import { normalizeParty } from "../domain/categorize";

/** Remembers the owner's choice for a counterparty, so the same party is categorised automatically next time. */
export async function rememberCategory(businessId: string, counterparty: string | null, counterpartyVoen: string | null, accountId: string, direction: "IN" | "OUT") {
  const accountDir = direction;
  if (counterpartyVoen) {
    await prisma.categoryRule.upsert({
      where: { businessId_matchOn_pattern_direction: { businessId, matchOn: "voen", pattern: counterpartyVoen, direction: accountDir } },
      update: { accountId },
      create: { businessId, matchOn: "voen", pattern: counterpartyVoen, direction: accountDir, accountId },
    });
    return;
  }
  if (!counterparty) return;
  const pattern = normalizeParty(counterparty);
  await prisma.categoryRule.upsert({
    where: { businessId_matchOn_pattern_direction: { businessId, matchOn: "counterparty", pattern, direction: accountDir } },
    update: { accountId },
    create: { businessId, matchOn: "counterparty", pattern, direction: accountDir, accountId },
  });
}
