import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

async function auth() {
  const jar = await cookies();
  const token = jar.get("pnpi_access_token")?.value;
  return token ? { Authorization: `Bearer ${token}` } : null;
}

export async function GET() {
  const headers = await auth();
  if (!headers) return NextResponse.json({ detail: "Non authentifie." }, { status: 401 });

  const res = await fetch(`${BACKEND}/admin/raci`, { headers, cache: "no-store" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(req: NextRequest) {
  const headers = await auth();
  if (!headers) return NextResponse.json({ detail: "Non authentifie." }, { status: 401 });

  const body = await req.text();
  const res = await fetch(`${BACKEND}/admin/raci`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
