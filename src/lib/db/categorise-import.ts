import { prisma } from "./prisma";
import { categorize } from "../domain/categorize";
import { customerIdentity, learnedRules } from "./ledgerData";

/** Assigns a category to every transaction that has none yet. Returns how many were categorised. */
export async function categoriseUncategorised(businessId: string): Promise<number> {
  const [accounts, learned, identity, rows] = await Promise.all([
    prisma.account.findMany({ where: { businessId } }),
    learnedRules(businessId),
    customerIdentity(businessId),
    prisma.bankTransaction.findMany({ where: { businessId, accountId: null } }),
  ]);
  const byCode = new Map(accounts.map((a) => [a.code, a]));
  let count = 0;
  for (const tx of rows) {
    const guess = categorize(
      { amountQ: tx.amountQ, description: tx.description, counterparty: tx.counterparty, counterpartyVoen: tx.counterpartyVoen },
      { learned, ...identity },
    );
    if (!guess) continue;
    // Customer receipts are left for the payment matching screen, so they settle a real invoice.
    if (guess.source === "CUSTOMER") continue;
    const account = byCode.get(guess.accountCode);
    if (!account) continue;
    await prisma.bankTransaction.update({
      where: { id: tx.id },
      data: { accountId: account.id, categoryConfidence: guess.confidence, categorySource: guess.source },
    });
    count++;
  }
  return count;
}
