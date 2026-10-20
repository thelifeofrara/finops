"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/domain/auth";
import { isLocale } from "@/lib/i18n";
import { getSession, LOCALE_COOKIE, SESSION_COOKIE, secureCookies } from "@/lib/session";

export async function setLocale(formData: FormData) {
  const locale = formData.get("locale");
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { httpOnly: true, sameSite: "lax", secure: secureCookies(), maxAge: 365 * 86400 });
  const s = await getSession();
  if (s) await prisma.user.update({ where: { id: s.user.id }, data: { locale } });
  revalidatePath("/", "layout");
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
