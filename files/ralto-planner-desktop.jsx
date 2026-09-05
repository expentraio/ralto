import { useState } from "react";
import {
  LayoutDashboard,
  Briefcase,
  CalendarRange,
  Users,
  Settings,
  Star,
  Check,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens — identical to ralto-today-desktop.jsx / ralto-jobs-desktop.jsx.
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { key: "today", label: "Today", icon: LayoutDashboard },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "planner", label: "Planner", icon: CalendarRange },
  { key: "crew", label: "Crew", icon: Users },
];

const JOBS = {
  ufc327: {
    id: "ufc327",
    name: "UFC 327",
    clientColor: "#F4511E",
    subtitle: "Las Vegas · 14–19 Nov",
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
    id: "clfinal",
    name: "Champions League Final",
    clientColor: "#1B3A8C",
    subtitle: "Munich · 22 May",
    requirements: [
      { role: "Camera", required: 10, confirmed: 10, offered: 0 },
      { role: "Audio", required: 8, confirmed: 8, offered: 0 },
      { role: "EVS", required: 12, confirmed: 12, offered: 0 },
      { role: "Utilities", required: 12, confirmed: 12, offered: 0 },
    ],
  },
  riyadh: {
    id: "riyadh",
    name: "Riyadh Boxing",
    clientColor: "#006C35",
    subtitle: "Kingdom Arena · 3–10 Dec",
    requirements: [
      { role: "Audio", required: 10, confirmed: 6, offered: 0 },
      { role: "EVS", required: 15, confirmed: 12, offered: 0 },
      { role: "Utilities", required: 10, confirmed: 8, offered: 0 },
    ],
  },
};

const CANDIDATES = {
  EVS: {
    suitable: [
      { name: "Sam Ortiz", base: "Las Vegas", status: "Preferred", rate: "$650/day" },
      { name: "Priya Nandan", base: "Los Angeles", status: "Approved", rate: "$600/day" },
    ],
    possible: [
      { name: "Jon Butler", base: "Denver", status: "Approved", note: "Long travel — arrives late on call day" },
    ],
    unavailable: [
      { name: "Elle Fischer", reason: "Marked unavailable these dates" },
      { name: "Rob Cole", reason: "Conflict — booked on Champions League Final" },
    ],
  },
};

// ---------------------------------------------------------------------------

function completeness(reqs) {
  const required = reqs.reduce((s, r) => s + r.required, 0);
  const confirmed = reqs.reduce((s, r) => s + r.confirmed, 0);
  return { required, confirmed };
}

function Sidebar({ active }) {
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
            <div
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 8,
                background: isActive ? "var(--primary-tint)" : "transparent",
                color: isActive ? "var(--primary)" : "var(--ink-muted)",
                fontFamily: "var(--font)",
                fontWeight: isActive ? 600 : 500,
                fontSize: 13.5,
              }}
            >
              <Icon size={16} />
              {item.label}
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, color: "var(--ink-muted)", fontFamily: "var(--font)", fontWeight: 500, fontSize: 13.5 }}>
        <Settings size={16} />
        Settings
      </div>
    </div>
  );
}

function JobChip({ job, active, onClick }) {
  const { required, confirmed } = completeness(job.requirements);
  const complete = confirmed === required;
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        background: active ? "var(--primary-tint)" : "#fff",
        border: active ? "1px solid var(--primary-soft)" : "1px solid var(--line)",
        borderRadius: 12,
        padding: "10px 16px 10px 20px",
        textAlign: "left",
        cursor: "pointer",
        minWidth: 168,
        overflow: "hidden",
      }}
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
      style={{
        width: "100%",
        textAlign: "left",
        background: active ? "var(--primary-tint)" : "#fff",
        border: active ? "1px solid var(--primary-soft)" : "1px solid var(--line)",
        borderRadius: 12,
        padding: "12px 14px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
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

export default function PlannerDesktop() {
  const [jobId, setJobId] = useState("ufc327");
  const [jobsState, setJobsState] = useState(JOBS);
  const job = jobsState[jobId];
  const [activeRole, setActiveRole] = useState(job.requirements.find((r) => r.required - r.confirmed - r.offered > 0) || job.requirements[0]);

  const pool = CANDIDATES[activeRole?.role] || { suitable: [], possible: [], unavailable: [] };

  const handleOffer = (name) => {
    setJobsState((prev) => {
      const next = { ...prev };
      next[jobId] = {
        ...next[jobId],
        requirements: next[jobId].requirements.map((r) => (r.role === activeRole.role ? { ...r, offered: r.offered + 1 } : r)),
      };
      return next;
    });
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
      `}</style>

      <div style={{ width: 1240, height: 800, background: "var(--surface)", borderRadius: 16, border: "1px solid var(--line)", boxShadow: "0 30px 60px rgba(23,21,31,0.20)", overflow: "hidden", display: "flex" }}>
        <Sidebar active="planner" />

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          <div style={{ fontFamily: "var(--font)", fontWeight: 700, fontSize: 24, color: "var(--ink)", marginBottom: 16 }}>
            Planner
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 24, overflowX: "auto" }}>
            {Object.values(jobsState).map((j) => (
              <JobChip key={j.id} job={j} active={j.id === jobId} onClick={() => { setJobId(j.id); setActiveRole(jobsState[j.id].requirements[0]); }} />
            ))}
          </div>

          <div style={{ display: "flex", gap: 24 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 14, color: "var(--ink-muted)", marginBottom: 12 }}>
                Roles — {job.name}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {job.requirements.map((r) => (
                  <RequirementRow key={r.role} req={r} active={r.role === activeRole.role} onOpen={setActiveRole} />
                ))}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font)", fontWeight: 600, fontSize: 14, color: "var(--ink-muted)", marginBottom: 12 }}>
                Crew matching — {activeRole?.role}
              </div>
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
                        onClick={() => handleOffer(c.name)}
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
      </div>
    </div>
  );
}
