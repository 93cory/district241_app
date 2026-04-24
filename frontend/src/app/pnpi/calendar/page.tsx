"use client";

import { useState, useEffect } from "react";

interface CalendarEvent {
  id: string;
  type: string;
  title: string;
  date: string;
  color: string;
  link: string;
}

const MONTHS_FR = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre",
];

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;

    fetch(`/api/calendar/events?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((data) => setEvents(data.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [year, month]);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else setMonth(month + 1);
  };

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Monday=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.date.startsWith(dateStr));
  };

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>Calendrier PNPI</h1>

      {/* Navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <button
          onClick={prevMonth}
          style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}
        >
          &laquo;
        </button>
        <span style={{ fontSize: 18, fontWeight: 700 }}>
          {MONTHS_FR[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}
        >
          &raquo;
        </button>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 1,
          background: "var(--line, #dce4ef)",
          borderRadius: 14,
          overflow: "hidden",
          opacity: loading ? 0.5 : 1,
          transition: "opacity 200ms",
        }}
      >
        {DAYS_FR.map((d) => (
          <div
            key={d}
            style={{
              padding: "8px 4px",
              textAlign: "center",
              fontSize: 12,
              fontWeight: 700,
              background: "var(--bg-base, #f4f8fb)",
              color: "var(--text-soft, #526175)",
            }}
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const dayEvents = day ? getEventsForDay(day) : [];
          return (
            <div
              key={i}
              style={{
                minHeight: 80,
                padding: 4,
                background: "var(--bg-layer, #fff)",
                border: isToday(day || 0) ? "2px solid #006233" : "none",
                borderRadius: isToday(day || 0) ? 8 : 0,
              }}
            >
              {day && (
                <>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: isToday(day) ? 800 : 500,
                      color: isToday(day) ? "#006233" : "var(--text-main, #0c2a4a)",
                      marginBottom: 2,
                    }}
                  >
                    {day}
                  </div>
                  {dayEvents.slice(0, 3).map((ev) => (
                    <a
                      key={ev.id}
                      href={ev.link}
                      title={ev.title}
                      style={{
                        display: "block",
                        padding: "1px 4px",
                        marginBottom: 1,
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        background: `${ev.color}18`,
                        color: ev.color,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        textDecoration: "none",
                      }}
                    >
                      {ev.title}
                    </a>
                  ))}
                  {dayEvents.length > 3 && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-soft, #526175)",
                        textAlign: "center",
                      }}
                    >
                      +{dayEvents.length - 3}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
