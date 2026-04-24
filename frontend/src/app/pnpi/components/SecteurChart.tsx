"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

import type { SecteurStats } from "../../../lib/api";

const SECTEUR_LABELS: Record<string, string> = {
  bois: "Bois",
  mines: "Mines",
  agroalimentaire: "Agro",
  btp: "BTP",
  petrole: "Petrole",
  services: "Services",
};

interface Props {
  secteurs: SecteurStats[];
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

const SecteurChart = ({ secteurs }: Props) => {
  const data = secteurs.map((s) => ({
    name: SECTEUR_LABELS[s.secteur] ?? s.secteur,
    Operateurs: s.nb_operateurs,
    "ATIs actifs": s.nb_atis_total,
    Approuves: s.nb_atis_approuves,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="name"
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
        <Bar dataKey="Operateurs" fill="#003F8F" radius={[4, 4, 0, 0]} />
        <Bar dataKey="ATIs actifs" fill="#009440" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Approuves" fill="#FFCD00" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default SecteurChart;
