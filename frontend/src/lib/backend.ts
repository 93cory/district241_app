import { cookies } from "next/headers";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./auth-cookies";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const BACKEND_USERNAME = process.env.PNPI_BACKEND_USERNAME;
const BACKEND_PASSWORD = process.env.PNPI_BACKEND_PASSWORD;
const SERVICE_AUTH_ENABLED = process.env.PNPI_ENABLE_SERVICE_AUTH === "1";

let cachedToken: { value: string; expiresAt: number } | null = null;

export interface BackendProfile {
  username: string;
  full_name: string;
  roles: string[];
}

export const backendBaseUrl = BASE_URL;

export const getBackendAuthHeaders = async (): Promise<Record<string, string>> => {
  const cookieStore = await cookies();
  const accessFromCookie = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value?.trim();
  if (accessFromCookie) {
    return { Authorization: `Bearer ${accessFromCookie}` };
  }

  if (!SERVICE_AUTH_ENABLED) {
    throw new Error("Non authentifie. Connectez-vous depuis /connexion.");
  }

  if (!BACKEND_USERNAME || !BACKEND_PASSWORD) {
    throw new Error("Configuration service manquante: definir PNPI_BACKEND_USERNAME/PASSWORD.");
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return { Authorization: `Bearer ${cachedToken.value}` };
  }

  const form = new URLSearchParams({
    username: BACKEND_USERNAME,
    password: BACKEND_PASSWORD,
  });

  const response = await fetch(`${BASE_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Echec auth backend ${response.status}: ${response.statusText}`);
  }

  const body = (await response.json()) as { access_token: string };
  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + 55 * 60 * 1000,
  };

  return { Authorization: `Bearer ${cachedToken.value}` };
};

export const backendRequest = async (path: string, init?: RequestInit): Promise<Response> => {
  const authHeaders = await getBackendAuthHeaders();
  const requestHeaders = new Headers(init?.headers ?? {});
  Object.entries(authHeaders).forEach(([key, value]) => requestHeaders.set(key, value));

  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: requestHeaders,
    ...(init?.cache === "no-store" || init?.next ? {} : { next: { revalidate: 60 } }),
  });
};

export const fetchBackendProfile = async (): Promise<BackendProfile> => {
  const response = await backendRequest("/auth/me", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Echec lecture profil backend ${response.status}: ${response.statusText}`);
  }
  return (await response.json()) as BackendProfile;
};
