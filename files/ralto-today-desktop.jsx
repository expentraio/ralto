import { useState } from "react";
import {
  LayoutDashboard,
  Briefcase,
  CalendarRange,
  Users,
  Bell,
  RefreshCw,
  UserPlus,
  Check,
  ChevronRight,
  Search,
  Settings,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens — from the locked Simplified Software visual identity (v1).
// Typeface is Inter throughout (the doc's explicit suite-wide lock), which
// differs from the mobile prototypes (Space Grotesk / IBM Plex Sans) — worth
// reconciling those separately. Colour tokens match exactly what the mobile
// screens already use (same hex values), so client-colour and status
// semantics stay identical between mobile and desktop.
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { key: "today", label: "Today", icon: LayoutDashboard },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "planner", label: "Planner", icon: CalendarRange },
  { key: "crew", label: "Crew", icon: Users },
];

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

// Same jobs, same client colours as ralto-today-mobile.jsx.
const TODAYS_JOBS = [
  { name: "UFC 327 — Las Vegas", client: "TNT Sports", clientColor: "#F4511E", confirmed: 31, required: 34, status: "attention" },
  { name: "Champions League Final", client: "UEFA Broadcast Services", clientColor: "#1B3A8C", confirmed: 42, required: 42, status: "confirmed" },
  { name: "Riyadh Boxing", client: "Kingdom Sports Group", clientColor: "#006C35", confirmed: 26, required: 35, status: "attention" },
  { name: "Monaco GP Broadcast", client: "F1 Media", clientColor: "#E10600", confirmed: 18, required: 18, status: "confirmed" },
];

// ---------------------------------------------------------------------------

const toneColor = {
  attention: { fg: "var(--attention)", bg: "var(--attention-bg)" },
  danger: { fg: "var(--danger)", bg: "var(--danger-bg)" },
};

const jobStatus = {
  confirmed: { label: "Confirmed", color: "var(--success)", bg: "var(--success-bg)" },
  attention: { label: "Attention", color: "var(--attention)", bg: "var(--attention-bg)" },
};

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

function StatCard({ value, label, tone }) {
  return (
    <div
      style={{
        flex: 1,
        border: "1px solid var(--line)",
        borderRadius: 12,
        background: "#fff",
        padding: "18px 20px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font)",
          fontWeight: 700,
          fontSize: 30,
          fontVariantNumeric: "tabular-nums",
          color: tone || "var(--ink)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontFamily: "var(--font)", fontSize: 13, color: "var(--ink-muted)", marginTop: 6 }}>
        {label}
      </div>
    </div>
  );
}

function AttentionCard({ item, onResolve }) {
  const Icon = item.icon;
  const ActionIcon = item.actionIcon;
  const tone = toneColor[item.tone];

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: 16,
        background: "#fff",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          background: tone.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={16} color={tone.fg} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
          {item.title}
        </div>
        <div style={{ fontFamily: "var(--font)", fontSize: 13, color: "var(--ink-muted)", marginTop: 2 }}>
          {item.subtitle}
        </div>
      </div>
      <button
        onClick={() => onResolve(item.id, item.fillsShortfall)}
        style={{
          flexShrink: 0,
          background: "none",
          border: "1px solid var(--line)",
          borderRadius: 8,
          padding: "7px 12px",
          fontFamily: "var(--font)",
          fontWeight: 600,
          fontSize: 12.5,
          color: "var(--ink)",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        {item.actionLabel} <ActionIcon size={12} />
      </button>
    </div>
  );
}

export default function TodayDesktop() {
  const [active, setActive] = useState("today");
  const [attention, setAttention] = useState(INITIAL_ATTENTION);

  const shortfall = attention.reduce((s, a) => s + a.fillsShortfall, 0);
  const confirmed = TOTAL_CREW - shortfall;

  const resolve = (id) => {
    setAttention((prev) => prev.filter((a) => a.id !== id));
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
        <Sidebar active={active} onSelect={setActive} />

        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Top bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "22px 32px 0",
            }}
          >
            <div>
              <div style={{ fontFamily: "var(--font)", fontSize: 13.5, color: "var(--ink-muted)" }}>
                Saturday, 5 September
              </div>
              <div style={{ fontFamily: "var(--font)", fontWeight: 700, fontSize: 26, color: "var(--ink)" }}>
                Today
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: "8px 14px",
                background: "#fff",
                width: 260,
              }}
            >
              <Search size={15} color="var(--ink-muted)" />
              <span style={{ fontFamily: "var(--font)", fontSize: 13.5, color: "var(--ink-muted)" }}>
                Search jobs or crew
              </span>
            </div>
          </div>

          {/* Live stats */}
          <div style={{ display: "flex", gap: 14, padding: "24px 32px 0" }}>
            <StatCard value={JOBS_LIVE} label="Jobs live" />
            <StatCard value={TOTAL_CREW} label="Crew working" />
            <StatCard
              value={confirmed}
              label="Confirmed & ready"
              tone={confirmed === TOTAL_CREW ? "var(--success)" : "var(--attention)"}
            />
          </div>

          {/* Two-column layout: needs attention (left, wider) + today's jobs (right) */}
          <div style={{ display: "flex", gap: 20, padding: "28px 32px 32px", alignItems: "flex-start" }}>
            <div style={{ flex: 1.4 }}>
              <div style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 14, color: "var(--ink-muted)", marginBottom: 12 }}>
                Needs attention
              </div>

              {attention.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {attention.map((item) => (
                    <AttentionCard key={item.id} item={item} onResolve={resolve} />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    background: "#fff",
                    padding: "26px 20px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      background: "var(--success-bg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 8px",
                    }}
                  >
                    <Check size={17} color="var(--success)" />
                  </div>
                  <div style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>
                    All crew covered
                  </div>
                  <div style={{ fontFamily: "var(--font)", fontSize: 13, color: "var(--ink-muted)", marginTop: 2 }}>
                    No action required.
                  </div>
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 14, color: "var(--ink-muted)", marginBottom: 12 }}>
                Today's jobs
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {TODAYS_JOBS.map((job) => {
                  const s = jobStatus[job.status];
                  return (
                    <div
                      key={job.name}
                      style={{
                        position: "relative",
                        border: "1px solid var(--line)",
                        borderRadius: 12,
                        background: "#fff",
                        padding: "12px 14px 12px 18px",
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
                        }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: "var(--font)",
                              fontWeight: 600,
                              fontSize: 13.5,
                              color: "var(--ink)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {job.name}
                          </div>
                          <div style={{ fontFamily: "var(--font)", fontSize: 12, color: "var(--ink-muted)", marginTop: 1 }}>
                            {job.client}
                          </div>
                        </div>
                        <div
                          style={{
                            flexShrink: 0,
                            fontFamily: "var(--font)",
                            fontWeight: 600,
                            fontSize: 12.5,
                            fontVariantNumeric: "tabular-nums",
                            color: s.color,
                          }}
                        >
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
      </div>
    </div>
  );
}
