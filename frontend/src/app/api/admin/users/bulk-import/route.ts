import { cookies } from "next/headers";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function POST(req: Request) {
  try {
    const jar = await cookies();
    const token = jar.get("pnpi_access_token")?.value;
    if (!token) {
      return new Response(JSON.stringify({ detail: "Non authentifie" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const res = await fetch(`${BACKEND}/admin/users/bulk-import`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
