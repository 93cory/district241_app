import { backendRequest } from "../../../../../lib/backend";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dossierId = url.searchParams.get("dossier_id");
    if (!dossierId) {
      return new Response(JSON.stringify({ error: "dossier_id requis" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await backendRequest(
      `/pilotage/dossiers/${encodeURIComponent(dossierId)}/history`,
      { cache: "no-store" },
    );
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
