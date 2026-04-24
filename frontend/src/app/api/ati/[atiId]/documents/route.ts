import { backendRequest, getBackendAuthHeaders, backendBaseUrl } from "../../../../../lib/backend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ atiId: string }> },
) {
  try {
    const { atiId } = await params;
    const response = await backendRequest(
      `/pnpi/ati/${encodeURIComponent(atiId)}/documents`,
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ atiId: string }> },
) {
  try {
    const { atiId } = await params;
    const authHeaders = await getBackendAuthHeaders();

    // Forward the FormData directly to the backend
    const formData = await request.formData();
    const backendForm = new FormData();
    for (const [key, value] of formData.entries()) {
      backendForm.append(key, value);
    }

    const response = await fetch(
      `${backendBaseUrl}/pnpi/ati/${encodeURIComponent(atiId)}/documents`,
      {
        method: "POST",
        headers: { ...authHeaders },
        body: backendForm,
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ atiId: string }> },
) {
  try {
    await params;
    const url = new URL(request.url);
    const docId = url.searchParams.get("docId");
    if (!docId) {
      return new Response(JSON.stringify({ error: "docId requis" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await backendRequest(
      `/pnpi/documents/${encodeURIComponent(docId)}`,
      { method: "DELETE", cache: "no-store" },
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
