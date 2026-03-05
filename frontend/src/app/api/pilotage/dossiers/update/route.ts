import { backendRequest } from "../../../../../lib/backend";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      dossier_id?: string;
      status?: string;
      stage?: string;
      priority?: string;
      sla_days?: number;
      assigned_to?: string;
    };

    if (!payload.dossier_id) {
      return new Response(JSON.stringify({ error: "dossier_id requis" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { dossier_id, ...updatePayload } = payload;
    const response = await backendRequest(`/pilotage/dossiers/${encodeURIComponent(dossier_id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload),
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
