import { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard,
  Calendar,
  Briefcase,
  CalendarRange,
  Users,
  Bell,
  RefreshCw,
  UserPlus,
  Check,
  ChevronRight,
  ChevronLeft,
  Search,
  Settings,
  MapPin,
  Phone,
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Minus,
  Star,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Combined desktop app — merges ralto-today-desktop.jsx, ralto-jobs-desktop.jsx,
// ralto-planner-desktop.jsx and ralto-crew-desktop.jsx into one shell with a
// single Sidebar and real navigation, instead of four standalone files.
// Design tokens, job data, and colours are unchanged from those four files.
// Adds a new Calendar screen (month/week grid of job blocks across time).
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { key: "today", label: "Today", icon: LayoutDashboard },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "planner", label: "Planner", icon: CalendarRange },
  { key: "crew", label: "Crew", icon: Users },
];

// ---------------------------------------------------------------------------
// Shared Sidebar
// ---------------------------------------------------------------------------

function Sidebar({ active, onSelect, onOpenSuite }) {
  return (
    <div
      style={{
        width: 232,
        flexShrink: 0,
        background: "#fff",
        borderRight: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
      }}
    >
      <button
        onClick={onOpenSuite}
        title="Open Simplified Suite"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 8px",
          marginBottom: 4,
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ width: 20, height: 4, borderRadius: 2, background: "var(--primary)" }} />
          <div style={{ width: 15, height: 4, borderRadius: 2, background: "var(--primary)" }} />
          <div style={{ width: 10, height: 4, borderRadius: 2, background: "var(--primary)" }} />
        </div>
        <span style={{ fontFamily: "var(--font)", fontWeight: 700, fontSize: 16, color: "var(--ink)", letterSpacing: 0.2 }}>
          RALTO
        </span>
      </button>
      <div style={{ fontFamily: "var(--font)", fontSize: 12, color: "var(--ink-muted)", padding: "4px 8px 24px", lineHeight: 1.4 }}>
        Crewing, simplified.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 8,
                border: "none",
                background: isActive ? "var(--primary-tint)" : "transparent",
                color: isActive ? "var(--primary)" : "var(--ink-muted)",
                fontFamily: "var(--font)",
                fontWeight: isActive ? 600 : 500,
                fontSize: 13.5,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 10px",
          borderRadius: 8,
          color: "var(--ink-muted)",
          fontFamily: "var(--font)",
          fontWeight: 500,
          fontSize: 13.5,
        }}
      >
        <Settings size={16} />
        Settings
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Today
// ---------------------------------------------------------------------------

const JOBS_LIVE = 4;
const TOTAL_CREW = 67;

const INITIAL_ATTENTION = [
  {
    id: "offer-1",
    tone: "attention",
    icon: Bell,
    title: "Offer unanswered",
    subtitle: "Sam Ortiz · EVS · UFC 327 · sent 3h ago",
    actionLabel: "Mark confirmed",
    actionIcon: Check,
    fillsShortfall: 1,
  },
  {
    id: "ack-1",
    tone: "attention",
    icon: RefreshCw,
    title: "Call-time change unacknowledged",
    subtitle: "Champions League Final · 1 of 12 crew yet to confirm they've seen it",
    actionLabel: "Mark acknowledged",
    actionIcon: Check,
    fillsShortfall: 0,
  },
  {
    id: "missing-1",
    tone: "danger",
    icon: UserPlus,
    title: "1 position unfilled",
    subtitle: "Riyadh Boxing · EVS · call in 2 days",
    actionLabel: "Find crew",
    actionIcon: ChevronRight,
    fillsShortfall: 1,
  },
];

const TODAYS_JOBS = [
  { name: "UFC 327 — Las Vegas", client: "TNT Sports", clientColor: "#F4511E", confirmed: 31, required: 34, status: "attention" },
  { name: "Champions League Final", client: "UEFA Broadcast Services", clientColor: "#1B3A8C", confirmed: 42, required: 42, status: "confirmed" },
  { name: "Riyadh Boxing", client: "Kingdom Sports Group", clientColor: "#006C35", confirmed: 26, required: 35, status: "attention" },
  { name: "Monaco GP Broadcast", client: "F1 Media", clientColor: "#E10600", confirmed: 18, required: 18, status: "confirmed" },
];

const toneColor = {
  attention: { fg: "var(--attention)", bg: "var(--attention-bg)" },
  danger: { fg: "var(--danger)", bg: "var(--danger-bg)" },
};

const jobStatus = {
  confirmed: { label: "Confirmed", color: "var(--success)", bg: "var(--success-bg)" },
  attention: { label: "Attention", color: "var(--attention)", bg: "var(--attention-bg)" },
};

function StatCard({ value, label, tone }) {
  return (
    <div style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 12, background: "#fff", padding: "18px 20px" }}>
      <div style={{ fontFamily: "var(--font)", fontWeight: 700, fontSize: 30, fontVariantNumeric: "tabular-nums", color: tone || "var(--ink)", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: "var(--font)", fontSize: 13, color: "var(--ink-muted)", marginTop: 6 }}>{label}</div>
    </div>
  );
}

function AttentionCard({ item, onResolve }) {
  const Icon = item.icon;
  const ActionIcon = item.actionIcon;
  const tone = toneColor[item.tone];
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16, background: "#fff", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 34, height: 34, borderRadius: 999, background: tone.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} color={tone.fg} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{item.title}</div>
        <div style={{ fontFamily: "var(--font)", fontSize: 13, color: "var(--ink-muted)", marginTop: 2 }}>{item.subtitle}</div>
      </div>
      <button
        onClick={() => onResolve(item.id, item.fillsShortfall)}
        style={{ flexShrink: 0, background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 12px", fontFamily: "var(--font)", fontWeight: 600, fontSize: 12.5, color: "var(--ink)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
      >
        {item.actionLabel} <ActionIcon size={12} />
      </button>
    </div>
  );
}

function TodayContent() {
  const [attention, setAttention] = useState(INITIAL_ATTENTION);
  const shortfall = attention.reduce((s, a) => s + a.fillsShortfall, 0);
  const confirmed = TOTAL_CREW - shortfall;
  const resolve = (id) => setAttention((prev) => prev.filter((a) => a.id !== id));

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 32px 0" }}>
        <div>
          <div style={{ fontFamily: "var(--font)", fontSize: 13.5, color: "var(--ink-muted)" }}>Saturday, 5 September</div>
          <div style={{ fontFamily: "var(--font)", fontWeight: 700, fontSize: 26, color: "var(--ink)" }}>Today</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--line)", borderRadius: 10, padding: "8px 14px", background: "#fff", width: 260 }}>
          <Search size={15} color="var(--ink-muted)" />
          <span style={{ fontFamily: "var(--font)", fontSize: 13.5, color: "var(--ink-muted)" }}>Search jobs or crew</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, padding: "24px 32px 0" }}>
        <StatCard value={JOBS_LIVE} label="Jobs live" />
        <StatCard value={TOTAL_CREW} label="Crew working" />
        <StatCard value={confirmed} label="Confirmed & ready" tone={confirmed === TOTAL_CREW ? "var(--success)" : "var(--attention)"} />
      </div>

      <div style={{ display: "flex", gap: 20, padding: "28px 32px 32px", alignItems: "flex-start" }}>
        <div style={{ flex: 1.4 }}>
          <div style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 14, color: "var(--ink-muted)", marginBottom: 12 }}>Needs attention</div>
          {attention.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {attention.map((item) => (
                <AttentionCard key={item.id} item={item} onResolve={resolve} />
              ))}
            </div>
          ) : (
            <div style={{ border: "1px solid var(--line)", borderRadius: 12, background: "#fff", padding: "26px 20px", textAlign: "center" }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: "var(--success-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                <Check size={17} color="var(--success)" />
              </div>
              <div style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>All crew covered</div>
              <div style={{ fontFamily: "var(--font)", fontSize: 13, color: "var(--ink-muted)", marginTop: 2 }}>No action required.</div>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 14, color: "var(--ink-muted)", marginBottom: 12 }}>Today's jobs</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {TODAYS_JOBS.map((job) => {
              const s = jobStatus[job.status];
              return (
                <div key={job.name} style={{ position: "relative", border: "1px solid var(--line)", borderRadius: 12, background: "#fff", padding: "12px 14px 12px 18px", overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: job.clientColor }} />
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 13.5, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {job.name}
                      </div>
                      <div style={{ fontFamily: "var(--font)", fontSize: 12, color: "var(--ink-muted)", marginTop: 1 }}>{job.client}</div>
                    </div>
                    <div style={{ flexShrink: 0, fontFamily: "var(--font)", fontWeight: 600, fontSize: 12.5, fontVariantNumeric: "tabular-nums", color: s.color }}>
                      {job.confirmed}/{job.required}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar — month/week grid of job blocks across time.
//
// A note on colour here: everywhere else in Ralto, client colour is a thin
// left-edge stripe kept deliberately separate from status colour (see the
// schema addendum). In a calendar grid that rule doesn't need to carry over
// the same way — there's no status badge sitting next to a job block in this
// view, so a solid-coloured bar (the standard calendar-app convention) is
// legible and unambiguous. Status still isn't colour-only: each bar shows
// the confirmed/required fraction as text, not just a colour.
//
// Dates below are shifted into a single populated month (September 2026,
// matching "today" elsewhere in the app) purely so the calendar demo has
// enough overlapping jobs to be worth looking at — not meant to imply the
// real jobs actually happen then.
// ---------------------------------------------------------------------------

const CALENDAR_JOBS = [
  { id: "riyadh", name: "Riyadh Boxing", client: "Kingdom Sports Group", clientColor: "#006C35", start: "2026-09-03", end: "2026-09-10", confirmed: 26, required: 35 },
  { id: "wimbledon", name: "Wimbledon Finals Coverage", client: "AELTC Media", clientColor: "#005C30", start: "2026-09-12", end: "2026-09-14", confirmed: 8, required: 20 },
  { id: "ufc327", name: "UFC 327 — Las Vegas", client: "TNT Sports", clientColor: "#F4511E", start: "2026-09-14", end: "2026-09-19", confirmed: 31, required: 34 },
  { id: "clfinal", name: "Champions League Final", client: "UEFA Broadcast Services", clientColor: "#1B3A8C", start: "2026-09-22", end: "2026-09-22", confirmed: 42, required: 42 },
  { id: "monaco", name: "Monaco GP Broadcast", client: "F1 Media", clientColor: "#E10600", start: "2026-09-24", end: "2026-09-26", confirmed: 18, required: 18 },
  { id: "marathon", name: "London Marathon", client: "City Sports Media", clientColor: "var(--primary)", start: "2026-09-27", end: "2026-09-27", confirmed: 0, required: 15 },
];

const DAY_MS = 24 * 60 * 60 * 1000;

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

// Greedy lane-packing: jobs overlapping a week get stacked into the fewest
// rows needed so none visually collide, same idea as Google Calendar's
// multi-day event bars.
function packWeek(weekDates, jobs) {
  const weekStart = weekDates[0];
  const weekEnd = addDays(weekDates[6], 1); // exclusive

  const overlapping = jobs
    .map((job) => {
      const jobStart = new Date(job.start + "T00:00:00");
      const jobEnd = addDays(new Date(job.end + "T00:00:00"), 1); // exclusive
      if (jobEnd <= weekStart || jobStart >= weekEnd) return null;
      const clippedStart = jobStart < weekStart ? weekStart : jobStart;
      const clippedEndExclusive = jobEnd > weekEnd ? weekEnd : jobEnd;
      const startCol = Math.round((clippedStart - weekStart) / DAY_MS);
      const endCol = Math.round((clippedEndExclusive - weekStart) / DAY_MS) - 1;
      return { job, startCol, endCol, jobStart };
    })
    .filter(Boolean)
    .sort((a, b) => a.jobStart - b.jobStart || a.startCol - b.startCol);

  const laneEnds = []; // last occupied column per lane
  const placed = [];
  for (const item of overlapping) {
    let lane = laneEnds.findIndex((end) => end < item.startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endCol);
    } else {
      laneEnds[lane] = item.endCol;
    }
    placed.push({ ...item, lane });
  }
  return { placed, laneCount: laneEnds.length };
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function WeekRow({ weekDates, referenceMonth, tall, onOpenJob }) {
  const { placed, laneCount } = packWeek(weekDates, CALENDAR_JOBS);
  const barHeight = tall ? 30 : 22;
  const today = new Date(2026, 8, 5); // Sat 5 Sep 2026, matching "today" elsewhere

  return (
    <div style={{ borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {weekDates.map((date) => {
          const inMonth = date.getMonth() === referenceMonth;
          const isToday = sameDay(date, today);
          return (
            <div
              key={date.toISOString()}
              style={{
                padding: "8px 10px 4px",
                fontFamily: "var(--font)",
                fontSize: 12.5,
                fontWeight: isToday ? 700 : 500,
                color: isToday ? "var(--primary)" : inMonth ? "var(--ink)" : "var(--ink-muted)",
                opacity: inMonth ? 1 : 0.5,
              }}
            >
              {isToday ? (
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "var(--primary)", color: "#fff" }}>
                  {date.getDate()}
                </span>
              ) : (
                date.getDate()
              )}
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gridAutoRows: barHeight + 4,
          padding: "0 4px 8px",
          minHeight: laneCount === 0 ? 10 : undefined,
        }}
      >
        {placed.map(({ job, startCol, endCol, lane }) => (
          <div
            key={job.id}
            onClick={() => onOpenJob(job.id)}
            title={`${job.name} — ${job.confirmed}/${job.required} confirmed. Click to open in Planner.`}
            style={{
              gridColumn: `${startCol + 1} / ${endCol + 2}`,
              gridRow: lane + 1,
              margin: "2px 4px",
              background: job.clientColor,
              borderRadius: 6,
              padding: "0 8px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              overflow: "hidden",
              cursor: "pointer",
            }}
          >
            <span style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 11.5, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {job.name}
            </span>
            <span style={{ fontFamily: "var(--font)", fontSize: 11, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap", flexShrink: 0, marginLeft: "auto" }}>
              {job.confirmed}/{job.required}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarContent({ onOpenJob }) {
  const [mode, setMode] = useState("month");
  const [refDate, setRefDate] = useState(new Date(2026, 8, 5)); // Sat 5 Sep 2026

  const weeks = mode === "month" ? getMonthWeeks(refDate) : [Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(refDate), i))];

  const goPrev = () => setRefDate((d) => (mode === "month" ? new Date(d.getFullYear(), d.getMonth() - 1, 1) : addDays(d, -7)));
  const goNext = () => setRefDate((d) => (mode === "month" ? new Date(d.getFullYear(), d.getMonth() + 1, 1) : addDays(d, 7)));
  const goToday = () => setRefDate(new Date(2026, 8, 5));

  const headerLabel =
    mode === "month"
      ? `${MONTH_LABELS[refDate.getMonth()]} ${refDate.getFullYear()}`
      : (() => {
          const s = startOfWeek(refDate);
          const e = addDays(s, 6);
          return `${s.getDate()} – ${e.getDate()} ${MONTH_LABELS[e.getMonth()]} ${e.getFullYear()}`;
        })();

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontFamily: "var(--font)", fontWeight: 700, fontSize: 24, color: "var(--ink)" }}>Calendar</div>
        <div style={{ display: "flex", background: "#fff", border: "1px solid var(--line)", borderRadius: 10, padding: 3 }}>
          {["month", "week"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                background: mode === m ? "var(--primary-tint)" : "none",
                color: mode === m ? "var(--primary)" : "var(--ink-muted)",
                border: "none",
                borderRadius: 7,
                padding: "6px 14px",
                fontFamily: "var(--font)",
                fontWeight: 600,
                fontSize: 12.5,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={goPrev} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--line)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ChevronLeft size={15} color="var(--ink-muted)" />
          </button>
          <button onClick={goNext} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--line)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ChevronRight size={15} color="var(--ink-muted)" />
          </button>
          <div style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 15, color: "var(--ink)", marginLeft: 4 }}>{headerLabel}</div>
        </div>
        <button
          onClick={goToday}
          style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 14px", fontFamily: "var(--font)", fontWeight: 600, fontSize: 12.5, color: "var(--ink)", cursor: "pointer" }}
        >
          Today
        </button>
      </div>

      <div style={{ border: "1px solid var(--line)", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} style={{ padding: "8px 10px", fontFamily: "var(--font)", fontWeight: 600, fontSize: 11, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: 0.3 }}>
              {d}
            </div>
          ))}
        </div>
        {weeks.map((weekDates, i) => (
          <WeekRow key={i} weekDates={weekDates} referenceMonth={refDate.getMonth()} tall={mode === "week"} onOpenJob={onOpenJob} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

const INITIAL_JOBS = [
  {
    id: "ufc327", name: "UFC 327 — Las Vegas", client: "TNT Sports", clientColor: "#F4511E",
    dates: "14–19 Nov", venue: "T-Mobile Arena, Las Vegas", contact: "Dana Whitfield · +1 702 555 0148", daysUntilStart: 4,
    roles: [
      { role: "EIC", required: 2, confirmed: 2, offered: 0 },
      { role: "Guarantee", required: 3, confirmed: 3, offered: 0 },
      { role: "EVS", required: 8, confirmed: 6, offered: 0 },
      { role: "Audio", required: 6, confirmed: 6, offered: 0 },
      { role: "Utilities", required: 10, confirmed: 9, offered: 0 },
      { role: "Riggers", required: 5, confirmed: 5, offered: 0 },
    ],
  },
  {
    id: "clfinal", name: "Champions League Final", client: "UEFA Broadcast Services", clientColor: "#1B3A8C",
    dates: "22 May", venue: "Allianz Arena, Munich", contact: "Petra Lindqvist · +49 89 555 0110", daysUntilStart: 260,
    roles: [
      { role: "Camera", required: 10, confirmed: 10, offered: 0 },
      { role: "Audio", required: 8, confirmed: 8, offered: 0 },
      { role: "EVS", required: 12, confirmed: 12, offered: 0 },
      { role: "Utilities", required: 12, confirmed: 12, offered: 0 },
    ],
  },
  {
    id: "riyadh", name: "Riyadh Boxing", client: "Kingdom Sports Group", clientColor: "#006C35",
    dates: "3–10 Dec", venue: "Kingdom Arena, Riyadh", contact: "Yousef Al-Amin · +966 55 555 0199", daysUntilStart: 23,
    roles: [
      { role: "Audio", required: 10, confirmed: 6, offered: 0 },
      { role: "EVS", required: 15, confirmed: 12, offered: 0 },
      { role: "Utilities", required: 10, confirmed: 8, offered: 0 },
    ],
  },
  {
    id: "monaco", name: "Monaco GP Broadcast", client: "F1 Media", clientColor: "#E10600",
    dates: "24–26 May", venue: "Circuit de Monaco", contact: "Elise Rambert · +377 555 0122", daysUntilStart: 262,
    roles: [
      { role: "Camera", required: 8, confirmed: 8, offered: 0 },
      { role: "Audio", required: 4, confirmed: 4, offered: 0 },
      { role: "Utilities", required: 6, confirmed: 6, offered: 0 },
    ],
  },
  {
    id: "wimbledon", name: "Wimbledon Finals Coverage", client: "AELTC Media", clientColor: "#005C30",
    dates: "12–14 Jul", venue: "All England Club, London", contact: "Rowan Ashcroft · +44 20 7946 0011", daysUntilStart: 120,
    roles: [
      { role: "Camera", required: 8, confirmed: 4, offered: 0 },
      { role: "Audio", required: 6, confirmed: 2, offered: 0 },
      { role: "EVS", required: 6, confirmed: 2, offered: 0 },
    ],
  },
  {
    id: "marathon", name: "London Marathon", client: "City Sports Media", clientColor: "var(--primary)",
    dates: "26 Apr", venue: "Central London", contact: "Not yet assigned", daysUntilStart: 170,
    roles: [
      { role: "Camera", required: 6, confirmed: 0, offered: 0 },
      { role: "Audio", required: 4, confirmed: 0, offered: 0 },
      { role: "Utilities", required: 5, confirmed: 0, offered: 0 },
    ],
  },
];

function totals(job) {
  const required = job.roles.reduce((s, r) => s + r.required, 0);
  const confirmed = job.roles.reduce((s, r) => s + r.confirmed, 0);
  const offered = job.roles.reduce((s, r) => s + r.offered, 0);
  return { required, confirmed, offered, unfilled: required - confirmed - offered };
}

function urgency(job) {
  const { unfilled } = totals(job);
  if (unfilled === 0) return { tier: "complete", color: "var(--success)", bg: "var(--success-bg)", Icon: CheckCircle2 };
  if (job.daysUntilStart <= 5) return { tier: "critical", color: "var(--danger)", bg: "var(--danger-bg)", Icon: AlertTriangle };
  if (job.daysUntilStart <= 30) return { tier: "attention", color: "var(--attention)", bg: "var(--attention-bg)", Icon: Clock };
  return { tier: "quiet", color: "var(--ink-muted)", bg: "var(--track)", Icon: Minus };
}

function statusLabel(job) {
  const { confirmed, unfilled } = totals(job);
  const u = urgency(job);
  if (u.tier === "complete") return "Complete";
  if (u.tier === "critical") return `Attention required · ${unfilled} unfilled`;
  if (u.tier === "attention") return `${unfilled} unfilled`;
  return confirmed === 0 ? "Not yet crewed" : `${unfilled} unfilled · plenty of time`;
}

function JobListRow({ job, selected, onOpen }) {
  const u = urgency(job);
  const { required, confirmed } = totals(job);
  const quiet = u.tier === "complete" || u.tier === "quiet";
  const pct = (confirmed / required) * 100;
  const StatusIcon = u.Icon;

  return (
    <button
      onClick={() => onOpen(job.id)}
      style={{ position: "relative", width: "100%", textAlign: "left", background: selected ? "var(--primary-tint)" : "#fff", border: selected ? "1px solid var(--primary-soft)" : "1px solid var(--line)", borderRadius: 12, padding: "12px 14px 12px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: job.clientColor, opacity: quiet ? 0.6 : 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 14, color: quiet ? "var(--ink-muted)" : "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {job.name}
          </span>
          <span style={{ fontFamily: "var(--font)", fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: 12.5, color: u.color, flexShrink: 0 }}>
            {confirmed}/{required}
          </span>
        </div>
        <div style={{ fontFamily: "var(--font)", fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>
          {job.dates} · {job.venue.split(",")[0]}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 999, background: "var(--track)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: u.tier === "quiet" ? "var(--ink-muted)" : u.color, opacity: quiet ? 0.5 : 1 }} />
          </div>
        </div>
      </div>
      <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: u.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <StatusIcon size={12} color={u.color} strokeWidth={2.5} />
      </div>
    </button>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0" }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--primary-surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={14} color="var(--primary)" />
      </div>
      <div>
        <div style={{ fontFamily: "var(--font)", fontSize: 11.5, color: "var(--ink-muted)" }}>{label}</div>
        <div style={{ fontFamily: "var(--font)", fontSize: 13.5, color: "var(--ink)", marginTop: 1 }}>{value}</div>
      </div>
    </div>
  );
}

function JobRoleRow({ role }) {
  const unfilled = role.required - role.confirmed - role.offered;
  const pct = (role.confirmed / role.required) * 100;
  const complete = unfilled <= 0;
  const StatusIcon = complete ? CheckCircle2 : role.offered > 0 ? Clock : AlertTriangle;
  const statusColor = complete ? "var(--success)" : "var(--attention)";
  const statusBg = complete ? "var(--success-bg)" : "var(--attention-bg)";
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>{role.role}</span>
          <span style={{ fontFamily: "var(--font)", fontVariantNumeric: "tabular-nums", fontSize: 12.5, fontWeight: 600, color: unfilled > 0 ? "var(--attention)" : "var(--ink-muted)" }}>
            {role.confirmed}/{role.required}
          </span>
        </div>
        <div style={{ height: 5, borderRadius: 999, background: "var(--track)", overflow: "hidden", marginTop: 7 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: unfilled > 0 ? "var(--attention)" : "var(--success)" }} />
        </div>
      </div>
      <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: statusBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <StatusIcon size={12} color={statusColor} strokeWidth={2.5} />
      </div>
    </div>
  );
}

function JobsContent({ selectedId, onSelect }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return INITIAL_JOBS.filter(
      (j) => j.name.toLowerCase().includes(query.toLowerCase()) || j.client.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  const job = INITIAL_JOBS.find((j) => j.id === selectedId);
  const u = urgency(job);
  const { required, confirmed } = totals(job);

  return (
    <>
      <div style={{ width: 380, flexShrink: 0, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "24px 20px 16px" }}>
          <div style={{ fontFamily: "var(--font)", fontWeight: 700, fontSize: 22, color: "var(--ink)", marginBottom: 14 }}>Jobs</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px", background: "#fff" }}>
            <Search size={15} color="var(--ink-muted)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs or clients"
              style={{ border: "none", outline: "none", background: "none", fontFamily: "var(--font)", fontSize: 13.5, color: "var(--ink)", flex: 1 }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((j) => (
            <JobListRow key={j.id} job={j} selected={j.id === selectedId} onOpen={onSelect} />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "28px 36px" }}>
        <div style={{ fontFamily: "var(--font)", fontSize: 13, color: "var(--ink-muted)" }}>{job.client}</div>
        <div style={{ fontFamily: "var(--font)", fontWeight: 700, fontSize: 24, color: "var(--ink)", marginTop: 2 }}>{job.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
          <span style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 12, padding: "4px 10px", borderRadius: 999, color: u.color, background: u.bg }}>
            {statusLabel(job)}
          </span>
        </div>

        <div style={{ display: "flex", gap: 32, marginTop: 8, borderBottom: "1px solid var(--line)", paddingBottom: 4 }}>
          <InfoRow icon={CalendarDays} label="Dates" value={job.dates} />
          <InfoRow icon={MapPin} label="Venue" value={job.venue} />
          <InfoRow icon={Phone} label="Production contact" value={job.contact} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "24px 0 12px" }}>
          <span style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 14, color: "var(--ink-muted)" }}>Crewing by role</span>
          <span style={{ fontFamily: "var(--font)", fontSize: 12.5, color: "var(--ink-muted)" }}>{confirmed}/{required} total</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {job.roles.map((r) => (
            <JobRoleRow key={r.role} role={r} />
          ))}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

const PLANNER_JOBS = {
  ufc327: {
    id: "ufc327", name: "UFC 327", clientColor: "#F4511E", subtitle: "Las Vegas · 14–19 Nov",
    requirements: [
      { role: "EIC", required: 2, confirmed: 2, offered: 0 },
      { role: "Guarantee", required: 3, confirmed: 3, offered: 0 },
      { role: "EVS", required: 8, confirmed: 5, offered: 1 },
      { role: "Audio", required: 6, confirmed: 6, offered: 0 },
      { role: "Utilities", required: 10, confirmed: 9, offered: 0 },
      { role: "Riggers", required: 5, confirmed: 5, offered: 0 },
    ],
  },
  clfinal: {
    id: "clfinal", name: "Champions League Final", clientColor: "#1B3A8C", subtitle: "Munich · 22 May",
    requirements: [
      { role: "Camera", required: 10, confirmed: 10, offered: 0 },
      { role: "Audio", required: 8, confirmed: 8, offered: 0 },
      { role: "EVS", required: 12, confirmed: 12, offered: 0 },
      { role: "Utilities", required: 12, confirmed: 12, offered: 0 },
    ],
  },
  riyadh: {
    id: "riyadh", name: "Riyadh Boxing", clientColor: "#006C35", subtitle: "Kingdom Arena · 3–10 Dec",
    requirements: [
      { role: "Audio", required: 10, confirmed: 6, offered: 0 },
      { role: "EVS", required: 15, confirmed: 12, offered: 0 },
      { role: "Utilities", required: 10, confirmed: 8, offered: 0 },
    ],
  },
  monaco: {
    id: "monaco", name: "Monaco GP Broadcast", clientColor: "#E10600", subtitle: "Monaco · 24–26 May",
    requirements: [
      { role: "Camera", required: 8, confirmed: 8, offered: 0 },
      { role: "Audio", required: 4, confirmed: 4, offered: 0 },
      { role: "Utilities", required: 6, confirmed: 6, offered: 0 },
    ],
  },
  wimbledon: {
    id: "wimbledon", name: "Wimbledon Finals Coverage", clientColor: "#005C30", subtitle: "London · 12–14 Jul",
    requirements: [
      { role: "Camera", required: 8, confirmed: 4, offered: 0 },
      { role: "Audio", required: 6, confirmed: 2, offered: 0 },
      { role: "EVS", required: 6, confirmed: 2, offered: 0 },
    ],
  },
  marathon: {
    id: "marathon", name: "London Marathon", clientColor: "var(--primary)", subtitle: "London · 26 Apr",
    requirements: [
      { role: "Camera", required: 6, confirmed: 0, offered: 0 },
      { role: "Audio", required: 4, confirmed: 0, offered: 0 },
      { role: "Utilities", required: 5, confirmed: 0, offered: 0 },
    ],
  },
};

const CANDIDATES = {
  EVS: {
    suitable: [
      { name: "Sam Ortiz", base: "Las Vegas", status: "Preferred", rate: "$650/day" },
      { name: "Priya Nandan", base: "Los Angeles", status: "Approved", rate: "$600/day" },
    ],
    possible: [{ name: "Jon Butler", base: "Denver", status: "Approved", note: "Long travel — arrives late on call day" }],
    unavailable: [
      { name: "Elle Fischer", reason: "Marked unavailable these dates" },
      { name: "Rob Cole", reason: "Conflict — booked on Champions League Final" },
    ],
  },
};

function completeness(reqs) {
  const required = reqs.reduce((s, r) => s + r.required, 0);
  const confirmed = reqs.reduce((s, r) => s + r.confirmed, 0);
  return { required, confirmed };
}

function JobChip({ job, active, onClick }) {
  const { required, confirmed } = completeness(job.requirements);
  const complete = confirmed === required;
  return (
    <button
      onClick={onClick}
      style={{ position: "relative", background: active ? "var(--primary-tint)" : "#fff", border: active ? "1px solid var(--primary-soft)" : "1px solid var(--line)", borderRadius: 12, padding: "10px 16px 10px 20px", textAlign: "left", cursor: "pointer", minWidth: 168, overflow: "hidden" }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: job.clientColor }} />
      <div style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>{job.name}</div>
      <div style={{ fontFamily: "var(--font)", fontVariantNumeric: "tabular-nums", fontSize: 12, marginTop: 3, color: complete ? "var(--success)" : "var(--attention)", fontWeight: 600 }}>
        {confirmed}/{required} confirmed
      </div>
    </button>
  );
}

function RequirementRow({ req, active, onOpen }) {
  const unfilled = req.required - req.confirmed - req.offered;
  const pctConfirmed = (req.confirmed / req.required) * 100;
  const pctOffered = (req.offered / req.required) * 100;
  const complete = unfilled <= 0;
  const StatusIcon = complete ? CheckCircle2 : req.offered > 0 ? Clock : AlertTriangle;
  const statusColor = complete ? "var(--success)" : "var(--attention)";
  const statusBg = complete ? "var(--success-bg)" : "var(--attention-bg)";

  return (
    <button
      onClick={() => onOpen(req)}
      style={{ width: "100%", textAlign: "left", background: active ? "var(--primary-tint)" : "#fff", border: active ? "1px solid var(--primary-soft)" : "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>{req.role}</span>
          <span style={{ fontFamily: "var(--font)", fontVariantNumeric: "tabular-nums", fontSize: 12.5, color: unfilled > 0 ? "var(--attention)" : "var(--ink-muted)", fontWeight: 600 }}>
            {req.confirmed}/{req.required}
          </span>
        </div>
        <div style={{ marginTop: 8, height: 6, borderRadius: 999, background: "var(--track)", overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${pctConfirmed}%`, background: "var(--success)" }} />
          <div style={{ width: `${pctOffered}%`, background: "var(--attention)" }} />
        </div>
        {unfilled > 0 && (
          <div style={{ fontFamily: "var(--font)", fontSize: 12, color: "var(--attention)", marginTop: 6 }}>
            {unfilled} unfilled{req.offered > 0 ? ` · ${req.offered} offered` : ""}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: statusBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <StatusIcon size={12} color={statusColor} strokeWidth={2.5} />
      </div>
    </button>
  );
}

function CandidateGroup({ title, tone, children }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: tone }} />
        <span style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 12.5, color: "var(--ink-muted)" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function PlannerContent({ selectedJobId, onSelectJob }) {
  const [jobsState, setJobsState] = useState(PLANNER_JOBS);
  const job = jobsState[selectedJobId];
  const [activeRole, setActiveRole] = useState(job.requirements.find((r) => r.required - r.confirmed - r.offered > 0) || job.requirements[0]);

  // Reset which role is highlighted whenever the selected job changes,
  // whether that's from clicking a chip here or arriving via the Calendar.
  useEffect(() => {
    const j = jobsState[selectedJobId];
    setActiveRole(j.requirements.find((r) => r.required - r.confirmed - r.offered > 0) || j.requirements[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJobId]);

  const pool = CANDIDATES[activeRole?.role] || { suitable: [], possible: [], unavailable: [] };

  const handleOffer = () => {
    setJobsState((prev) => {
      const next = { ...prev };
      next[selectedJobId] = {
        ...next[selectedJobId],
        requirements: next[selectedJobId].requirements.map((r) => (r.role === activeRole.role ? { ...r, offered: r.offered + 1 } : r)),
      };
      return next;
    });
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
      <div style={{ fontFamily: "var(--font)", fontWeight: 700, fontSize: 24, color: "var(--ink)", marginBottom: 16 }}>Planner</div>

      <div style={{ display: "flex", gap: 10, marginBottom: 24, overflowX: "auto" }}>
        {Object.values(jobsState).map((j) => (
          <JobChip key={j.id} job={j} active={j.id === selectedJobId} onClick={() => onSelectJob(j.id)} />
        ))}
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 14, color: "var(--ink-muted)", marginBottom: 12 }}>Roles — {job.name}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {job.requirements.map((r) => (
              <RequirementRow key={r.role} req={r} active={r.role === activeRole.role} onOpen={setActiveRole} />
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 14, color: "var(--ink-muted)", marginBottom: 12 }}>Crew matching — {activeRole?.role}</div>
          <div style={{ border: "1px solid var(--line)", borderRadius: 12, background: "#fff", padding: "16px 18px" }}>
            <CandidateGroup title="AVAILABLE & SUITABLE" tone="var(--success)">
              {pool.suitable.length === 0 && <div style={{ fontFamily: "var(--font)", fontSize: 12.5, color: "var(--ink-muted)" }}>No one in this group right now.</div>}
              {pool.suitable.map((c) => (
                <div key={c.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>{c.name}</span>
                      {c.status === "Preferred" && <Star size={11} color="var(--primary)" fill="var(--primary)" />}
                    </div>
                    <div style={{ fontFamily: "var(--font)", fontSize: 12, color: "var(--ink-muted)", marginTop: 1 }}>{c.base} · {c.rate}</div>
                  </div>
                  <button
                    onClick={handleOffer}
                    style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontFamily: "var(--font)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                  >
                    <Check size={12} /> Offer
                  </button>
                </div>
              ))}
            </CandidateGroup>

            <CandidateGroup title="POSSIBLE" tone="var(--attention)">
              {pool.possible.length === 0 && <div style={{ fontFamily: "var(--font)", fontSize: 12.5, color: "var(--ink-muted)" }}>No one in this group right now.</div>}
              {pool.possible.map((c) => (
                <div key={c.name} style={{ padding: "8px 0" }}>
                  <div style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>{c.name}</div>
                  <div style={{ fontFamily: "var(--font)", fontSize: 12, color: "var(--ink-muted)", marginTop: 1 }}>{c.base} · {c.note}</div>
                </div>
              ))}
            </CandidateGroup>

            <CandidateGroup title="UNAVAILABLE" tone="var(--ink-muted)">
              {pool.unavailable.map((c) => (
                <div key={c.name} style={{ padding: "8px 0", opacity: 0.6 }}>
                  <div style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>{c.name}</div>
                  <div style={{ fontFamily: "var(--font)", fontSize: 12, color: "var(--ink-muted)", marginTop: 1 }}>{c.reason}</div>
                </div>
              ))}
            </CandidateGroup>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Crew (scheduler's people directory)
// ---------------------------------------------------------------------------

const PEOPLE = [
  { name: "Sam Ortiz", role: "EVS Operator", base: "Las Vegas", status: "booked", statusDetail: "UFC 327 · 14–19 Nov", preferred: true },
  { name: "Priya Nandan", role: "EVS Operator", base: "Los Angeles", status: "available", statusDetail: "Free until 20 Nov", preferred: false },
  { name: "Jon Butler", role: "EVS Operator", base: "Denver", status: "available", statusDetail: "Free until 18 Nov", preferred: false },
  { name: "Nadia Slate", role: "Audio", base: "London", status: "booked", statusDetail: "Champions League Final · 22 May", preferred: false },
  { name: "Omar Faris", role: "Audio", base: "Dubai", status: "pending", statusDetail: "Awaiting response · Riyadh Boxing", preferred: false },
  { name: "Kelly Munro", role: "Audio", base: "Miami", status: "unavailable", statusDetail: "Conflict — booked on UFC 327", preferred: false },
  { name: "Marcus Webb", role: "Utilities", base: "Las Vegas", status: "booked", statusDetail: "UFC 327 · 14–19 Nov", preferred: false },
  { name: "Dana Reyes", role: "Utilities", base: "Phoenix", status: "available", statusDetail: "Free until 30 Nov", preferred: false },
  { name: "Ivy Chen", role: "Camera", base: "Munich", status: "booked", statusDetail: "Champions League Final · 22 May", preferred: false },
  { name: "Dee Park", role: "Camera", base: "Berlin", status: "available", statusDetail: "Free until 15 May", preferred: false },
  { name: "Jed Cross", role: "Riggers", base: "Las Vegas", status: "booked", statusDetail: "UFC 327 · 14–19 Nov", preferred: true },
  { name: "Tom Reilly", role: "Riggers", base: "London", status: "unavailable", statusDetail: "Marked unavailable these dates", preferred: false },
];

const CREW_STATUS = {
  booked: { label: "Booked", color: "var(--primary)", bg: "var(--primary-tint)" },
  available: { label: "Available", color: "var(--success)", bg: "var(--success-bg)" },
  pending: { label: "Pending", color: "var(--attention)", bg: "var(--attention-bg)" },
  unavailable: { label: "Unavailable", color: "var(--ink-muted)", bg: "var(--track)" },
};

const CREW_FILTERS = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "booked", label: "Booked" },
  { key: "pending", label: "Pending" },
];

function PersonCard({ person }) {
  const s = CREW_STATUS[person.status];
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, background: "#fff", padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>{person.name}</span>
            {person.preferred && <Star size={12} color="var(--primary)" fill="var(--primary)" />}
          </div>
          <div style={{ fontFamily: "var(--font)", fontSize: 12.5, color: "var(--ink-muted)", marginTop: 2 }}>{person.role}</div>
          <div style={{ fontFamily: "var(--font)", fontSize: 12, color: "var(--ink-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <MapPin size={11} /> {person.base}
          </div>
        </div>
        <span style={{ flexShrink: 0, fontFamily: "var(--font)", fontWeight: 600, fontSize: 11, padding: "4px 9px", borderRadius: 999, color: s.color, background: s.bg }}>
          {s.label}
        </span>
      </div>
      <div style={{ fontFamily: "var(--font)", fontSize: 12, color: "var(--ink-muted)", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
        {person.statusDetail}
      </div>
    </div>
  );
}

function CrewContent() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = PEOPLE.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.role.toLowerCase().includes(query.toLowerCase()));
    if (filter !== "all") list = list.filter((p) => p.status === filter);
    return list;
  }, [query, filter]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontFamily: "var(--font)", fontWeight: 700, fontSize: 24, color: "var(--ink)" }}>Crew</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px", background: "#fff", width: 260 }}>
          <Search size={15} color="var(--ink-muted)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or role"
            style={{ border: "none", outline: "none", background: "none", fontFamily: "var(--font)", fontSize: 13.5, color: "var(--ink)", flex: 1 }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {CREW_FILTERS.map((f) => {
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{ background: isActive ? "var(--primary)" : "#fff", color: isActive ? "#fff" : "var(--ink-muted)", border: isActive ? "none" : "1px solid var(--line)", borderRadius: 999, padding: "7px 16px", fontFamily: "var(--font)", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {filtered.map((p) => (
          <PersonCard key={p.name} person={p} />
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 0", fontFamily: "var(--font)", fontSize: 13.5, color: "var(--ink-muted)" }}>
            No one matches.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suite — the "Simplified Suite" core landing view. Clicking the mark in
// any product's sidebar comes here, per the locked visual identity doc's
// own dark-shell mockup (page 10): a neutral, product-agnostic home showing
// what core actually owns, with a way to jump into any product.
//
// This is a destination, not a switcher menu — leaving Ralto's own chrome
// entirely (light, indigo-accented) for the shared dark shell, which is the
// deliberate visual signal that you've left product-land and are now in the
// neutral parent layer.
// ---------------------------------------------------------------------------

const CORE_CAPABILITIES = [
  "Organisation",
  "Users & permissions",
  "Clients",
  "Projects / Jobs",
  "Locations",
  "Shared identifiers",
  "Integrations",
];

const SUITE_PRODUCTS = [
  { key: "ralto", name: "RALTO", tagline: "Crewing, simplified.", color: "#453E96", available: true },
  { key: "equiptra", name: "EQUIPTRA", tagline: "Equipment management, simplified.", color: "#4F7693", available: false },
  { key: "expentra", name: "EXPENTRA", tagline: "Business expenses, simplified.", color: "#4BA38B", available: false },
];

function SuiteMark({ color = "#fff" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ width: 22, height: 4, borderRadius: 2, background: color }} />
      <div style={{ width: 17, height: 4, borderRadius: 2, background: color }} />
      <div style={{ width: 12, height: 4, borderRadius: 2, background: color }} />
    </div>
  );
}

function SuiteContent({ onEnterRalto }) {
  return (
    <div style={{ flex: 1, background: "#141E2A", overflowY: "auto", padding: "32px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <SuiteMark />
        <span style={{ fontFamily: "var(--font)", fontWeight: 700, fontSize: 20, color: "#fff", letterSpacing: 0.3 }}>
          SIMPLIFIED SUITE
        </span>
      </div>
      <div style={{ fontFamily: "var(--font)", fontSize: 13.5, color: "rgba(255,255,255,0.6)", marginBottom: 32 }}>
        Shared platform / neutral shell
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 40, maxWidth: 720 }}>
        {CORE_CAPABILITIES.map((c) => (
          <div
            key={c}
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 10,
              padding: "12px 16px",
              fontFamily: "var(--font)",
              fontWeight: 600,
              fontSize: 13,
              color: "rgba(255,255,255,0.85)",
            }}
          >
            {c}
          </div>
        ))}
      </div>

      <div style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 12.5, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
        Your products
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {SUITE_PRODUCTS.map((p) => (
          <button
            key={p.key}
            onClick={() => p.available && onEnterRalto()}
            disabled={!p.available}
            style={{
              width: 220,
              textAlign: "left",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 12,
              padding: "16px 18px",
              cursor: p.available ? "pointer" : "default",
              opacity: p.available ? 1 : 0.45,
            }}
          >
            <SuiteMark color={p.color} />
            <div style={{ fontFamily: "var(--font)", fontWeight: 700, fontSize: 14, color: "#fff", marginTop: 10, letterSpacing: 0.3 }}>
              {p.name}
            </div>
            <div style={{ fontFamily: "var(--font)", fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 3 }}>
              {p.available ? p.tagline : "Not in this workspace"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root app — the only thing that owns navigation state
// ---------------------------------------------------------------------------

export default function RaltoDesktopApp() {
  const [active, setActive] = useState("today");
  const [inSuite, setInSuite] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(INITIAL_JOBS[0].id);
  const [selectedPlannerJobId, setSelectedPlannerJobId] = useState("ufc327");

  const openJobFromCalendar = (jobId) => {
    setSelectedPlannerJobId(jobId);
    setActive("planner");
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "24px 0", background: "#E7E5E1" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        :root {
          --font: 'Inter', ui-sans-serif, system-ui, sans-serif;
          --ink: #18232E;
          --ink-muted: #667085;
          --surface: #F5F7F8;
          --line: #DCE3E7;
          --track: #EAECEF;

          --primary: #453E96;
          --primary-hover: #373178;
          --primary-soft: #6963AC;
          --primary-tint: #EDECF7;
          --primary-surface: #F7F6FC;

          --success: #2F855A;
          --success-bg: #E7F3ED;
          --attention: #A16207;
          --attention-bg: #FBF0DE;
          --danger: #B42318;
          --danger-bg: #F9E6E4;
        }
        input::placeholder { color: var(--ink-muted); opacity: 1; }
      `}</style>

      <div
        style={{
          width: 1240,
          height: 800,
          background: "var(--surface)",
          borderRadius: 16,
          border: "1px solid var(--line)",
          boxShadow: "0 30px 60px rgba(23,21,31,0.20)",
          overflow: "hidden",
          display: "flex",
        }}
      >
        {inSuite ? (
          <SuiteContent onEnterRalto={() => setInSuite(false)} />
        ) : (
          <>
            <Sidebar active={active} onSelect={setActive} onOpenSuite={() => setInSuite(true)} />
            {active === "today" && <TodayContent />}
            {active === "calendar" && <CalendarContent onOpenJob={openJobFromCalendar} />}
            {active === "jobs" && <JobsContent selectedId={selectedJobId} onSelect={setSelectedJobId} />}
            {active === "planner" && <PlannerContent selectedJobId={selectedPlannerJobId} onSelectJob={setSelectedPlannerJobId} />}
            {active === "crew" && <CrewContent />}
          </>
        )}
      </div>
    </div>
  );
}
