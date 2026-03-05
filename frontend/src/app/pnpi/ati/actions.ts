"use server";
import { revalidatePath } from "next/cache";
import { backendRequest } from "../../../lib/backend";

export async function updateATIStatut(atiId: string, payload: { new_statut: string; note?: string; motif_rejet?: string; numero_reference_decision?: string }) {
  const res = await backendRequest(`/pnpi/ati/${encodeURIComponent(atiId)}/statut`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store" as RequestCache,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail: string }).detail ?? "Erreur mise a jour statut");
  }
  revalidatePath("/pnpi/ati");
  revalidatePath(`/pnpi/ati/${atiId}`);
  revalidatePath("/pnpi");
}
