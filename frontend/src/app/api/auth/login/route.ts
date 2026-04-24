import { NextResponse } from "next/server";

import { backendBaseUrl } from "../../../../lib/backend";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "../../../../lib/auth-cookies";
import { getDefaultRouteForRoles } from "../../../../lib/role-routing";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { username?: string; password?: string };
    const username = String(payload.username ?? "").trim();
    const password = String(payload.password ?? "");

    if (!username || !password) {
      return new NextResponse(
        JSON.stringify({ error: "Utilisateur et mot de passe requis." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const form = new URLSearchParams({ username, password });
    const tokenResponse = await fetch(`${backendBaseUrl}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      return new NextResponse(
        JSON.stringify({ error: `Authentification echouee (${tokenResponse.status}).` }),
        { status: tokenResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const tokenBody = (await tokenResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      requires_2fa?: boolean;
      username?: string;
      message?: string;
    };

    // If 2FA is required, forward that to the client without issuing cookies
    if (tokenBody.requires_2fa) {
      return NextResponse.json({
        requires_2fa: true,
        username: tokenBody.username,
        message: tokenBody.message,
      });
    }

    if (!tokenBody.access_token || !tokenBody.refresh_token) {
      return new NextResponse(
        JSON.stringify({ error: "Reponse d'authentification incomplete (token manquant)." }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const meResponse = await fetch(`${backendBaseUrl}/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
      cache: "no-store",
    });

    if (!meResponse.ok) {
      return new NextResponse(
        JSON.stringify({ error: `Lecture profil echouee (${meResponse.status}).` }),
        { status: meResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const meBody = (await meResponse.json()) as { roles?: string[]; username: string; full_name: string };
    const roles = meBody.roles ?? [];
    const redirectTo = getDefaultRouteForRoles(roles);

    const response = NextResponse.json({
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
      maxAge: 8 * 60 * 60, // 8h, aligne sur le JWT backend
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
    return new NextResponse(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
