import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function POST(req: NextRequest, { params }: { params: { atiId: string } }) {
  const jar = await cookies();
  const token = jar.get("pnpi_access_token")?.value;
  if (!token) return NextResponse.json({ detail: "Non authentifie" }, { status: 401 });

  const form = await req.formData();
  const res = await fetch(`${BACKEND}/pnpi/ati/${params.atiId}/resubmit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
