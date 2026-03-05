"use client";

import { useMemo, useState } from "react";

import { AuditEvent } from "../../lib/api";

interface Props {
  events: AuditEvent[];
}

type Period = "7d" | "30d" | "90d" | "all";

const PERIOD_LABEL: Record<Period, string> = {
  "7d": "7 jours",
  "30d": "30 jours",
  "90d": "90 jours",
  all: "Tout",
};

export const AuditSynthesisCard = ({ events }: Props) => {
  const [period, setPeriod] = useState<Period>("30d");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const {
    filtered,
    last7,
    last30,
    last90,
    topActions,
    topActors,
    trend30Days,
    trendMax,
    selectedDayEvents,
  } = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(now.getDate() - 90);

    const in7 = events.filter((entry) => new Date(entry.timestamp) >= sevenDaysAgo);
    const in30 = events.filter((entry) => new Date(entry.timestamp) >= thirtyDaysAgo);
    const in90 = events.filter((entry) => new Date(entry.timestamp) >= ninetyDaysAgo);

    const periodEvents =
      period === "7d" ? in7 : period === "30d" ? in30 : period === "90d" ? in90 : events;

    const actionCounts = new Map<string, number>();
    const actorCounts = new Map<string, number>();
    for (const entry of periodEvents) {
      actionCounts.set(entry.action, (actionCounts.get(entry.action) ?? 0) + 1);
      actorCounts.set(entry.actor, (actorCounts.get(entry.actor) ?? 0) + 1);
    }

    const trendMap = new Map<string, number>();
    for (let i = 29; i >= 0; i -= 1) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      trendMap.set(key, 0);
    }
    for (const entry of events) {
      const key = new Date(entry.timestamp).toISOString().slice(0, 10);
      if (trendMap.has(key)) {
        trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
      }
    }
    const trend = [...trendMap.entries()].map(([day, count]) => ({ day, count }));
    const maxCount = trend.reduce((max, item) => (item.count > max ? item.count : max), 0);
    const selectedEvents = selectedDay
      ? periodEvents
          .filter((entry) => new Date(entry.timestamp).toISOString().slice(0, 10) === selectedDay)
          .sort((left, right) => (left.timestamp < right.timestamp ? 1 : -1))
      : [];

    return {
      filtered: periodEvents.length,
      last7: in7.length,
      last30: in30.length,
      last90: in90.length,
      topActions: [...actionCounts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 6),
      topActors: [...actorCounts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 6),
      trend30Days: trend,
      trendMax: maxCount,
      selectedDayEvents: selectedEvents,
    };
  }, [events, period, selectedDay]);

  return (
    <div className="table-card reveal" style={{ marginTop: "1rem" }}>
      <h3 style={{ marginTop: 0 }}>Synthese des audits</h3>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.8rem" }}>
        {(Object.keys(PERIOD_LABEL) as Period[]).map((item) => (
          <button
            key={item}
            type="button"
            className="export-link"
            onClick={() => setPeriod(item)}
            style={period === item ? { borderColor: "#0f2f64", color: "#0f2f64", fontWeight: 700 } : undefined}
          >
            {PERIOD_LABEL[item]}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "0.8rem" }}>
        <span>
          Total: <strong>{events.length}</strong>
        </span>
        <span>
          7 jours: <strong>{last7}</strong>
        </span>
        <span>
          30 jours: <strong>{last30}</strong>
        </span>
        <span>
          90 jours: <strong>{last90}</strong>
        </span>
        <span>
          Filtre actif ({PERIOD_LABEL[period]}): <strong>{filtered}</strong>
        </span>
        {selectedDay && (
          <span>
            Jour selectionne: <strong>{selectedDay}</strong>
          </span>
        )}
      </div>

      <div style={{ display: "grid", gap: "0.8rem", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <div>
          <p style={{ marginTop: 0, marginBottom: "0.4rem", fontWeight: 700 }}>
            Evolution journaliere (30 jours)
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(30, minmax(4px, 1fr))",
              alignItems: "end",
              gap: "3px",
              height: 110,
              border: "1px solid #edf1f7",
              borderRadius: 8,
              padding: "8px 6px",
            }}
          >
            {trend30Days.map((item, index) => {
              const height = trendMax === 0 ? 2 : Math.max(2, Math.round((item.count / trendMax) * 92));
              const isWeekMark = index % 7 === 0;
              const isSelected = selectedDay === item.day;
              return (
                <button
                  key={item.day}
                  type="button"
                  onClick={() => setSelectedDay((current) => (current === item.day ? null : item.day))}
                  title={`${item.day}: ${item.count}`}
                  style={{
                    height,
                    borderRadius: 3,
                    border: isSelected ? "1px solid #7a1f1f" : "none",
                    background: isSelected ? "#d14343" : isWeekMark ? "#0f2f64" : "#6b8ec1",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              );
            })}
          </div>
          {selectedDay && (
            <button
              type="button"
              className="export-link"
              onClick={() => setSelectedDay(null)}
              style={{ marginTop: "0.5rem" }}
            >
              Effacer le filtre jour
            </button>
          )}
        </div>
        <div>
          <p style={{ marginTop: 0, marginBottom: "0.4rem", fontWeight: 700 }}>Actions les plus frequentes</p>
          {topActions.length === 0 && <p style={{ margin: 0, color: "#6c7482" }}>Aucun evenement.</p>}
          {topActions.map(([action, count]) => (
            <div
              key={action}
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid #edf1f7",
                padding: "0.35rem 0",
              }}
            >
              <span>{action}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>

        <div>
          <p style={{ marginTop: 0, marginBottom: "0.4rem", fontWeight: 700 }}>Top acteurs</p>
          {topActors.length === 0 && <p style={{ margin: 0, color: "#6c7482" }}>Aucun evenement.</p>}
          {topActors.map(([actor, count]) => (
            <div
              key={actor}
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid #edf1f7",
                padding: "0.35rem 0",
              }}
            >
              <span>{actor}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </div>

      {selectedDay && (
        <div style={{ marginTop: "0.9rem" }}>
          <p style={{ marginTop: 0, marginBottom: "0.45rem", fontWeight: 700 }}>
            Evenements du {selectedDay} ({selectedDayEvents.length})
          </p>
          {selectedDayEvents.length === 0 ? (
            <p style={{ margin: 0, color: "#6c7482" }}>Aucun evenement pour ce jour et ce filtre periode.</p>
          ) : (
            <div className="table-scroll">
              <table className="annex-table">
                <thead>
                  <tr>
                    <th>Heure</th>
                    <th>Acteur</th>
                    <th>Action</th>
                    <th>Cible</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDayEvents.slice(0, 20).map((entry) => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.timestamp).toLocaleTimeString("fr-FR")}</td>
                      <td>{entry.actor}</td>
                      <td>{entry.action}</td>
                      <td>{entry.target ?? "Non renseigne"}</td>
                      <td>{entry.details || "Non renseigne"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
