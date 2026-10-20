import { prisma } from "./prisma";
import { deadlines, prepareSimplifiedTax, quarterRange } from "../domain/tax";
import { receiptsBetween } from "./ledgerData";
import { today } from "../domain/dates";

export async function taxView(businessId: string, asOf = today()) {
  const biz = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  const quarter = quarterRange(asOf, "previous");
  const receiptsQ = await receiptsBetween(businessId, quarter.start, quarter.end);
  const prepared = biz.taxRegime === "SIMPLIFIED" ? prepareSimplifiedTax(receiptsQ, biz.simplifiedRateBp) : null;
  const upcoming = deadlines(biz, asOf, 12);
  return { biz, quarter, receiptsQ, prepared, upcoming };
}
