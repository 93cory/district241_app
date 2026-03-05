"use server";
import { revalidatePath } from "next/cache";
import { backendRequest } from "../../../lib/backend";

export async function createATI(payload: { operateur_id: string; type_activite: string; secteur: string; priorite: string; observations?: string }) {
  const res = await backendRequest("/pnpi/ati", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store" as RequestCache,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail: string }).detail ?? "Erreur creation ATI");
  }
  revalidatePath("/pnpi/ati");
  revalidatePath("/pnpi/guichet");
  revalidatePath("/pnpi");
  return res.json();
}
