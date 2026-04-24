import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

async function authHeaders() {
  const jar = await cookies();
  const token = jar.get("pnpi_access_token")?.value;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ inspectionId: string }> }) {
  const headers = await authHeaders();
  if (!headers) return NextResponse.json({ detail: "Non authentifie." }, { status: 401 });
  const { inspectionId } = await ctx.params;

  const res = await fetch(`${BACKEND}/pnpi/inspections/${inspectionId}/photos`, {
    headers,
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ inspectionId: string }> }) {
  const headers = await authHeaders();
  if (!headers) return NextResponse.json({ detail: "Non authentifie." }, { status: 401 });
  const { inspectionId } = await ctx.params;

  // Forward le FormData tel quel
  const form = await req.formData();

  const res = await fetch(`${BACKEND}/pnpi/inspections/${inspectionId}/photos`, {
    method: "POST",
    headers,
    body: form,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
