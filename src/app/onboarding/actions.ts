"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { bootstrapBusiness } from "@/lib/db/business";
import { readBusinessForm } from "@/lib/businessForm";
import { requireUser } from "@/lib/session";

export async function createBusiness(formData: FormData) {
  const user = await requireUser();
  if (await prisma.business.findUnique({ where: { ownerId: user.id } })) redirect("/");
  const form = readBusinessForm(formData);
  if (!form.ok) redirect(`/onboarding?err=${form.error}`);
  if (formData.get("consentTax") !== "on" || formData.get("consentPersonal") !== "on") redirect("/onboarding?err=required");

  const now = new Date();
  const business = await prisma.business.create({
    data: { ...form.value, ownerId: user.id, consentTaxDataAt: now, consentPersonalDataAt: now },
  });
  await bootstrapBusiness(business.id);
  redirect("/");
}
