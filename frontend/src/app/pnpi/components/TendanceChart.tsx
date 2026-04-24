"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

import type { MensuelStats } from "../../../lib/api";

const MOIS_FR: Record<string, string> = {
  "01": "Jan",
  "02": "Fev",
  "03": "Mar",
  "04": "Avr",
  "05": "Mai",
  "06": "Jun",
  "07": "Jul",
  "08": "Aou",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dec",
};

interface Props {
  tendances: MensuelStats[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "0.75rem 1rem",
        fontSize: "0.85rem",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: "0.4rem", color: "#003F8F" }}>{label}</div>
      {payload.map((p) => (
        <div
          key={p.name}
          style={{ display: "flex", justifyContent: "space-between", gap: "1rem", color: p.color }}
        >
          <span>{p.name}</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

const TendanceChart = ({ tendances }: Props) => {
  const data = tendances.map((t) => {
    const parts = t.mois.split("-");
    const moisCode = parts[1] ?? t.mois;
    return {
      mois: MOIS_FR[moisCode] ?? moisCode,
      Soumis: t.nb_soumis,
      Approuves: t.nb_approuves,
      Rejetes: t.nb_rejetes,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="mois"
          tick={{ fontSize: 12, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: "0.8rem", paddingTop: "0.5rem" }}
          iconType="circle"
          iconSize={8}
        />
        <Line
          type="monotone"
          dataKey="Soumis"
          stroke="#f59e0b"
          strokeWidth={2.5}
          dot={{ r: 4, strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="Approuves"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={{ r: 4, strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="Rejetes"
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="4 2"
          dot={{ r: 3, strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
        <ReferenceLine y={0} stroke="#e5e7eb" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TendanceChart;
