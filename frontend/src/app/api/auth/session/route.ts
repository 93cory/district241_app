import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { fetchBackendProfile } from "../../../../lib/backend";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "../../../../lib/auth-cookies";

type SessionState = "non_connecte" | "active" | "a_renouveler" | "invalide";

const decodeJwtExp = (token: string): number | null => {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8")) as {
      exp?: number;
    };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
};

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value?.trim();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value?.trim();

  if (!accessToken && !refreshToken) {
    return NextResponse.json({
      status: "non_connecte" as SessionState,
      label: "Non connecte",
      seconds_left: null,
      has_refresh_token: false,
      user: null,
    });
  }

  const exp = accessToken ? decodeJwtExp(accessToken) : null;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const secondsLeft = exp ? exp - nowSeconds : null;

  let status: SessionState = "active";
  let label = "Session active";
  if (secondsLeft != null && secondsLeft <= 120) {
    status = "a_renouveler";
    label = "Session a renouveler";
  }
  if (secondsLeft != null && secondsLeft <= 0) {
    status = "invalide";
    label = "Session invalide";
  }

  try {
    const profile = await fetchBackendProfile();
    return NextResponse.json({
      status,
      label,
      seconds_left: secondsLeft,
      has_refresh_token: Boolean(refreshToken),
      user: {
        username: profile.username,
        full_name: profile.full_name,
        roles: profile.roles ?? [],
      },
    });
  } catch {
    return NextResponse.json(
      {
        status: "invalide" as SessionState,
        label: "Session invalide",
        seconds_left: secondsLeft,
        has_refresh_token: Boolean(refreshToken),
        user: null,
      },
      { status: 401 }
    );
  }
}
