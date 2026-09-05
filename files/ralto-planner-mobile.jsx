import { useState } from "react";
import {
  ChevronLeft,
  Search,
  MapPin,
  Star,
  Users,
  LayoutGrid,
  Send,
  Check,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const JOBS = {
  ufc327: {
    id: "ufc327",
    name: "UFC 327",
    clientColor: "#F4511E", // TNT Sports
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
    clientColor: "#1B3A8C", // UEFA Broadcast Services
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
    clientColor: "#006C35", // Kingdom Sports Group
    subtitle: "Kingdom Arena · 3–10 Dec",
    requirements: [
      { role: "Audio", required: 10, confirmed: 6, offered: 0 },
      { role: "EVS", required: 15, confirmed: 12, offered: 0 },
      { role: "Utilities", required: 10, confirmed: 8, offered: 0 },
    ],
  },
};

// Candidate pools — only fleshed out for roles with real gaps, so the
// matching workflow has something to show.
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
  Utilities: {
    suitable: [
      { name: "Marcus Webb", base: "Las Vegas", status: "Approved", rate: "$420/day" },
    ],
    possible: [
      { name: "Dana Reyes", base: "Phoenix", status: "Standard", note: "3hr drive to venue" },
    ],
    unavailable: [
      { name: "Ivy Chen", reason: "Conflict — booked on Riyadh Boxing" },
    ],
  },
};

const ASSIGNED = {
  EIC: ["Frank Ozuna", "Lena Marsh"],
  Guarantee: ["Theo Banks", "Carla Diaz", "Will Hunt"],
  Audio: ["Nadia Slate", "Omar Faris", "Kelly Munro", "Theo Banks", "Sam Ortiz", "Priya Nandan"],
  Riggers: ["Jed Cross", "Al Osei", "Mira Voss", "Tom Reilly", "Dee Park"],
};

// ---------------------------------------------------------------------------

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
      style={{
        position: "relative",
        flexShrink: 0,
        background: active ? "var(--primary)" : "#fff",
        border: active ? "none" : "1px solid var(--line)",
        borderRadius: 14,
        padding: "10px 14px 10px 18px",
        textAlign: "left",
        cursor: "pointer",
        minWidth: 148,
        overflow: "hidden",
      }}
    >
      {/* Client colour — left-edge stripe. Shown against the active chip's
          filled background too (as a lighter inset bar) so identity doesn't
          disappear the moment a job is selected. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 5,
          background: job.clientColor,
          opacity: active ? 0.85 : 1,
        }}
      />
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontWeight: 600,
          fontSize: 13.5,
          color: active ? "#fff" : "var(--ink)",
        }}
      >
        {job.name}
      </div>
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontVariantNumeric: "tabular-nums",
          fontSize: 12,
          marginTop: 3,
          color: active ? "rgba(255,255,255,0.85)" : complete ? "var(--success)" : "var(--attention)",
          fontWeight: 600,
        }}
      >
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
      style={{
        width: "100%",
        textAlign: "left",
        background: "#fff",
        border: "1px solid var(--line)",
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
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              fontSize: 15,
              color: "var(--ink)",
            }}
          >
            {req.role}
          </span>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontVariantNumeric: "tabular-nums",
              fontSize: 13,
              color: unfilled > 0 ? "var(--attention)" : "var(--ink-muted)",
              fontWeight: 600,
            }}
          >
            {req.confirmed}/{req.required}
          </span>
        </div>

        <div
          style={{
            marginTop: 8,
            height: 6,
            borderRadius: 999,
            background: "var(--track)",
            overflow: "hidden",
            display: "flex",
          }}
        >
          <div style={{ width: `${pctConfirmed}%`, background: "var(--success)" }} />
          <div style={{ width: `${pctOffered}%`, background: "var(--attention)" }} />
        </div>

        {unfilled > 0 && (
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 12.5,
              color: "var(--attention)",
              marginTop: 6,
            }}
          >
            {unfilled} unfilled{req.offered > 0 ? ` · ${req.offered} offered` : ""}
          </div>
        )}
      </div>
      {/* Status — icon inside a tinted dot, never colour alone. */}
      <div
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: statusBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <StatusIcon size={13} color={statusColor} strokeWidth={2.5} />
      </div>
    </button>
  );
}

function CandidateGroup({ title, tone, children }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 20px",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: tone,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: 13,
            color: "var(--ink-muted)",
          }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function MatchingScreen({ job, req, onBack, onOffer }) {
  const pool = CANDIDATES[req.role] || { suitable: [], possible: [], unavailable: [] };
  const [offered, setOffered] = useState([]);

  const sendOffer = (name) => {
    setOffered((prev) => [...prev, name]);
    onOffer(req.role);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 20px 6px" }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, marginLeft: -4, color: "var(--ink)" }}
        >
          <ChevronLeft size={22} />
        </button>
      </div>

      <div style={{ padding: "4px 20px 14px" }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)" }}>
          {job.name}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 21,
            color: "var(--ink)",
          }}
        >
          Find {req.role}
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)", marginTop: 2 }}>
          {req.required - req.confirmed - req.offered - offered.length} position
          {req.required - req.confirmed - req.offered - offered.length === 1 ? "" : "s"} still open
        </div>
      </div>

      <CandidateGroup title="Available & suitable" tone="var(--success)">
        {pool.suitable.map((c) => (
          <div
            key={c.name}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 20px",
              borderTop: "1px solid var(--line)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>
                  {c.name}
                </span>
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
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 9,
                  padding: "7px 12px",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: 12.5,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Send size={12} /> Offer
              </button>
            )}
          </div>
        ))}
        {pool.suitable.length === 0 && (
          <div style={{ padding: "0 20px", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)" }}>
            No one in this group right now.
          </div>
        )}
      </CandidateGroup>

      <CandidateGroup title="Possible" tone="var(--attention)">
        {pool.possible.map((c) => (
          <div
            key={c.name}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 20px",
              borderTop: "1px solid var(--line)",
            }}
          >
            <div>
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>
                {c.name}
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-muted)", marginTop: 2 }}>
                {c.base} · {c.status}
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--attention)", marginTop: 2 }}>
                {c.note}
              </div>
            </div>
            {offered.includes(c.name) ? (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 600, color: "var(--success)" }}>
                <Check size={14} /> Offered
              </span>
            ) : (
              <button
                onClick={() => sendOffer(c.name)}
                style={{
                  background: "#fff",
                  color: "var(--ink)",
                  border: "1px solid var(--line)",
                  borderRadius: 9,
                  padding: "7px 12px",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: 12.5,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Offer
              </button>
            )}
          </div>
        ))}
      </CandidateGroup>

      <CandidateGroup title="Unavailable / conflicted" tone="var(--danger)">
        {pool.unavailable.map((c) => (
          <div
            key={c.name}
            style={{
              padding: "12px 20px",
              borderTop: "1px solid var(--line)",
              opacity: 0.6,
            }}
          >
            <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>
              {c.name}
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-muted)", marginTop: 2 }}>
              {c.reason}
            </div>
          </div>
        ))}
      </CandidateGroup>

      <div style={{ height: 40 }} />
    </div>
  );
}

function AssignedScreen({ job, req, onBack }) {
  const names = ASSIGNED[req.role] || [];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 20px 6px" }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, marginLeft: -4, color: "var(--ink)" }}
        >
          <ChevronLeft size={22} />
        </button>
      </div>
      <div style={{ padding: "4px 20px 14px" }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)" }}>{job.name}</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 21, color: "var(--ink)" }}>
          {req.role} — fully crewed
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--success)", marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
          <Check size={14} /> {req.confirmed}/{req.required} confirmed
        </div>
      </div>
      {names.map((name, i) => (
        <div key={name}>
          <div style={{ padding: "13px 20px", fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--ink)" }}>
            {name}
          </div>
          {i < names.length - 1 && <div style={{ height: 1, background: "var(--line)", margin: "0 20px" }} />}
        </div>
      ))}
      <div style={{ height: 40 }} />
    </div>
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
          <div style={{ padding: "13px 20px", fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--ink)" }}>
            {name}
          </div>
          {i < unique.length - 1 && <div style={{ height: 1, background: "var(--line)", margin: "0 20px" }} />}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function RaltoPlannerApp() {
  const [jobId, setJobId] = useState("ufc327");
  const [jobsState, setJobsState] = useState(JOBS);
  const [detail, setDetail] = useState(null); // { mode: 'match'|'assigned', req }
  const [view, setView] = useState("roles");

  const job = jobsState[jobId];
  const { required, confirmed, unfilled } = completeness(job.requirements);

  const openRequirement = (req) => {
    const openSlots = req.required - req.confirmed - req.offered;
    setDetail({ mode: openSlots > 0 ? "match" : "assigned", req });
  };

  const handleOffer = (role) => {
    setJobsState((prev) => {
      const next = { ...prev };
      next[jobId] = {
        ...next[jobId],
        requirements: next[jobId].requirements.map((r) =>
          r.role === role ? { ...r, offered: r.offered + 1 } : r
        ),
      };
      return next;
    });
  };

  let body;
  if (detail?.mode === "match") {
    body = (
      <MatchingScreen
        job={job}
        req={detail.req}
        onBack={() => setDetail(null)}
        onOffer={handleOffer}
      />
    );
  } else if (detail?.mode === "assigned") {
    body = <AssignedScreen job={job} req={detail.req} onBack={() => setDetail(null)} />;
  } else {
    body = (
      <div>
        <div style={{ padding: "20px 20px 4px" }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)" }}>
            Planner
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 21, color: "var(--ink)" }}>
            {job.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: job.clientColor, flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)" }}>
              {job.subtitle}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, padding: "16px 20px 4px", overflowX: "auto" }}>
          {Object.values(jobsState).map((j) => (
            <JobChip key={j.id} job={j} active={j.id === jobId} onClick={() => { setJobId(j.id); setDetail(null); }} />
          ))}
        </div>

        <div style={{ padding: "18px 20px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 700,
                fontSize: 19,
                color: unfilled > 0 ? "var(--attention)" : "var(--success)",
              }}
            >
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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: active ? "#fff" : "none",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: active ? "var(--ink)" : "var(--ink-muted)",
                  }}
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

        <div style={{ flex: 1, overflowY: "auto" }}>{body}</div>
      </div>
    </div>
  );
}
