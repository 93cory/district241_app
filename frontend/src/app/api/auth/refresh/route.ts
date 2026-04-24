import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "../../../../lib/auth-cookies";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * Prend le refresh_token du cookie, demande un nouveau access_token au backend,
 * puis remet a jour les 2 cookies (access + refresh).
 */
export async function POST() {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ detail: "Pas de refresh token." }, { status: 401 });
  }

  const res = await fetch(`${BACKEND}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "Refresh echoue." }));
    const response = NextResponse.json(data, { status: res.status });
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
    return response;
  }

  const body = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
  };

  if (!body.access_token || !body.refresh_token) {
    return NextResponse.json({ detail: "Reponse refresh incomplete." }, { status: 502 });
  }

  const response = NextResponse.json({ status: "ok" });

  response.cookies.set(ACCESS_TOKEN_COOKIE, body.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, body.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 14 * 24 * 60 * 60,
  });

  return response;
}
