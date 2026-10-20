import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const to = new URL(request.url).searchParams.get("to") === "en" ? "en" : "az";
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("lang", to, { path: "/", maxAge: 365 * 86_400, sameSite: "lax" });
  return response;
}
