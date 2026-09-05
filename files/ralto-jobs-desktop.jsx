import { useState, useMemo } from "react";
import {
  LayoutDashboard,
  Briefcase,
  CalendarRange,
  Users,
  Search,
  Settings,
  MapPin,
  Phone,
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Minus,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens — identical to ralto-today-desktop.jsx. Kept duplicated
// (rather than shared import) since each screen is a standalone artifact,
// same pattern as the mobile prototypes.
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { key: "today", label: "Today", icon: LayoutDashboard },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "planner", label: "Planner", icon: CalendarRange },
  { key: "crew", label: "Crew", icon: Users },
];

// Same jobs, same client colours as every other Ralto screen.
const INITIAL_JOBS = [
  {
    id: "ufc327",
    name: "UFC 327 — Las Vegas",
    client: "TNT Sports",
    clientColor: "#F4511E",
    dates: "14–19 Nov",
    venue: "T-Mobile Arena, Las Vegas",
    contact: "Dana Whitfield · +1 702 555 0148",
    daysUntilStart: 4,
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
    id: "clfinal",
    name: "Champions League Final",
    client: "UEFA Broadcast Services",
    clientColor: "#1B3A8C",
    dates: "22 May",
    venue: "Allianz Arena, Munich",
    contact: "Petra Lindqvist · +49 89 555 0110",
    daysUntilStart: 260,
    roles: [
      { role: "Camera", required: 10, confirmed: 10, offered: 0 },
      { role: "Audio", required: 8, confirmed: 8, offered: 0 },
      { role: "EVS", required: 12, confirmed: 12, offered: 0 },
      { role: "Utilities", required: 12, confirmed: 12, offered: 0 },
    ],
  },
  {
    id: "riyadh",
    name: "Riyadh Boxing",
    client: "Kingdom Sports Group",
    clientColor: "#006C35",
    dates: "3–10 Dec",
    venue: "Kingdom Arena, Riyadh",
    contact: "Yousef Al-Amin · +966 55 555 0199",
    daysUntilStart: 23,
    roles: [
      { role: "Audio", required: 10, confirmed: 6, offered: 0 },
      { role: "EVS", required: 15, confirmed: 12, offered: 0 },
      { role: "Utilities", required: 10, confirmed: 8, offered: 0 },
    ],
  },
  {
    id: "monaco",
    name: "Monaco GP Broadcast",
    client: "F1 Media",
    clientColor: "#E10600",
    dates: "24–26 May",
    venue: "Circuit de Monaco",
    contact: "Elise Rambert · +377 555 0122",
    daysUntilStart: 262,
    roles: [
      { role: "Camera", required: 8, confirmed: 8, offered: 0 },
      { role: "Audio", required: 4, confirmed: 4, offered: 0 },
      { role: "Utilities", required: 6, confirmed: 6, offered: 0 },
    ],
  },
  {
    id: "wimbledon",
    name: "Wimbledon Finals Coverage",
    client: "AELTC Media",
    clientColor: "#005C30",
    dates: "12–14 Jul",
    venue: "All England Club, London",
    contact: "Rowan Ashcroft · +44 20 7946 0011",
    daysUntilStart: 120,
    roles: [
      { role: "Camera", required: 8, confirmed: 4, offered: 0 },
      { role: "Audio", required: 6, confirmed: 2, offered: 0 },
      { role: "EVS", required: 6, confirmed: 2, offered: 0 },
    ],
  },
  {
    id: "marathon",
    name: "London Marathon",
    client: "City Sports Media",
    clientColor: "var(--primary)",
    dates: "26 Apr",
    venue: "Central London",
    contact: "Not yet assigned",
    daysUntilStart: 170,
    roles: [
      { role: "Camera", required: 6, confirmed: 0, offered: 0 },
      { role: "Audio", required: 4, confirmed: 0, offered: 0 },
      { role: "Utilities", required: 5, confirmed: 0, offered: 0 },
    ],
  },
];

// ---------------------------------------------------------------------------

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

function Sidebar({ active, onSelect }) {
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
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px", marginBottom: 4 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ width: 20, height: 4, borderRadius: 2, background: "var(--primary)" }} />
          <div style={{ width: 15, height: 4, borderRadius: 2, background: "var(--primary)" }} />
          <div style={{ width: 10, height: 4, borderRadius: 2, background: "var(--primary)" }} />
        </div>
        <span style={{ fontFamily: "var(--font)", fontWeight: 700, fontSize: 16, color: "var(--ink)", letterSpacing: 0.2 }}>
          RALTO
        </span>
      </div>
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

function JobListRow({ job, selected, onOpen }) {
  const u = urgency(job);
  const { required, confirmed } = totals(job);
  const quiet = u.tier === "complete" || u.tier === "quiet";
  const pct = (confirmed / required) * 100;
  const StatusIcon = u.Icon;

  return (
    <button
      onClick={() => onOpen(job.id)}
      style={{
        position: "relative",
        width: "100%",
        textAlign: "left",
        background: selected ? "var(--primary-tint)" : "#fff",
        border: selected ? "1px solid var(--primary-soft)" : "1px solid var(--line)",
        borderRadius: 12,
        padding: "12px 14px 12px 18px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 5,
          background: job.clientColor,
          opacity: quiet ? 0.6 : 1,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--font)",
              fontWeight: 600,
              fontSize: 14,
              color: quiet ? "var(--ink-muted)" : "var(--ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {job.name}
          </span>
          <span
            style={{
              fontFamily: "var(--font)",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 600,
              fontSize: 12.5,
              color: u.color,
              flexShrink: 0,
            }}
          >
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
      <div
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: u.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <StatusIcon size={12} color={u.color} strokeWidth={2.5} />
      </div>
    </button>
  );
}

function Row({ icon: Icon, label, value }) {
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

function RoleRow({ role }) {
  const unfilled = role.required - role.confirmed - role.offered;
  const pct = (role.confirmed / role.required) * 100;
  const complete = unfilled <= 0;
  const StatusIcon = complete ? CheckCircle2 : role.offered > 0 ? Clock : AlertTriangle;
  const statusColor = complete ? "var(--success)" : "var(--attention)";
  const statusBg = complete ? "var(--success-bg)" : "var(--attention-bg)";
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
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

export default function JobsDesktop() {
  const [active] = useState("jobs");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(INITIAL_JOBS[0].id);

  const filtered = useMemo(() => {
    return INITIAL_JOBS.filter(
      (j) => j.name.toLowerCase().includes(query.toLowerCase()) || j.client.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  const job = INITIAL_JOBS.find((j) => j.id === selectedId);
  const u = urgency(job);
  const { required, confirmed } = totals(job);

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
        <Sidebar active={active} onSelect={() => {}} />

        {/* List pane */}
        <div style={{ width: 380, flexShrink: 0, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "24px 20px 16px" }}>
            <div style={{ fontFamily: "var(--font)", fontWeight: 700, fontSize: 22, color: "var(--ink)", marginBottom: 14 }}>
              Jobs
            </div>
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
              <JobListRow key={j.id} job={j} selected={j.id === selectedId} onOpen={setSelectedId} />
            ))}
          </div>
        </div>

        {/* Detail pane */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 36px" }}>
          <div style={{ fontFamily: "var(--font)", fontSize: 13, color: "var(--ink-muted)" }}>{job.client}</div>
          <div style={{ fontFamily: "var(--font)", fontWeight: 700, fontSize: 24, color: "var(--ink)", marginTop: 2 }}>
            {job.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
            <span style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 12, padding: "4px 10px", borderRadius: 999, color: u.color, background: u.bg }}>
              {statusLabel(job)}
            </span>
          </div>

          <div style={{ display: "flex", gap: 32, marginTop: 8, borderBottom: "1px solid var(--line)", paddingBottom: 4 }}>
            <Row icon={CalendarDays} label="Dates" value={job.dates} />
            <Row icon={MapPin} label="Venue" value={job.venue} />
            <Row icon={Phone} label="Production contact" value={job.contact} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "24px 0 12px" }}>
            <span style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 14, color: "var(--ink-muted)" }}>Crewing by role</span>
            <span style={{ fontFamily: "var(--font)", fontSize: 12.5, color: "var(--ink-muted)" }}>{confirmed}/{required} total</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {job.roles.map((r) => (
              <RoleRow key={r.role} role={r} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
