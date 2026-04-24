import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const ACCESS_COOKIE = "pnpi_access_token";
const ORIGINAL_COOKIE = "pnpi_original_token";

export async function POST(req: NextRequest, ctx: { params: Promise<{ username: string }> }) {
  const jar = await cookies();
  const adminToken = jar.get(ACCESS_COOKIE)?.value;
  if (!adminToken) return NextResponse.json({ detail: "Non authentifie." }, { status: 401 });

  const { username } = await ctx.params;

  const res = await fetch(`${BACKEND}/admin/impersonate/${encodeURIComponent(username)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "Erreur" }));
    return NextResponse.json(data, { status: res.status });
  }

  const data = (await res.json()) as {
    access_token: string;
    impersonated_user: { username: string; full_name: string; roles: string[] };
    impersonated_by: string;
  };

  const response = NextResponse.json(data);

  // Sauvegarde le token admin d'origine
  response.cookies.set(ORIGINAL_COOKIE, adminToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60, // 1h max
  });

  // Remplace l'access token actif par le token d'impersonation
  response.cookies.set(ACCESS_COOKIE, data.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 60, // 30 min (aligne sur le TTL backend)
  });

  return response;
}
