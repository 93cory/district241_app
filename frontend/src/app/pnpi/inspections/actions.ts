"use server";
import { revalidatePath } from "next/cache";
import { backendRequest } from "../../../lib/backend";

export async function createInspection(payload: {
  operateur_id: string;
  ati_id?: string;
  date_inspection: string;
  statut_conformite: string;
  observations: string;
  mesures_correctives?: string;
  latitude?: number;
  longitude?: number;
}) {
  const res = await backendRequest("/pnpi/inspections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? `Erreur ${res.status}`);
  }
  revalidatePath("/pnpi/inspections");
  revalidatePath("/pnpi");
  return res.json();
}
