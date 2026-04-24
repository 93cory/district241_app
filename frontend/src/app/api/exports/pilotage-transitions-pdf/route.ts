import { backendRequest } from "../../../../lib/backend";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.toString();
    const path = query
      ? `/exports/pilotage-transitions.pdf?${query}`
      : "/exports/pilotage-transitions.pdf";
    const response = await backendRequest(path, {
      next: { revalidate: 0 },
      cache: "no-store",
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Export transitions PDF indisponible (${response.status})` }),
        { status: response.status, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = await response.arrayBuffer();
    const contentDisposition =
      response.headers.get("content-disposition") ??
      "attachment; filename=pilotage-transitions.pdf";

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
