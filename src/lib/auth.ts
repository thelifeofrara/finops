import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db/prisma";
import { mailer } from "./mail";
import { addDays } from "./domain/dates";

// Passwordless login: a one-time link is emailed; following it starts a 30-day session.
// Only hashes of tokens are stored, so a database leak does not expose live links.

export const SESSION_COOKIE = "finops_session";
const COOKIE = SESSION_COOKIE;
const LOGIN_TTL_MINUTES = 15;
const SESSION_DAYS = 30;

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

export async function sendLoginLink(emailRaw: string): Promise<void> {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-poçt düzgün deyil.");
  const token = randomBytes(32).toString("base64url");
  await prisma.loginToken.create({
    data: {
      email,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + LOGIN_TTL_MINUTES * 60_000),
    },
  });
  const link = `${process.env.APP_URL ?? "http://localhost:3000"}/auth/verify?token=${token}`;
  await mailer().sendMail({
    from: process.env.MAIL_FROM ?? "no-reply@finops.local",
    to: email,
    subject: "FinOps: daxil olma linki",
    text: `Daxil olmaq üçün linki açın (${LOGIN_TTL_MINUTES} dəqiqə etibarlıdır):\n\n${link}\n\nBu sorğunu siz etməmisinizsə, bu e-poçtu nəzərə almayın.`,
  });
}

/** Exchanges a login token for a new session. Returns the session token, or null if the login link is unknown, used or expired. */
export async function consumeLoginToken(token: string): Promise<string | null> {
  const row = await prisma.loginToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  const user = await prisma.user.upsert({
    where: { email: row.email },
    update: {},
    create: { email: row.email },
  });
  await prisma.loginToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  const sessionToken = randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: { userId: user.id, tokenHash: hash(sessionToken), expiresAt: addDays(new Date(), SESSION_DAYS) },
  });
  return sessionToken;
}

/** Cookie options for the session. Route handlers set these on their response; see auth/verify. */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: (process.env.APP_URL ?? "").startsWith("https://"),
  path: "/",
  maxAge: SESSION_DAYS * 86_400,
};

export async function endSessionByToken(token: string | undefined): Promise<void> {
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hash(token) } });
}

export async function currentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: { include: { business: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

/** For pages that need a signed-in owner with a business set up. Redirects otherwise. */
export async function requireBusiness() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.business) redirect("/onboarding");
  return { user, business: user.business };
}
