import { NextResponse } from "next/server";

import { backendBaseUrl } from "../../../../lib/backend";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "../../../../lib/auth-cookies";
import { getDefaultRouteForRoles } from "../../../../lib/role-routing";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const username = String(formData.get("username") ?? "").trim();
    const totpCode = String(formData.get("totp_code") ?? "").trim();

    if (!username || !totpCode) {
      return NextResponse.json(
        { error: "Utilisateur et code 2FA requis." },
        { status: 400 }
      );
    }

    const body = new URLSearchParams({ username, totp_code: totpCode });
    const tokenResponse = await fetch(`${backendBaseUrl}/auth/token/2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      const errBody = (await tokenResponse.json()) as { detail?: string };
      return NextResponse.json(
        { error: errBody.detail ?? `Verification 2FA echouee (${tokenResponse.status}).`, detail: errBody.detail },
        { status: tokenResponse.status }
      );
    }

    const tokenBody = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
    };

    // Fetch user profile to determine redirect
    const meResponse = await fetch(`${backendBaseUrl}/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
      cache: "no-store",
    });

    if (!meResponse.ok) {
      return NextResponse.json(
        { error: `Lecture profil echouee (${meResponse.status}).` },
        { status: meResponse.status }
      );
    }

    const meBody = (await meResponse.json()) as { roles?: string[]; username: string; full_name: string };
    const roles = meBody.roles ?? [];
    const redirectTo = getDefaultRouteForRoles(roles);

    const response = NextResponse.json({
      ok: true,
      username: meBody.username,
      full_name: meBody.full_name,
      roles,
      redirect_to: redirectTo,
    });

    response.cookies.set(ACCESS_TOKEN_COOKIE, tokenBody.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    });
    response.cookies.set(REFRESH_TOKEN_COOKIE, tokenBody.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 14 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
