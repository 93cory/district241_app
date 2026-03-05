import { NextResponse } from "next/server";

import { fetchBackendProfile } from "../../../../lib/backend";

export async function GET() {
  try {
    const profile = await fetchBackendProfile();
    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Non authentifie.";
    return new NextResponse(JSON.stringify({ error: message }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}
