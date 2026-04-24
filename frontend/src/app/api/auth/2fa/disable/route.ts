import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function DELETE(req: NextRequest) {
  const jar = await cookies();
  const token = jar.get("pnpi_access_token")?.value;
  if (!token) return NextResponse.json({ detail: "Non authentifie." }, { status: 401 });

  const body = await req.text();
  const res = await fetch(`${BACKEND}/auth/2fa/disable`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body || "{}",
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
