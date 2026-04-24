import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

async function authHeaders() {
  const jar = await cookies();
  const token = jar.get("pnpi_access_token")?.value;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ inspectionId: string; photoId: string }> }
) {
  const headers = await authHeaders();
  if (!headers) return NextResponse.json({ detail: "Non authentifie." }, { status: 401 });
  const { inspectionId, photoId } = await ctx.params;

  const res = await fetch(
    `${BACKEND}/pnpi/inspections/${inspectionId}/photos/${photoId}`,
    { method: "DELETE", headers }
  );

  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
