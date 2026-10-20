import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { endSessionByToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const jar = await cookies();
  await endSessionByToken(jar.get(SESSION_COOKIE)?.value);
  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
