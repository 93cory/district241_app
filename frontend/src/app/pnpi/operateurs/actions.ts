"use server";
import { revalidatePath } from "next/cache";
import { backendRequest } from "../../../lib/backend";

export async function toggleOperateurActive(operateurId: string) {
  const res = await backendRequest(
    `/pnpi/operateurs/${encodeURIComponent(operateurId)}/toggle-active`,
    {
      method: "POST",
      cache: "no-store" as RequestCache,
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail: string }).detail ?? "Erreur toggle operateur");
  }
  revalidatePath("/pnpi/operateurs");
  revalidatePath(`/pnpi/operateurs/${operateurId}`);
  revalidatePath("/pnpi");
}
