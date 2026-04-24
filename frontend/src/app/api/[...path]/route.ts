import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Proxy generique Next.js -> FastAPI backend.
 *
 * Forward TOUT endpoint backend en injectant le token d'auth du cookie httpOnly.
 * Les routes Next.js specifiques (ex : /api/auth/login, /api/admin/impersonate/*)
 * prennent la priorite sur ce catch-all — celui-ci ne rentre en jeu que pour
 * les endpoints backend sans logique speciale cote Next.
 *
 * Supporte GET, POST, PUT, PATCH, DELETE.
 * Transmet :
 *  - Query string
 *  - Body (JSON, FormData, text)
 *  - Authorization header (Bearer depuis cookie pnpi_access_token)
 *  - Content-Type
 * Renvoie le body backend tel quel (JSON ou binaire).
 */

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

async function getAuth() {
  const jar = await cookies();
  const token = jar.get("pnpi_access_token")?.value;
  return token ? `Bearer ${token}` : null;
}

async function forward(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
  method: string
): Promise<NextResponse> {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ detail: "Non authentifie." }, { status: 401 });

  const { path } = await ctx.params;
  const backendPath = "/" + (path ?? []).join("/");
  const qs = req.nextUrl.search;
  const url = `${BACKEND}${backendPath}${qs}`;

  const headers: Record<string, string> = {
    Authorization: auth,
  };

  // Preserve content-type (except multipart which fetch sets itself)
  const contentType = req.headers.get("content-type");
  const isMultipart = contentType?.includes("multipart/form-data");
  if (contentType && !isMultipart) {
    headers["Content-Type"] = contentType;
  }

  // Prepare body for non-GET/HEAD methods
  let body: BodyInit | undefined = undefined;
  if (method !== "GET" && method !== "HEAD") {
    if (isMultipart) {
      body = await req.formData();
    } else {
      body = await req.text();
      if (!body) body = undefined;
    }
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(url, { method, headers, body, cache: "no-store" });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Erreur reseau" },
      { status: 502 }
    );
  }

  // Forward binary if not JSON (PDF, CSV, images...)
  const respCT = backendRes.headers.get("content-type") ?? "application/octet-stream";
  if (!respCT.includes("application/json") && !respCT.includes("text/")) {
    const buf = await backendRes.arrayBuffer();
    return new NextResponse(buf, {
      status: backendRes.status,
      headers: {
        "Content-Type": respCT,
        "Content-Disposition":
          backendRes.headers.get("content-disposition") ?? "inline",
      },
    });
  }

  // Forward text/json
  const text = await backendRes.text();
  try {
    const data = JSON.parse(text);
    return NextResponse.json(data, { status: backendRes.status });
  } catch {
    return new NextResponse(text, {
      status: backendRes.status,
      headers: { "Content-Type": respCT },
    });
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx, "GET");
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx, "POST");
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx, "PUT");
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx, "PATCH");
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx, "DELETE");
}
