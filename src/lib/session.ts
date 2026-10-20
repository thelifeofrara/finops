import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db/prisma";
import { hashToken } from "./domain/auth";
import { dictionaries, isLocale, type Locale } from "./i18n";

export const SESSION_COOKIE = "finops_session";
export const LOCALE_COOKIE = "finops_locale";

export const secureCookies = () => (process.env.APP_URL ?? "").startsWith("https://");

/** The signed-in user and their business (if onboarded), or null. Cached per request. */
export const getSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { business: true } } },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return { user: session.user, business: session.user.business };
});

export async function requireUser() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s.user;
}

/** The signed-in user's business. Sends visitors to login, and new users to onboarding. */
export async function requireBusiness() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.business) redirect("/onboarding");
  return s.business;
}

export const getLocale = cache(async (): Promise<Locale> => {
  const s = await getSession();
  if (s) return s.user.locale;
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(c) ? c : "az";
});

export async function getDict() {
  const locale = await getLocale();
  return { l: dictionaries[locale], locale };
}
