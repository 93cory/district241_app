import { backendRequest } from "../../../../../lib/backend";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      declaration_id?: string;
      validated?: boolean;
    };

    if (!payload.declaration_id) {
      return new Response(JSON.stringify({ error: "declaration_id requis" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await backendRequest(
      `/declarations/${encodeURIComponent(payload.declaration_id)}/validate`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validated: payload.validated ?? true }),
        cache: "no-store",
      }
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

