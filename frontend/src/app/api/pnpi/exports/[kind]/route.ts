import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * Proxy unique pour les exports PNPI :
 *   /api/pnpi/exports/ati.csv
 *   /api/pnpi/exports/operateurs.csv
 *   /api/pnpi/exports/inspections.csv
 *   /api/pnpi/exports/briefing.pdf
 * Injecte le token admin depuis le cookie httpOnly et forward le flux binaire.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  const jar = await cookies();
  const token = jar.get("pnpi_access_token")?.value;
  if (!token) return NextResponse.json({ detail: "Non authentifie." }, { status: 401 });

  const { kind } = await ctx.params;
  const qs = req.nextUrl.search;

  const res = await fetch(`${BACKEND}/pnpi/exports/${kind}${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return new NextResponse(text || JSON.stringify({ detail: "Erreur export" }), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const blob = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const disposition = res.headers.get("content-disposition") ?? `attachment; filename="${kind}"`;

  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": disposition,
    },
  });
}
