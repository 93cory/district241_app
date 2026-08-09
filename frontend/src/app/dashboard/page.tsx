import { redirect } from "next/navigation";

/**
 * Backward-compatible entry point for links and bookmarks that still target
 * the historical dashboard URL. Role and authentication checks remain owned
 * by the canonical PNPI dashboard.
 */
export default function DashboardAliasPage() {
  redirect("/pnpi");
}
