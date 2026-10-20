import { NextResponse } from "next/server";
import { consumeLoginToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const sessionToken = token ? await consumeLoginToken(token) : null;
  if (!sessionToken) return NextResponse.redirect(new URL("/login?error=expired", request.url));
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(SESSION_COOKIE, sessionToken, SESSION_COOKIE_OPTIONS);
  return response;
}
