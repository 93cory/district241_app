import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

async function authHeaders() {
  const jar = await cookies();
  const token = jar.get("pnpi_access_token")?.value;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ atiId: string }> }) {
  const headers = await authHeaders();
  if (!headers) return NextResponse.json({ detail: "Non authentifie." }, { status: 401 });
  const { atiId } = await ctx.params;

  const res = await fetch(`${BACKEND}/pnpi/ati/${atiId}/comments`, {
    headers,
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ atiId: string }> }) {
  const headers = await authHeaders();
  if (!headers) return NextResponse.json({ detail: "Non authentifie." }, { status: 401 });
  const { atiId } = await ctx.params;
  const body = await req.text();

  const res = await fetch(`${BACKEND}/pnpi/ati/${atiId}/comments`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
