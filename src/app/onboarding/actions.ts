"use server";

import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { bootstrapBusiness } from "@/lib/db/business";
import { adviseRegime } from "@/lib/domain/tax";
import { parseMoney } from "@/lib/domain/money";
import { msg } from "@/lib/i18n";

export async function createBusiness(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.business) redirect("/");

  const name = String(formData.get("name") ?? "").trim();
  const voen = String(formData.get("voen") ?? "").replace(/\D/g, "") || null;
  const legalForm = String(formData.get("legalForm")) === "LLC" ? "LLC" : "INDIVIDUAL_ENTREPRENEUR";
  const turnoverQ = parseMoney(String(formData.get("turnover") ?? "0")) ?? 0;
  const wantsVat = formData.get("wantsVat") === "on";
  const hasEmployees = formData.get("hasEmployees") === "on";

  if (!name) throw new Error(msg("err_name"));
  if (formData.get("consentTax") !== "on" || formData.get("consentPersonal") !== "on") throw new Error(msg("err_consent"));

  const advice = adviseRegime({ legalForm, expectedAnnualTurnoverQ: turnoverQ, wantsVatVoluntarily: wantsVat });
  const now = new Date();
  const business = await prisma.business.create({
    data: {
      ownerId: user.id,
      name,
      voen,
      legalForm,
      taxRegime: advice.regime,
      hasEmployees,
      replyToEmail: user.email,
      consentTaxDataAt: now,
      consentPersonalDataAt: now,
    },
  });
  await bootstrapBusiness(business.id);
  redirect("/");
}
