"use client";

import { useState, useEffect, ReactNode } from "react";

interface WidgetConfig {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
}

const STORAGE_KEY = "pnpi_dashboard_config";

interface Props {
  widgetMap: Record<string, ReactNode>;
}

export function DashboardRenderer({ widgetMap }: Props) {
  const [config, setConfig] = useState<WidgetConfig[] | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WidgetConfig[];
        parsed.sort((a, b) => a.order - b.order);
        setConfig(parsed);
      } catch {
        setConfig(null);
      }
    }
  }, []);

  if (!config) {
    // No custom config — render all widgets in default order
    return <>{Object.values(widgetMap)}</>;
  }

  return (
    <>
      {config
        .filter((w) => w.enabled && widgetMap[w.id])
        .map((w) => (
          <div key={w.id}>{widgetMap[w.id]}</div>
        ))}
    </>
  );
}
