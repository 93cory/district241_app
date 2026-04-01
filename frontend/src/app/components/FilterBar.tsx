"use client";

import { useState, useCallback } from "react";

interface FilterOption {
  key: string;
  label: string;
  type: "select" | "text" | "date";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface FilterBarProps {
  filters: FilterOption[];
  onFilterChange: (filters: Record<string, string>) => void;
  onReset?: () => void;
}

export function FilterBar({ filters, onFilterChange, onReset }: FilterBarProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  const handleChange = useCallback(
    (key: string, value: string) => {
      const next = { ...values, [key]: value };
      if (!value) delete next[key];
      setValues(next);
      onFilterChange(next);
    },
    [values, onFilterChange],
  );

  const handleReset = useCallback(() => {
    setValues({});
    onFilterChange({});
    onReset?.();
  }, [onFilterChange, onReset]);

  const hasActiveFilters = Object.keys(values).length > 0;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        alignItems: "center",
        padding: "0.75rem 0",
      }}
    >
      {filters.map((f) => (
        <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
          <label
            htmlFor={`filter-${f.key}`}
            style={{ fontSize: "0.7rem", fontWeight: 500, color: "var(--text-secondary, #6b7280)" }}
          >
            {f.label}
          </label>
          {f.type === "select" ? (
            <select
              id={`filter-${f.key}`}
              value={values[f.key] || ""}
              onChange={(e) => handleChange(f.key, e.target.value)}
              style={{
                padding: "0.35rem 0.5rem",
                borderRadius: "6px",
                border: "1px solid var(--border-color, #e0e0e0)",
                fontSize: "0.8rem",
                background: "var(--card-bg, #fff)",
                minWidth: "120px",
              }}
            >
              <option value="">{f.placeholder || "Tous"}</option>
              {f.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`filter-${f.key}`}
              type={f.type}
              value={values[f.key] || ""}
              onChange={(e) => handleChange(f.key, e.target.value)}
              placeholder={f.placeholder}
              style={{
                padding: "0.35rem 0.5rem",
                borderRadius: "6px",
                border: "1px solid var(--border-color, #e0e0e0)",
                fontSize: "0.8rem",
                minWidth: "120px",
              }}
            />
          )}
        </div>
      ))}

      {hasActiveFilters && (
        <button
          onClick={handleReset}
          style={{
            alignSelf: "flex-end",
            padding: "0.35rem 0.75rem",
            borderRadius: "6px",
            border: "1px solid var(--border-color, #e0e0e0)",
            background: "transparent",
            fontSize: "0.8rem",
            cursor: "pointer",
            color: "var(--text-secondary, #6b7280)",
          }}
        >
          Reinitialiser
        </button>
      )}
    </div>
  );
}
