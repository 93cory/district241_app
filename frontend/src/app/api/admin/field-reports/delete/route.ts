import { backendRequest } from "../../../../../lib/backend";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { report_id?: string };
    if (!payload.report_id) {
      return new Response(JSON.stringify({ error: "report_id requis" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await backendRequest(`/field-reports/${encodeURIComponent(payload.report_id)}`, {
      method: "DELETE",
      cache: "no-store",
    });

    return new Response(null, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
