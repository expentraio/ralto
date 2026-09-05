import { useState } from "react";
import { Bell, RefreshCw, UserPlus, Check, CheckCircle2, Clock, ChevronRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Mock data
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

// clientColor mirrors the mapping in ralto-jobs-mobile.jsx — same jobs, same
// client brand colours, so a job reads consistently across every screen.
const TODAYS_JOBS = [
  { name: "UFC 327 — Las Vegas", clientColor: "#F4511E", detail: "31/34 confirmed", status: "attention" },
  { name: "Champions League Final", clientColor: "#1B3A8C", detail: "42/42 confirmed", status: "confirmed" },
  { name: "Riyadh Boxing", clientColor: "#006C35", detail: "26/35 confirmed", status: "attention" },
  { name: "Monaco GP Broadcast", clientColor: "#E10600", detail: "18/18 confirmed", status: "confirmed" },
];

// ---------------------------------------------------------------------------

const toneColor = {
  attention: { fg: "var(--attention)", bg: "var(--attention-bg)" },
  danger: { fg: "var(--danger)", bg: "var(--danger-bg)" },
};

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
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          background: tone.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={15} color={tone.fg} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>
          {item.title}
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)", marginTop: 2, lineHeight: 1.4 }}>
          {item.subtitle}
        </div>
        <button
          onClick={() => onResolve(item.id, item.fillsShortfall)}
          style={{
            marginTop: 10,
            background: "none",
            border: "1px solid var(--line)",
            borderRadius: 9,
            padding: "6px 11px",
            fontFamily: "var(--font-body)",
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
    </div>
  );
}

function StatBlock({ value, label, tone }) {
  return (
    <div
      style={{
        flex: 1,
        border: "1px solid var(--line)",
        borderRadius: 12,
        background: "#fff",
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 24,
          fontVariantNumeric: "tabular-nums",
          color: tone || "var(--ink)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--ink-muted)", marginTop: 5, lineHeight: 1.3 }}>
        {label}
      </div>
    </div>
  );
}

const jobStatusColor = {
  confirmed: "var(--success)",
  attention: "var(--attention)",
};

const jobStatus = {
  confirmed: { label: "Confirmed", color: "var(--success)", bg: "var(--success-bg)", Icon: CheckCircle2 },
  attention: { label: "Attention", color: "var(--attention)", bg: "var(--attention-bg)", Icon: Clock },
};

export default function RaltoTodayApp() {
  const [attention, setAttention] = useState(INITIAL_ATTENTION);

  const shortfall = attention.reduce((s, a) => s + a.fillsShortfall, 0);
  const confirmed = TOTAL_CREW - shortfall;

  const resolve = (id) => {
    setAttention((prev) => prev.filter((a) => a.id !== id));
  };

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
          --track: #F1F0EE;
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
          <div style={{ padding: "20px 20px 4px" }}>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-muted)" }}>
              Good morning, Jordan
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 24, color: "var(--ink)" }}>
              Today
            </div>
          </div>

          <div style={{ display: "flex", padding: "18px 20px", gap: 8 }}>
            <StatBlock value={JOBS_LIVE} label="Jobs live" />
            <StatBlock value={TOTAL_CREW} label="Crew working" />
            <StatBlock
              value={confirmed}
              label="Confirmed & ready"
              tone={confirmed === TOTAL_CREW ? "var(--success)" : "var(--attention)"}
            />
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
            <div
              style={{
                margin: "10px 20px 0",
                padding: "22px 16px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: "var(--success-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check size={16} color="var(--success)" />
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
                All crew covered
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)" }}>
                No action required.
              </div>
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
                  {/* Client colour — left-edge stripe, derived from
                      Client.brand_color_hex per the schema addendum. */}
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-body)",
                          fontWeight: 600,
                          fontSize: 14,
                          color: "var(--ink)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {job.name}
                      </div>
                    </div>
                    {/* Status — icon inside a tinted dot, never colour alone. */}
                    <div
                      style={{
                        flexShrink: 0,
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: s.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <StatusIcon size={13} color={s.color} strokeWidth={2.5} />
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontWeight: 600,
                      fontSize: 12,
                      color: s.color,
                      marginTop: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
                    {job.detail}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ height: 40 }} />
        </div>
      </div>
    </div>
  );
}
