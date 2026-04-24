import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ACCESS_COOKIE = "pnpi_access_token";
const ORIGINAL_COOKIE = "pnpi_original_token";

export async function POST() {
  const jar = await cookies();
  const originalToken = jar.get(ORIGINAL_COOKIE)?.value;

  const response = NextResponse.json({ restored: Boolean(originalToken) });

  if (originalToken) {
    // Restaure le token admin d'origine
    response.cookies.set(ACCESS_COOKIE, originalToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    });
  }

  // Efface le cookie d'impersonation
  response.cookies.delete(ORIGINAL_COOKIE);

  return response;
}
