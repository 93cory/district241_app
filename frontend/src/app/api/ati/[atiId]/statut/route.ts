import { backendRequest } from "../../../../../lib/backend";

export async function PATCH(request: Request, { params }: { params: Promise<{ atiId: string }> }) {
  try {
    const { atiId } = await params;
    const payload = await request.json();

    const response = await backendRequest(`/pnpi/ati/${encodeURIComponent(atiId)}/statut`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
