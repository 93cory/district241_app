import { backendRequest } from "../../../../../lib/backend";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      notification_id?: string;
      is_read?: boolean;
    };

    if (!payload.notification_id) {
      return new Response(JSON.stringify({ error: "notification_id requis" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await backendRequest(
      `/admin/notifications/${encodeURIComponent(payload.notification_id)}/read`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: payload.is_read ?? true }),
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
