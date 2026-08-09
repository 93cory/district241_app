"use client";

type SessionPayload = {
  user?: {
    username?: string;
    roles?: string[];
  } | null;
};

export async function getCurrentUsernameFallback(): Promise<string> {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) return "utilisateur";
    const data = (await response.json()) as SessionPayload;
    return data.user?.username || "utilisateur";
  } catch {
    return "utilisateur";
  }
}

export async function getCurrentSessionUser(): Promise<{ username: string; roles: string[] }> {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) return { username: "utilisateur", roles: [] };
    const data = (await response.json()) as SessionPayload;
    return {
      username: data.user?.username || "utilisateur",
      roles: data.user?.roles ?? [],
    };
  } catch {
    return { username: "utilisateur", roles: [] };
  }
}

export function userScopedStorageKey(baseKey: string, username: string): string {
  return `${baseKey}:${username}`;
}
