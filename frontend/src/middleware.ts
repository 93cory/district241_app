import { NextRequest, NextResponse } from "next/server";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./lib/auth-cookies";

const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const refreshSkewSeconds = 30;

const decodeJwtExp = (token: string): number | null => {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(payloadBase64)) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
};

const shouldRefreshAccessToken = (accessToken: string | undefined): boolean => {
  if (!accessToken) return true;
  const exp = decodeJwtExp(accessToken);
  if (!exp) return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return exp <= nowSeconds + refreshSkewSeconds;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken || !shouldRefreshAccessToken(accessToken)) {
    // Role-based redirect for root path (when token is still valid)
    if (pathname === "/") {
      const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
      if (token) {
        try {
          const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
          const roles: string[] = payload.roles || [];

          if (roles.includes("admin")) {
            return NextResponse.redirect(new URL("/admin", request.url));
          } else if (roles.includes("ministre") || roles.includes("directeur")) {
            return NextResponse.redirect(new URL("/pnpi", request.url));
          } else if (roles.includes("instructeur")) {
            return NextResponse.redirect(new URL("/pnpi/mes-dossiers", request.url));
          } else if (roles.includes("inspecteur")) {
            return NextResponse.redirect(new URL("/pnpi/inspections", request.url));
          } else if (roles.includes("operateur")) {
            return NextResponse.redirect(new URL("/pnpi/guichet", request.url));
          }
        } catch {}
      }
    }
    return NextResponse.next();
  }

  try {
    const refreshResponse = await fetch(`${backendBaseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });

    if (!refreshResponse.ok) {
      const response = NextResponse.next();
      response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
      });
      response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    const tokens = (await refreshResponse.json()) as {
      access_token: string;
      refresh_token: string;
    };

    // Role-based redirect for root path (after token refresh)
    if (pathname === "/") {
      try {
        const payload = JSON.parse(Buffer.from(tokens.access_token.split(".")[1], "base64").toString());
        const roles: string[] = payload.roles || [];

        if (roles.includes("admin")) {
          const response = NextResponse.redirect(new URL("/admin", request.url));
          response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60,
          });
          response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 14 * 24 * 60 * 60,
          });
          return response;
        } else if (roles.includes("ministre") || roles.includes("directeur")) {
          const response = NextResponse.redirect(new URL("/pnpi", request.url));
          response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60,
          });
          response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 14 * 24 * 60 * 60,
          });
          return response;
        } else if (roles.includes("instructeur")) {
          const response = NextResponse.redirect(new URL("/pnpi/mes-dossiers", request.url));
          response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60,
          });
          response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 14 * 24 * 60 * 60,
          });
          return response;
        } else if (roles.includes("inspecteur")) {
          const response = NextResponse.redirect(new URL("/pnpi/inspections", request.url));
          response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60,
          });
          response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 14 * 24 * 60 * 60,
          });
          return response;
        } else if (roles.includes("operateur")) {
          const response = NextResponse.redirect(new URL("/pnpi/guichet", request.url));
          response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60,
          });
          response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 14 * 24 * 60 * 60,
          });
          return response;
        }
      } catch {}
    }

    const response = NextResponse.next();
    response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    });
    response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 14 * 24 * 60 * 60,
    });
    return response;
  } catch (err) {
    console.error("[PNPI Middleware] Token refresh failed:", err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
