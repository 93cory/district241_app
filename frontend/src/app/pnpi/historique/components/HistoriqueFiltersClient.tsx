"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";

const inputStyle = { padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.8rem", background: "#fff", minWidth: "180px" };

export function HistoriqueFiltersClient({ acteur }: { acteur: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(acteur);

  const apply = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) params.set("acteur", value.trim()); else params.delete("acteur");
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams, value]);

  return (
    <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", alignItems: "center" }}>
      <input
        type="text"
        placeholder="Filtrer par acteur..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
        style={inputStyle}
      />
      <button
        onClick={apply}
        style={{ padding: "0.4rem 0.7rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.78rem", background: "#003F8F", color: "#fff", cursor: "pointer", fontWeight: 600 }}
      >
        Filtrer
      </button>
      {acteur && (
        <button
          onClick={() => { setValue(""); router.push(pathname); }}
          style={{ padding: "0.4rem 0.7rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.78rem", background: "#fef2f2", color: "#b42318", cursor: "pointer", fontWeight: 600 }}
        >
          Reinitialiser
        </button>
      )}
    </div>
  );
}
