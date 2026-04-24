import { backendRequest } from "../../../../../lib/backend";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      report_id?: string;
      status?: string;
    };

    if (!payload.report_id) {
      return new Response(JSON.stringify({ error: "report_id requis" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await backendRequest(
      `/field-reports/${encodeURIComponent(payload.report_id)}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: payload.status ?? "in_progress" }),
        cache: "no-store",
      },
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
