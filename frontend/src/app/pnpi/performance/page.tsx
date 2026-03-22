import { backendRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

interface InstructorPerf {
  username: string;
  assigned: number;
  decided: number;
  approved: number;
  rejected: number;
  overdue: number;
  avg_days: number;
  approval_rate: number;
}

export default async function PerformancePage() {
  let instructors: InstructorPerf[] = [];
  try {
    const res = await backendRequest("/pnpi/dashboard/instructor-performance");
    if (res.ok) {
      const data = await res.json();
      instructors = data.instructors || [];
    }
  } catch {}

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Performance des instructeurs</h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 13, margin: "0 0 20px" }}>
        Suivi des delais de traitement et taux de decision par instructeur.
      </p>

      <div className="chart-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-scroll">
          <table className="annex-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Instructeur</th>
                <th style={{ textAlign: "center" }}>Assignes</th>
                <th style={{ textAlign: "center" }}>Decides</th>
                <th style={{ textAlign: "center" }}>Approuves</th>
                <th style={{ textAlign: "center" }}>Rejetes</th>
                <th style={{ textAlign: "center" }}>En retard</th>
                <th style={{ textAlign: "center" }}>Delai moy.</th>
                <th style={{ textAlign: "center" }}>Taux appro.</th>
              </tr>
            </thead>
            <tbody>
              {instructors.map((inst) => (
                <tr key={inst.username}>
                  <td style={{ fontWeight: 700 }}>{inst.username}</td>
                  <td style={{ textAlign: "center" }}>{inst.assigned}</td>
                  <td style={{ textAlign: "center" }}>{inst.decided}</td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{ color: "#006233", fontWeight: 600 }}>{inst.approved}</span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{ color: "#b42318", fontWeight: 600 }}>{inst.rejected}</span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {inst.overdue > 0 ? (
                      <span style={{
                        padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: "#fef2f2", color: "#b42318",
                      }}>
                        {inst.overdue}
                      </span>
                    ) : (
                      <span style={{ color: "#006233", fontWeight: 600 }}>0</span>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{
                      fontWeight: 700,
                      color: inst.avg_days > 30 ? "#d97706" : inst.avg_days > 45 ? "#b42318" : "#006233",
                    }}>
                      {inst.avg_days}j
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <div style={{ width: 50, height: 6, borderRadius: 3, background: "#e5e7eb" }}>
                        <div style={{
                          height: "100%", borderRadius: 3,
                          width: `${inst.approval_rate}%`,
                          background: inst.approval_rate >= 70 ? "#006233" : inst.approval_rate >= 50 ? "#d97706" : "#b42318",
                        }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{inst.approval_rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {instructors.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--text-soft, #526175)" }}>Aucune donnee</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
