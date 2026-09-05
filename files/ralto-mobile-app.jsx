import { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard,
  Calendar,
  Briefcase,
  CalendarRange,
  Bell,
  RefreshCw,
  UserPlus,
  Check,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Minus,
  ChevronLeft,
  ChevronRight,
  Search,
  MapPin,
  Phone,
  CalendarDays,
  Star,
  Send,
  Users,
  LayoutGrid,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Combined Ralto scheduler mobile app — merges ralto-today-mobile.jsx,
// ralto-calendar-mobile.jsx, ralto-jobs-mobile.jsx and ralto-planner-mobile.jsx
// into one shell with a shared bottom tab bar, the same approach used for
// ralto-desktop-app.jsx. This is the SCHEDULER's app — ralto-crew-mobile.jsx
// (the field crew member's own app) is a different persona and stays
// separate, same distinction made for desktop's Crew screen.
//
// Tapping a job in the Calendar jumps to Planner with that job selected,
// matching the desktop behaviour (Planner is the actionable destination;
// Jobs remains a separate reference lookup, reachable via its own tab).
// ---------------------------------------------------------------------------

const TABS = [
  { key: "today", label: "Today", icon: LayoutDashboard },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "planner", label: "Planner", icon: CalendarRange },
];

// ---------------------------------------------------------------------------
// Shared candidate / assignment data — unified from the fuller versions that
// used to live separately in ralto-jobs-mobile.jsx and ralto-planner-mobile.jsx.
// Planner's crew-matching now covers every role Jobs did (previously it was
// missing EIC, Guarantee and Camera), which is a small real improvement that
// falls out of merging rather than a deliberate change.
// ---------------------------------------------------------------------------

const CANDIDATES = {
  EIC: {
    suitable: [{ name: "Priya Shah", base: "London", status: "Preferred", rate: "$900/day" }],
    possible: [{ name: "Marcus Webb", base: "Phoenix", status: "Approved", note: "Long travel to venue" }],
    unavailable: [{ name: "Elle Fischer", reason: "Marked unavailable these dates" }],
  },
  Guarantee: {
    suitable: [{ name: "Theo Banks", base: "Las Vegas", status: "Preferred", rate: "$700/day" }],
    possible: [],
    unavailable: [{ name: "Carla Diaz", reason: "Conflict — booked on Riyadh Boxing" }],
  },
  EVS: {
    suitable: [
      { name: "Sam Ortiz", base: "Las Vegas", status: "Preferred", rate: "$650/day" },
      { name: "Priya Nandan", base: "Los Angeles", status: "Approved", rate: "$600/day" },
    ],
    possible: [{ name: "Jon Butler", base: "Denver", status: "Approved", note: "Long travel — arrives late" }],
    unavailable: [
      { name: "Elle Fischer", reason: "Marked unavailable these dates" },
      { name: "Rob Cole", reason: "Conflict — booked on Champions League Final" },
    ],
  },
  Audio: {
    suitable: [{ name: "Nadia Slate", base: "London", status: "Approved", rate: "$500/day" }],
    possible: [{ name: "Omar Faris", base: "Dubai", status: "Standard", note: "Awaiting confirmation on a prior job" }],
    unavailable: [{ name: "Kelly Munro", reason: "Conflict — booked on UFC 327" }],
  },
  Utilities: {
    suitable: [{ name: "Marcus Webb", base: "Las Vegas", status: "Approved", rate: "$420/day" }],
    possible: [{ name: "Dana Reyes", base: "Phoenix", status: "Standard", note: "3hr drive to venue" }],
    unavailable: [{ name: "Ivy Chen", reason: "Conflict — booked on Riyadh Boxing" }],
  },
  Riggers: {
    suitable: [{ name: "Jed Cross", base: "Las Vegas", status: "Preferred", rate: "$480/day" }],
    possible: [],
    unavailable: [{ name: "Tom Reilly", reason: "Marked unavailable these dates" }],
  },
  Camera: {
    suitable: [{ name: "Ivy Chen", base: "Munich", status: "Approved", rate: "$700/day" }],
    possible: [{ name: "Dee Park", base: "Berlin", status: "Standard", note: "Needs a travel day before call" }],
    unavailable: [{ name: "Al Osei", reason: "Conflict — booked on Monaco GP Broadcast" }],
  },
};

const ASSIGNED = {
  EIC: ["Frank Ozuna", "Lena Marsh"],
  Guarantee: ["Theo Banks", "Carla Diaz", "Will Hunt"],
  Audio: ["Nadia Slate", "Kelly Munro", "Omar Faris", "Theo Banks", "Sam Ortiz", "Priya Nandan", "Will Hunt", "Dee Park"],
  Utilities: ["Marcus Webb", "Dana Reyes", "Ivy Chen", "Jed Cross", "Al Osei", "Mira Voss", "Tom Reilly", "Dee Park", "Frank Ozuna", "Kelly Munro", "Priya Nandan", "Theo Banks"],
  Riggers: ["Jed Cross", "Al Osei", "Mira Voss", "Tom Reilly", "Dee Park"],
  Camera: ["Ivy Chen", "Al Osei", "Mira Voss", "Tom Reilly", "Dee Park", "Frank Ozuna", "Kelly Munro", "Priya Nandan"],
  EVS: ["Sam Ortiz", "Priya Nandan", "Jon Butler", "Rob Cole", "Elle Fischer", "Marcus Webb", "Dana Reyes", "Ivy Chen", "Jed Cross", "Al Osei", "Mira Voss", "Tom Reilly"],
};

function CandidateGroup({ title, tone, children }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 20px", marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: tone }} />
        <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, color: "var(--ink-muted)" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "flex", gap: 14, padding: "16px 20px" }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--tint)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} color="var(--primary)" />
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-muted)" }}>{label}</div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--ink)", marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

// Shared by both Jobs and Planner — "job" just needs a .name for the header.
function MatchingScreen({ job, role, onBack, onOffer }) {
  const pool = CANDIDATES[role.role] || { suitable: [], possible: [], unavailable: [] };
  const [offered, setOffered] = useState([]);

  const sendOffer = (name) => {
    setOffered((prev) => [...prev, name]);
    onOffer(role.role);
  };

  const openLeft = role.required - role.confirmed - role.offered - offered.length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 20px 6px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, marginLeft: -4, color: "var(--ink)" }}>
          <ChevronLeft size={22} />
        </button>
      </div>
      <div style={{ padding: "4px 20px 14px" }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)" }}>{job.name}</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 21, color: "var(--ink)" }}>Find {role.role}</div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)", marginTop: 2 }}>
          {openLeft} position{openLeft === 1 ? "" : "s"} still open
        </div>
      </div>

      <CandidateGroup title="Available & suitable" tone="var(--success)">
        {pool.suitable.map((c) => (
          <div key={c.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid var(--line)" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>{c.name}</span>
                {c.status === "Preferred" && <Star size={12} color="var(--primary)" fill="var(--primary)" />}
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-muted)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <MapPin size={11} /> {c.base} · {c.status} · {c.rate}
              </div>
            </div>
            {offered.includes(c.name) ? (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 600, color: "var(--success)" }}>
                <Check size={14} /> Offered
              </span>
            ) : (
              <button
                onClick={() => sendOffer(c.name)}
                style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: 9, padding: "7px 12px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              >
                <Send size={12} /> Offer
              </button>
            )}
          </div>
        ))}
        {pool.suitable.length === 0 && (
          <div style={{ padding: "0 20px", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)" }}>No one in this group right now.</div>
        )}
      </CandidateGroup>

      <CandidateGroup title="Possible" tone="var(--attention)">
        {pool.possible.map((c) => (
          <div key={c.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid var(--line)" }}>
            <div>
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>{c.name}</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-muted)", marginTop: 2 }}>{c.base} · {c.status}</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--attention)", marginTop: 2 }}>{c.note}</div>
            </div>
            {offered.includes(c.name) ? (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 600, color: "var(--success)" }}>
                <Check size={14} /> Offered
              </span>
            ) : (
              <button
                onClick={() => sendOffer(c.name)}
                style={{ background: "#fff", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 9, padding: "7px 12px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12.5, cursor: "pointer", flexShrink: 0 }}
              >
                Offer
              </button>
            )}
          </div>
        ))}
        {pool.possible.length === 0 && (
          <div style={{ padding: "0 20px", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)" }}>No one in this group right now.</div>
        )}
      </CandidateGroup>

      <CandidateGroup title="Unavailable / conflicted" tone="var(--danger)">
        {pool.unavailable.map((c) => (
          <div key={c.name} style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", opacity: 0.6 }}>
            <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>{c.name}</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-muted)", marginTop: 2 }}>{c.reason}</div>
          </div>
        ))}
      </CandidateGroup>

      <div style={{ height: 40 }} />
    </div>
  );
}

function AssignedScreen({ job, role, onBack }) {
  const names = (ASSIGNED[role.role] || []).slice(0, role.confirmed);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 20px 6px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, marginLeft: -4, color: "var(--ink)" }}>
          <ChevronLeft size={22} />
        </button>
      </div>
      <div style={{ padding: "4px 20px 14px" }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)" }}>{job.name}</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 21, color: "var(--ink)" }}>{role.role} — fully crewed</div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--success)", marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
          <Check size={14} /> {role.confirmed}/{role.required} confirmed
        </div>
      </div>
      {names.map((name, i) => (
        <div key={name}>
          <div style={{ padding: "13px 20px", fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--ink)" }}>{name}</div>
          {i < names.length - 1 && <div style={{ height: 1, background: "var(--line)", margin: "0 20px" }} />}
        </div>
      ))}
      <div style={{ height: 40 }} />
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
  { name: "UFC 327 — Las Vegas", clientColor: "#F4511E", detail: "31/34 confirmed", status: "attention" },
  { name: "Champions League Final", clientColor: "#1B3A8C", detail: "42/42 confirmed", status: "confirmed" },
  { name: "Riyadh Boxing", clientColor: "#006C35", detail: "26/35 confirmed", status: "attention" },
  { name: "Monaco GP Broadcast", clientColor: "#E10600", detail: "18/18 confirmed", status: "confirmed" },
];

const toneColor = {
  attention: { fg: "var(--attention)", bg: "var(--attention-bg)" },
  danger: { fg: "var(--danger)", bg: "var(--danger-bg)" },
};

const jobStatus = {
  confirmed: { label: "Confirmed", color: "var(--success)", bg: "var(--success-bg)", Icon: CheckCircle2 },
  attention: { label: "Attention", color: "var(--attention)", bg: "var(--attention-bg)", Icon: Clock },
};

function AttentionCard({ item, onResolve }) {
  const Icon = item.icon;
  const ActionIcon = item.actionIcon;
  const tone = toneColor[item.tone];
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16, background: "#fff", display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: 999, background: tone.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={15} color={tone.fg} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>{item.title}</div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)", marginTop: 2, lineHeight: 1.4 }}>{item.subtitle}</div>
        <button
          onClick={() => onResolve(item.id, item.fillsShortfall)}
          style={{ marginTop: 10, background: "none", border: "1px solid var(--line)", borderRadius: 9, padding: "6px 11px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12.5, color: "var(--ink)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
        >
          {item.actionLabel} <ActionIcon size={12} />
        </button>
      </div>
    </div>
  );
}

function StatBlock({ value, label, tone }) {
  return (
    <div style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 12, background: "#fff", padding: "10px 12px" }}>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, fontVariantNumeric: "tabular-nums", color: tone || "var(--ink)", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--ink-muted)", marginTop: 5, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

function TodayContent() {
  const [attention, setAttention] = useState(INITIAL_ATTENTION);
  const shortfall = attention.reduce((s, a) => s + a.fillsShortfall, 0);
  const confirmed = TOTAL_CREW - shortfall;
  const resolve = (id) => setAttention((prev) => prev.filter((a) => a.id !== id));

  return (
    <div>
      <div style={{ padding: "20px 20px 4px" }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-muted)" }}>Good morning, Jordan</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 24, color: "var(--ink)" }}>Today</div>
      </div>

      <div style={{ display: "flex", padding: "18px 20px", gap: 8 }}>
        <StatBlock value={JOBS_LIVE} label="Jobs live" />
        <StatBlock value={TOTAL_CREW} label="Crew working" />
        <StatBlock value={confirmed} label="Confirmed & ready" tone={confirmed === TOTAL_CREW ? "var(--success)" : "var(--attention)"} />
      </div>

      <div style={{ margin: "10px 20px 0", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, color: "var(--ink-muted)" }}>
        Needs attention
      </div>

      {attention.length > 0 ? (
        <div style={{ padding: "10px 20px 0", display: "flex", flexDirection: "column", gap: 12 }}>
          {attention.map((item) => (
            <AttentionCard key={item.id} item={item} onResolve={resolve} />
          ))}
        </div>
      ) : (
        <div style={{ margin: "10px 20px 0", padding: "22px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: 34, height: 34, borderRadius: 999, background: "var(--success-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={16} color="var(--success)" />
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>All crew covered</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)" }}>No action required.</div>
        </div>
      )}

      <div style={{ margin: "28px 20px 8px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, color: "var(--ink-muted)" }}>
        Today's jobs
      </div>
      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {TODAYS_JOBS.map((job) => {
          const s = jobStatus[job.status];
          const StatusIcon = s.Icon;
          return (
            <div key={job.name} style={{ position: "relative", border: "1px solid var(--line)", borderRadius: 12, background: "#fff", padding: "12px 14px 12px 18px", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: job.clientColor }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {job.name}
                </div>
                <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <StatusIcon size={13} color={s.color} strokeWidth={2.5} />
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12, color: s.color, marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
                {job.detail}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ height: 30 }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

const CALENDAR_JOBS = [
  { id: "riyadh", name: "Riyadh Boxing", client: "Kingdom Sports Group", clientColor: "#006C35", start: "2026-09-03", end: "2026-09-10", confirmed: 26, required: 35 },
  { id: "wimbledon", name: "Wimbledon Finals Coverage", client: "AELTC Media", clientColor: "#005C30", start: "2026-09-12", end: "2026-09-14", confirmed: 8, required: 20 },
  { id: "ufc327", name: "UFC 327 — Las Vegas", client: "TNT Sports", clientColor: "#F4511E", start: "2026-09-14", end: "2026-09-19", confirmed: 31, required: 34 },
  { id: "clfinal", name: "Champions League Final", client: "UEFA Broadcast Services", clientColor: "#1B3A8C", start: "2026-09-22", end: "2026-09-22", confirmed: 42, required: 42 },
  { id: "monaco", name: "Monaco GP Broadcast", client: "F1 Media", clientColor: "#E10600", start: "2026-09-24", end: "2026-09-26", confirmed: 18, required: 18 },
  { id: "marathon", name: "London Marathon", client: "City Sports Media", clientColor: "var(--primary)", start: "2026-09-27", end: "2026-09-27", confirmed: 0, required: 15 },
];

const TODAY = new Date(2026, 8, 5); // Sat 5 Sep 2026, matching every other Ralto screen

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
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

function DayCell({ date, inMonth, isToday, isSelected, jobs, onSelect }) {
  return (
    <button
      onClick={() => onSelect(date)}
      style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 0 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: inMonth ? 1 : 0.35 }}
    >
      <span
        style={{
          width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-body)", fontSize: 13, fontWeight: isToday || isSelected ? 700 : 500,
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
      style={{ position: "relative", width: "100%", textAlign: "left", background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px 12px 18px", marginBottom: 10, cursor: "pointer", overflow: "hidden" }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: job.clientColor }} />
      <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{job.name}</div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>{job.client}</div>
      <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12, color: job.confirmed === job.required ? "var(--success)" : "var(--attention)", marginTop: 6 }}>
        {job.confirmed}/{job.required} confirmed
      </div>
    </button>
  );
}

function CalendarContent({ onOpenJob }) {
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
              style={{ background: mode === m ? "#fff" : "none", border: "none", borderRadius: 8, padding: "6px 14px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12.5, color: mode === m ? "var(--primary)" : "var(--ink-muted)", cursor: "pointer", textTransform: "capitalize" }}
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
            <div key={i} style={{ textAlign: "center", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 11, color: "var(--ink-muted)" }}>{d}</div>
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
          <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)", padding: "8px 0 20px" }}>No jobs scheduled.</div>
        )}
      </div>
      <div style={{ height: 30 }} />
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

function JobRow({ job, onOpen }) {
  const u = urgency(job);
  const { required, confirmed } = totals(job);
  const quiet = u.tier === "complete" || u.tier === "quiet";
  const pct = (confirmed / required) * 100;
  const StatusIcon = u.Icon;

  return (
    <button
      onClick={() => onOpen(job.id)}
      style={{ position: "relative", width: "100%", textAlign: "left", background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px 12px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: job.clientColor, opacity: quiet ? 0.6 : 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14.5, color: quiet ? "var(--ink-muted)" : "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {job.name}
          </span>
          <span style={{ fontFamily: "var(--font-body)", fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: 13, color: u.color, flexShrink: 0 }}>
            {confirmed}/{required}
          </span>
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-muted)", marginTop: 2 }}>
          {job.dates} · {job.venue.split(",")[0]}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <div style={{ flex: 1, height: 5, borderRadius: 999, background: "var(--track)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: u.tier === "quiet" ? "var(--ink-muted)" : u.color, opacity: quiet ? 0.5 : 1 }} />
          </div>
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: u.color, marginTop: 6, fontWeight: u.tier === "complete" ? 400 : 600 }}>
          {statusLabel(job)}
        </div>
      </div>
      <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: u.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <StatusIcon size={14} color={u.color} strokeWidth={2.5} />
      </div>
    </button>
  );
}

function JobsRoleRow({ role, onOpen }) {
  const unfilled = role.required - role.confirmed - role.offered;
  const pct = (role.confirmed / role.required) * 100;
  const complete = unfilled <= 0;
  const StatusIcon = complete ? CheckCircle2 : role.offered > 0 ? Clock : AlertTriangle;
  const statusColor = complete ? "var(--success)" : "var(--attention)";
  const statusBg = complete ? "var(--success-bg)" : "var(--attention-bg)";
  return (
    <button
      onClick={() => onOpen(role)}
      style={{ width: "100%", textAlign: "left", background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{role.role}</span>
          <span style={{ fontFamily: "var(--font-body)", fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 600, color: unfilled > 0 ? "var(--attention)" : "var(--ink-muted)" }}>
            {role.confirmed}/{role.required}
          </span>
        </div>
        <div style={{ height: 5, borderRadius: 999, background: "var(--track)", overflow: "hidden", marginTop: 8 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: unfilled > 0 ? "var(--attention)" : "var(--success)" }} />
        </div>
        {role.offered > 0 && (
          <div style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--attention)", marginTop: 6 }}>{role.offered} offered</div>
        )}
      </div>
      <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", background: statusBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <StatusIcon size={13} color={statusColor} strokeWidth={2.5} />
      </div>
    </button>
  );
}

function JobOverview({ job, onBack, onOffer }) {
  const { required, confirmed, unfilled } = totals(job);
  const u = urgency(job);
  const [roleDetail, setRoleDetail] = useState(null);

  const openRole = (role) => {
    const open = role.required - role.confirmed - role.offered;
    setRoleDetail({ mode: open > 0 ? "match" : "assigned", role });
  };

  if (roleDetail?.mode === "match") {
    return <MatchingScreen job={job} role={roleDetail.role} onBack={() => setRoleDetail(null)} onOffer={onOffer} />;
  }
  if (roleDetail?.mode === "assigned") {
    return <AssignedScreen job={job} role={roleDetail.role} onBack={() => setRoleDetail(null)} />;
  }

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
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, color: "var(--ink)", lineHeight: 1.2 }}>{job.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
          <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12, padding: "4px 10px", borderRadius: 999, color: u.color, background: u.bg }}>
            {unfilled === 0 ? "Complete" : statusLabel(job)}
          </span>
        </div>
      </div>
      <div style={{ height: 1, background: "var(--line)", margin: "0 20px" }} />
      <Row icon={CalendarDays} label="Dates" value={job.dates} />
      <div style={{ height: 1, background: "var(--line)", margin: "0 20px" }} />
      <Row icon={MapPin} label="Venue" value={job.venue} />
      <div style={{ height: 1, background: "var(--line)", margin: "0 20px" }} />
      <Row icon={Phone} label="Production contact" value={job.contact} />
      <div style={{ margin: "24px 20px 4px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, color: "var(--ink-muted)" }}>Crewing by role</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-muted)" }}>{confirmed}/{required} total</span>
      </div>
      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {job.roles.map((r) => (
          <JobsRoleRow key={r.role} role={r} onOpen={openRole} />
        ))}
      </div>
      <div style={{ margin: "18px 20px 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-muted)", lineHeight: 1.5 }}>
        Tap a role to find crew for open positions, or see who's already assigned.
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "attention", label: "Attention" },
  { key: "complete", label: "Complete" },
];

function JobsContent() {
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [openJobId, setOpenJobId] = useState(null);

  const openJob = jobs.find((j) => j.id === openJobId) || null;

  const handleOffer = (roleName) => {
    if (!openJobId) return;
    setJobs((prev) =>
      prev.map((j) => (j.id === openJobId ? { ...j, roles: j.roles.map((r) => (r.role === roleName ? { ...r, offered: r.offered + 1 } : r)) } : j))
    );
  };

  const filtered = useMemo(() => {
    let list = jobs.filter((j) => j.name.toLowerCase().includes(query.toLowerCase()) || j.client.toLowerCase().includes(query.toLowerCase()));
    if (filter === "attention") list = list.filter((j) => ["critical", "attention"].includes(urgency(j).tier));
    else if (filter === "complete") list = list.filter((j) => urgency(j).tier === "complete");
    const rank = { critical: 0, attention: 1, quiet: 2, complete: 3 };
    return [...list].sort((a, b) => rank[urgency(a).tier] - rank[urgency(b).tier]);
  }, [jobs, query, filter]);

  if (openJob) {
    return <JobOverview job={openJob} onBack={() => setOpenJobId(null)} onOffer={handleOffer} />;
  }

  return (
    <div>
      <div style={{ padding: "20px 20px 4px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 24, color: "var(--ink)" }}>Jobs</div>
      </div>
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--track)", borderRadius: 10, padding: "9px 12px" }}>
          <Search size={15} color="var(--ink-muted)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search jobs or clients"
            style={{ border: "none", background: "none", outline: "none", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink)", flex: 1 }}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, padding: "14px 20px 6px" }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{ background: active ? "var(--primary)" : "var(--track)", color: active ? "#fff" : "var(--ink-muted)", border: "none", borderRadius: 999, padding: "6px 14px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 6, padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((job) => (
          <JobRow key={job.id} job={job} onOpen={setOpenJobId} />
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: "30px 0", textAlign: "center", fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--ink-muted)" }}>No jobs match.</div>
        )}
      </div>
      <div style={{ height: 40 }} />
    </div>
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

function completeness(reqs) {
  const required = reqs.reduce((s, r) => s + r.required, 0);
  const confirmed = reqs.reduce((s, r) => s + r.confirmed, 0);
  const unfilled = required - confirmed - reqs.reduce((s, r) => s + r.offered, 0);
  return { required, confirmed, unfilled };
}

function JobChip({ job, active, onClick }) {
  const { required, confirmed } = completeness(job.requirements);
  const complete = confirmed === required;
  return (
    <button
      onClick={onClick}
      style={{ position: "relative", flexShrink: 0, background: active ? "var(--primary)" : "#fff", border: active ? "none" : "1px solid var(--line)", borderRadius: 14, padding: "10px 14px 10px 18px", textAlign: "left", cursor: "pointer", minWidth: 148, overflow: "hidden" }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: job.clientColor, opacity: active ? 0.85 : 1 }} />
      <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13.5, color: active ? "#fff" : "var(--ink)" }}>{job.name}</div>
      <div style={{ fontFamily: "var(--font-body)", fontVariantNumeric: "tabular-nums", fontSize: 12, marginTop: 3, color: active ? "rgba(255,255,255,0.85)" : complete ? "var(--success)" : "var(--attention)", fontWeight: 600 }}>
        {confirmed}/{required} confirmed
      </div>
    </button>
  );
}

function RequirementRow({ req, onOpen }) {
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
      style={{ width: "100%", textAlign: "left", background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 15, color: "var(--ink)" }}>{req.role}</span>
          <span style={{ fontFamily: "var(--font-body)", fontVariantNumeric: "tabular-nums", fontSize: 13, color: unfilled > 0 ? "var(--attention)" : "var(--ink-muted)", fontWeight: 600 }}>
            {req.confirmed}/{req.required}
          </span>
        </div>
        <div style={{ marginTop: 8, height: 6, borderRadius: 999, background: "var(--track)", overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${pctConfirmed}%`, background: "var(--success)" }} />
          <div style={{ width: `${pctOffered}%`, background: "var(--attention)" }} />
        </div>
        {unfilled > 0 && (
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--attention)", marginTop: 6 }}>
            {unfilled} unfilled{req.offered > 0 ? ` · ${req.offered} offered` : ""}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", background: statusBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <StatusIcon size={13} color={statusColor} strokeWidth={2.5} />
      </div>
    </button>
  );
}

function PeopleTab({ job }) {
  const flat = Object.values(ASSIGNED).flat();
  const unique = [...new Set(flat)];
  return (
    <div>
      <div style={{ padding: "18px 20px 4px", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)" }}>
        {unique.length} people currently on {job.name}
      </div>
      {unique.map((name, i) => (
        <div key={name}>
          <div style={{ padding: "13px 20px", fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--ink)" }}>{name}</div>
          {i < unique.length - 1 && <div style={{ height: 1, background: "var(--line)", margin: "0 20px" }} />}
        </div>
      ))}
    </div>
  );
}

// selectedJobId / onSelectJob are controlled from the root app so the
// Calendar can jump straight to a specific job here.
function PlannerContent({ selectedJobId, onSelectJob }) {
  const [jobsState, setJobsState] = useState(PLANNER_JOBS);
  const [detail, setDetail] = useState(null); // { mode: 'match'|'assigned', req }
  const [view, setView] = useState("roles");

  const job = jobsState[selectedJobId];

  // Land cleanly on the roles list whenever the selected job changes,
  // whether from tapping a chip here or arriving via the Calendar.
  useEffect(() => {
    setDetail(null);
    setView("roles");
  }, [selectedJobId]);

  const { required, confirmed, unfilled } = completeness(job.requirements);

  const openRequirement = (req) => {
    const openSlots = req.required - req.confirmed - req.offered;
    setDetail({ mode: openSlots > 0 ? "match" : "assigned", req });
  };

  const handleOffer = (role) => {
    setJobsState((prev) => {
      const next = { ...prev };
      next[selectedJobId] = {
        ...next[selectedJobId],
        requirements: next[selectedJobId].requirements.map((r) => (r.role === role ? { ...r, offered: r.offered + 1 } : r)),
      };
      return next;
    });
  };

  if (detail?.mode === "match") {
    return <MatchingScreen job={job} role={detail.req} onBack={() => setDetail(null)} onOffer={handleOffer} />;
  }
  if (detail?.mode === "assigned") {
    return <AssignedScreen job={job} role={detail.req} onBack={() => setDetail(null)} />;
  }

  return (
    <div>
      <div style={{ padding: "20px 20px 4px" }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)" }}>Planner</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 21, color: "var(--ink)" }}>{job.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: job.clientColor, flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)" }}>{job.subtitle}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "16px 20px 4px", overflowX: "auto" }}>
        {Object.values(jobsState).map((j) => (
          <JobChip key={j.id} job={j} active={j.id === selectedJobId} onClick={() => onSelectJob(j.id)} />
        ))}
      </div>

      <div style={{ padding: "18px 20px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontFamily: "var(--font-body)", fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 19, color: unfilled > 0 ? "var(--attention)" : "var(--success)" }}>
            {confirmed}/{required}
          </span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)", marginLeft: 6 }}>
            {unfilled > 0 ? `${unfilled} unfilled` : "Fully crewed"}
          </span>
        </div>
        <div style={{ display: "flex", background: "var(--track)", borderRadius: 10, padding: 3 }}>
          {[
            { key: "roles", icon: LayoutGrid, label: "Roles" },
            { key: "people", icon: Users, label: "People" },
          ].map((t) => {
            const Icon = t.icon;
            const active = view === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                style={{ display: "flex", alignItems: "center", gap: 5, background: active ? "#fff" : "none", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 600, color: active ? "var(--ink)" : "var(--ink-muted)" }}
              >
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {view === "roles" ? (
        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {job.requirements.map((req) => (
            <RequirementRow key={req.role} req={req} onOpen={openRequirement} />
          ))}
        </div>
      ) : (
        <PeopleTab job={job} />
      )}
      <div style={{ height: 40 }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root app — shared bottom tab bar + lifted state for the Calendar → Planner
// jump, matching ralto-desktop-app.jsx.
// ---------------------------------------------------------------------------

export default function RaltoSchedulerApp() {
  const [tab, setTab] = useState("today");
  const [selectedPlannerJobId, setSelectedPlannerJobId] = useState("ufc327");

  const openJobInPlanner = (job) => {
    setSelectedPlannerJobId(job.id);
    setTab("planner");
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "24px 0", background: "#E7E5E1", minHeight: "100%", fontFamily: "var(--font-body)" }}>
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
          --track: #F1F0EE;
          --line: #E7E5E2;
          --success: #3F8F6D;
          --success-bg: #EAF4EF;
          --attention: #C98A2B;
          --attention-bg: #FBF1E1;
          --danger: #B5473C;
          --danger-bg: #F8EBE9;
        }
        input::placeholder { color: var(--ink-muted); opacity: 1; }
      `}</style>

      <div style={{ width: 375, height: 780, background: "var(--bg)", borderRadius: 40, border: "8px solid #17151F", boxShadow: "0 30px 60px rgba(23,21,31,0.35)", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 24px 0", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
          <span>9:41</span>
          <span>Ralto</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {tab === "today" && <TodayContent />}
          {tab === "calendar" && <CalendarContent onOpenJob={openJobInPlanner} />}
          {tab === "jobs" && <JobsContent />}
          {tab === "planner" && <PlannerContent selectedJobId={selectedPlannerJobId} onSelectJob={setSelectedPlannerJobId} />}
        </div>

        {/* Bottom tab bar */}
        <div style={{ display: "flex", borderTop: "1px solid var(--line)", background: "#fff", padding: "10px 0 16px" }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
              >
                <Icon size={20} color={active ? "var(--primary)" : "var(--ink-muted)"} />
                <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: active ? "var(--primary)" : "var(--ink-muted)" }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
