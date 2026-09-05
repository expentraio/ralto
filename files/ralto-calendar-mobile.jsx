import { useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, CalendarDays, Check } from "lucide-react";

// ---------------------------------------------------------------------------
// Mock data — same six jobs, same dates, same client colours as the desktop
// Calendar (ralto-desktop-app.jsx), so the two stay conceptually in sync
// even though this file is a standalone mobile screen like its siblings.
// ---------------------------------------------------------------------------

const CALENDAR_JOBS = [
  { id: "riyadh", name: "Riyadh Boxing", client: "Kingdom Sports Group", clientColor: "#006C35", venue: "Kingdom Arena, Riyadh", start: "2026-09-03", end: "2026-09-10", confirmed: 26, required: 35 },
  { id: "wimbledon", name: "Wimbledon Finals Coverage", client: "AELTC Media", clientColor: "#005C30", venue: "All England Club, London", start: "2026-09-12", end: "2026-09-14", confirmed: 8, required: 20 },
  { id: "ufc327", name: "UFC 327 — Las Vegas", client: "TNT Sports", clientColor: "#F4511E", venue: "T-Mobile Arena, Las Vegas", start: "2026-09-14", end: "2026-09-19", confirmed: 31, required: 34 },
  { id: "clfinal", name: "Champions League Final", client: "UEFA Broadcast Services", clientColor: "#1B3A8C", venue: "Allianz Arena, Munich", start: "2026-09-22", end: "2026-09-22", confirmed: 42, required: 42 },
  { id: "monaco", name: "Monaco GP Broadcast", client: "F1 Media", clientColor: "#E10600", venue: "Circuit de Monaco", start: "2026-09-24", end: "2026-09-26", confirmed: 18, required: 18 },
  { id: "marathon", name: "London Marathon", client: "City Sports Media", clientColor: "var(--primary)", venue: "Central London", start: "2026-09-27", end: "2026-09-27", confirmed: 0, required: 15 },
];

const TODAY = new Date(2026, 8, 5); // Sat 5 Sep 2026, matching every other Ralto screen

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function sameDay(a, b) {
  return a.toDateString() === b.toDateString();
}
function toISODate(d) {
  return d.toISOString().slice(0, 10);
}
function jobsOnDate(date) {
  const iso = toISODate(date);
  return CALENDAR_JOBS.filter((j) => j.start <= iso && iso <= j.end);
}
function getMonthWeeks(refDate) {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const gridStart = startOfWeek(firstOfMonth);
  const gridEnd = startOfWeek(lastOfMonth);
  const weeks = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_LABELS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// ---------------------------------------------------------------------------
// Job detail (pushed screen, matches the push-navigation pattern already
// used in ralto-jobs-mobile.jsx / ralto-crew-mobile.jsx)
// ---------------------------------------------------------------------------

function JobDetailScreen({ job, onBack }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 20px 6px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, marginLeft: -4, color: "var(--ink)" }}>
          <ChevronLeft size={22} />
        </button>
      </div>
      <div style={{ padding: "4px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: job.clientColor, flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)" }}>{job.client}</span>
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, color: "var(--ink)", lineHeight: 1.2, marginTop: 2 }}>
          {job.name}
        </div>
      </div>
      <div style={{ height: 1, background: "var(--line)", margin: "0 20px" }} />
      <div style={{ display: "flex", gap: 14, padding: "16px 20px" }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--tint)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <CalendarDays size={16} color="var(--primary)" />
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-muted)" }}>Dates</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--ink)", marginTop: 2 }}>
            {job.start === job.end ? job.start : `${job.start} – ${job.end}`}
          </div>
        </div>
      </div>
      <div style={{ height: 1, background: "var(--line)", margin: "0 20px" }} />
      <div style={{ display: "flex", gap: 14, padding: "16px 20px" }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--tint)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <MapPin size={16} color="var(--primary)" />
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-muted)" }}>Venue</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--ink)", marginTop: 2 }}>{job.venue}</div>
        </div>
      </div>
      <div style={{ margin: "24px 20px 0", display: "flex", alignItems: "center", gap: 8 }}>
        <Check size={15} color={job.confirmed === job.required ? "var(--success)" : "var(--attention)"} />
        <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: job.confirmed === job.required ? "var(--success)" : "var(--attention)" }}>
          {job.confirmed}/{job.required} confirmed
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar grid + agenda
// ---------------------------------------------------------------------------

function DayCell({ date, inMonth, isToday, isSelected, jobs, onSelect }) {
  return (
    <button
      onClick={() => onSelect(date)}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "6px 0 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        opacity: inMonth ? 1 : 0.35,
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-body)",
          fontSize: 13,
          fontWeight: isToday || isSelected ? 700 : 500,
          color: isSelected ? "#fff" : isToday ? "var(--primary)" : "var(--ink)",
          background: isSelected ? "var(--primary)" : "transparent",
        }}
      >
        {date.getDate()}
      </span>
      <div style={{ display: "flex", gap: 2, height: 5 }}>
        {jobs.slice(0, 3).map((j) => (
          <span key={j.id} style={{ width: 5, height: 5, borderRadius: "50%", background: j.clientColor }} />
        ))}
      </div>
    </button>
  );
}

function AgendaCard({ job, onOpen }) {
  return (
    <button
      onClick={() => onOpen(job)}
      style={{
        position: "relative",
        width: "100%",
        textAlign: "left",
        background: "#fff",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: "12px 14px 12px 18px",
        marginBottom: 10,
        cursor: "pointer",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: job.clientColor }} />
      <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{job.name}</div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>{job.client}</div>
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontWeight: 600,
          fontSize: 12,
          color: job.confirmed === job.required ? "var(--success)" : "var(--attention)",
          marginTop: 6,
        }}
      >
        {job.confirmed}/{job.required} confirmed
      </div>
    </button>
  );
}

function CalendarHome({ onOpenJob }) {
  const [mode, setMode] = useState("month");
  const [refDate, setRefDate] = useState(TODAY);
  const [selectedDate, setSelectedDate] = useState(TODAY);

  const weeks = mode === "month" ? getMonthWeeks(refDate) : [Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(refDate), i))];

  const goPrev = () => setRefDate((d) => (mode === "month" ? new Date(d.getFullYear(), d.getMonth() - 1, 1) : addDays(d, -7)));
  const goNext = () => setRefDate((d) => (mode === "month" ? new Date(d.getFullYear(), d.getMonth() + 1, 1) : addDays(d, 7)));

  const headerLabel =
    mode === "month"
      ? `${MONTH_LABELS[refDate.getMonth()]} ${refDate.getFullYear()}`
      : (() => {
          const s = startOfWeek(refDate);
          const e = addDays(s, 6);
          return `${s.getDate()} – ${e.getDate()} ${MONTH_LABELS[e.getMonth()]}`;
        })();

  const agenda = jobsOnDate(selectedDate);

  return (
    <div>
      <div style={{ padding: "20px 20px 4px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 24, color: "var(--ink)" }}>Calendar</div>
      </div>

      <div style={{ display: "flex", padding: "14px 20px 4px" }}>
        <div style={{ display: "flex", background: "var(--tint)", borderRadius: 10, padding: 3 }}>
          {["month", "week"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                background: mode === m ? "#fff" : "none",
                border: "none",
                borderRadius: 8,
                padding: "6px 14px",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: 12.5,
                color: mode === m ? "var(--primary)" : "var(--ink-muted)",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 6px" }}>
        <button onClick={goPrev} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--ink-muted)" }}>
          <ChevronLeft size={19} />
        </button>
        <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 15, color: "var(--ink)" }}>{headerLabel}</div>
        <button onClick={goNext} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--ink-muted)" }}>
          <ChevronRight size={19} />
        </button>
      </div>

      <div style={{ padding: "8px 16px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {WEEKDAY_LETTERS.map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 11, color: "var(--ink-muted)" }}>
              {d}
            </div>
          ))}
        </div>
        {weeks.map((weekDates, wi) => (
          <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {weekDates.map((date) => (
              <DayCell
                key={date.toISOString()}
                date={date}
                inMonth={mode === "week" || date.getMonth() === refDate.getMonth()}
                isToday={sameDay(date, TODAY)}
                isSelected={sameDay(date, selectedDate)}
                jobs={jobsOnDate(date)}
                onSelect={setSelectedDate}
              />
            ))}
          </div>
        ))}
      </div>

      <div style={{ margin: "20px 20px 10px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, color: "var(--ink-muted)" }}>
        {selectedDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
      </div>
      <div style={{ padding: "0 20px" }}>
        {agenda.length > 0 ? (
          agenda.map((job) => <AgendaCard key={job.id} job={job} onOpen={onOpenJob} />)
        ) : (
          <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)", padding: "8px 0 20px" }}>
            No jobs scheduled.
          </div>
        )}
      </div>
      <div style={{ height: 30 }} />
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function RaltoCalendarApp() {
  const [screen, setScreen] = useState({ name: "calendar" });

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "24px 0",
        background: "#E7E5E1",
        minHeight: "100%",
        fontFamily: "var(--font-body)",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        :root {
          --font-display: 'Inter', sans-serif;
          --font-body: 'Inter', sans-serif;
          --ink: #211D2E;
          --ink-muted: #6E6A7C;
          --bg: #FFFFFF;
          --primary: #453E96;
          --tint: #EEEBFA;
          --line: #E7E5E2;
          --success: #3F8F6D;
          --success-bg: #EAF4EF;
          --attention: #C98A2B;
          --attention-bg: #FBF1E1;
          --danger: #B5473C;
          --danger-bg: #F8EBE9;
        }
      `}</style>

      <div
        style={{
          width: 375,
          height: 780,
          background: "var(--bg)",
          borderRadius: 40,
          border: "8px solid #17151F",
          boxShadow: "0 30px 60px rgba(23,21,31,0.35)",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "14px 24px 0",
            fontFamily: "var(--font-body)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--ink)",
          }}
        >
          <span>9:41</span>
          <span>Ralto</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {screen.name === "jobDetail" ? (
            <JobDetailScreen job={screen.job} onBack={() => setScreen({ name: "calendar" })} />
          ) : (
            <CalendarHome onOpenJob={(job) => setScreen({ name: "jobDetail", job })} />
          )}
        </div>
      </div>
    </div>
  );
}
