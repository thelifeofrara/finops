"use server";

import type { ReminderStage } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { readBusinessForm } from "@/lib/businessForm";
import { STAGES } from "@/lib/domain/reminders";
import { requireBusiness } from "@/lib/session";

export async function updateBusiness(formData: FormData) {
  const biz = await requireBusiness();
  const form = readBusinessForm(formData);
  if (!form.ok) redirect(`/settings?err=${form.error}`);
  await prisma.business.update({ where: { id: biz.id }, data: form.value });
  revalidatePath("/", "layout");
  redirect("/settings?ok=1");
}

export async function updateTemplate(formData: FormData) {
  const biz = await requireBusiness();
  const stage = String(formData.get("stage")) as ReminderStage;
  if (!STAGES.includes(stage)) redirect("/settings");
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 200);
  const body = String(formData.get("body") ?? "").trim().slice(0, 5000);
  const enabled = formData.get("enabled") === "on";
  if (!subject || !body) redirect("/settings?err=required#templates");
  await prisma.reminderTemplate.upsert({
    where: { businessId_stage: { businessId: biz.id, stage } },
    update: { subject, body, enabled },
    create: { businessId: biz.id, stage, subject, body, enabled },
  });
  redirect("/settings?ok=1#templates");
}
