import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function GET(_req: Request, ctx: { params: Promise<{ year: string }> }) {
  const jar = await cookies();
  const token = jar.get("pnpi_access_token")?.value;
  if (!token) return NextResponse.json({ detail: "Non authentifie." }, { status: 401 });

  const { year } = await ctx.params;
  const res = await fetch(`${BACKEND}/pnpi/dashboard/annual-report/${year}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
