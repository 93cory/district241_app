import Link from "next/link";
import { redirect } from "next/navigation";
import { backendRequest, fetchBackendProfile } from "../../../lib/backend";
import { BackupCreateButton } from "./BackupCreateButton";

export const dynamic = "force-dynamic";

interface BackupFile {
  name: string;
  size_bytes: number;
  modified_at: string;
}

interface BackupsResponse {
  backups: BackupFile[];
  dir: string;
  s3_enabled: boolean;
}

function formatSize(b: number): string {
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} Mo`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} Go`;
}

export default async function BackupsPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).includes("admin")) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  let data: BackupsResponse | null = null;
  let error = "";
  try {
    const res = await backendRequest("/admin/backups", { cache: "no-store" });
    if (res.ok) data = (await res.json()) as BackupsResponse;
    else error = `Erreur chargement (${res.status})`;
  } catch {
    error = "Erreur de connexion.";
  }

  return (
    <section className="section">
      <div className="chart-card">
        <div className="pnpi-page-head">
          <div>
            <Link href="/admin" className="pnpi-back-link">
              &larr; Administration
            </Link>
            <h2>Sauvegardes base de donnees</h2>
            <p className="pnpi-page-sub">
              Gestion des sauvegardes automatiques et manuelles. Destination :{" "}
              <strong>{data?.s3_enabled ? "S3/MinIO + local" : "local"}</strong> &middot; repertoire{" "}
              <span className="pnpi-mono">{data?.dir ?? "—"}</span>
            </p>
          </div>
          <div className="pnpi-page-actions">
            <BackupCreateButton />
          </div>
        </div>

        {error && (
          <div className="pnpi-form-alert pnpi-form-alert--error" role="alert">
            {error}
          </div>
        )}

        {!data?.backups?.length ? (
          <div className="pnpi-empty">
            <div className="pnpi-empty-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14a9 3 0 0 0 18 0V5" />
                <path d="M3 12a9 3 0 0 0 18 0" />
              </svg>
            </div>
            <div>
              Aucune sauvegarde a ce jour. Cliquez sur &laquo; Creer une sauvegarde &raquo;.
            </div>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="annex-table">
              <thead>
                <tr>
                  <th>Fichier</th>
                  <th className="num">Taille</th>
                  <th>Date de creation</th>
                </tr>
              </thead>
              <tbody>
                {data.backups.map((b) => (
                  <tr key={b.name}>
                    <td>
                      <span className="pnpi-mono">{b.name}</span>
                    </td>
                    <td className="num">{formatSize(b.size_bytes)}</td>
                    <td>{new Date(b.modified_at).toLocaleString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
