"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { mailer } from "@/lib/mail";
import {
  checkLoginToken,
  hashToken,
  isEmail,
  LOGIN_LINKS_PER_WINDOW,
  LOGIN_TOKEN_TTL_MINUTES,
  LOGIN_WINDOW_MINUTES,
  newToken,
  normalizeEmail,
  SESSION_TTL_DAYS,
} from "@/lib/domain/auth";
import { fmt } from "@/lib/i18n";
import { getDict, SESSION_COOKIE, secureCookies } from "@/lib/session";

export async function requestLink(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!isEmail(email)) redirect("/login?err=invalid");

  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60_000);
  const recent = await prisma.loginToken.count({ where: { email, createdAt: { gte: since } } });
  if (recent >= LOGIN_LINKS_PER_WINDOW) redirect("/login?err=too_many");

  const token = newToken();
  await prisma.loginToken.create({
    data: { email, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MINUTES * 60_000) },
  });
  const { l } = await getDict();
  const link = `${process.env.APP_URL ?? "http://localhost:3000"}/auth/verify?token=${encodeURIComponent(token)}`;
  await mailer().sendMail({
    from: { name: "FinOps", address: process.env.MAIL_FROM ?? "no-reply@finops.local" },
    to: email,
    subject: l.login.mailSubject,
    text: fmt(l.login.mailBody, { link }),
  });
  redirect(`/login?sent=${encodeURIComponent(email)}`);
}

/**
 * Spends a login token and starts a session. Runs from a button on the verify page, not on
 * the link's GET, so mail scanners that open links do not use up the token.
 */
export async function verifyLink(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const row = token ? await prisma.loginToken.findUnique({ where: { tokenHash: hashToken(token) } }) : null;
  if (checkLoginToken(row) !== "ok" || !row) redirect("/login?err=bad_link");

  // Mark used only if still unused, so two clicks cannot both start a session.
  const spent = await prisma.loginToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (spent.count !== 1) redirect("/login?err=bad_link");

  const jar = await cookies();
  const localeCookie = jar.get("finops_locale")?.value;
  const user = await prisma.user.upsert({
    where: { email: row.email },
    update: {},
    create: { email: row.email, locale: localeCookie === "en" ? "en" : "az" },
    include: { business: true },
  });
  const sessionToken = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  await prisma.session.create({ data: { userId: user.id, tokenHash: hashToken(sessionToken), expiresAt } });
  jar.set(SESSION_COOKIE, sessionToken, { httpOnly: true, sameSite: "lax", secure: secureCookies(), expires: expiresAt, path: "/" });
  redirect(user.business ? "/" : "/onboarding");
}
