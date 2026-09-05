import { useState, useMemo } from "react";
import { Search, ChevronLeft, Check, CheckCircle2, Clock, AlertTriangle, Minus, MapPin, Phone, CalendarDays, Send, Star } from "lucide-react";

// ---------------------------------------------------------------------------
// Mock data. Job-level totals are deliberately NOT stored — they're derived
// from the roles array everywhere they're used, same as the data-model spec
// calls for (crewing completeness is always computed, never cached as truth).
//
// clientColor: per the schema addendum, colour is derived from the Client's
// brand colour (Client.brand_color_hex), inherited by the Job unless
// overridden. Real broadcast clients tend to have a recognisable colour —
// used here so schedulers can identify a job by client at a glance, the same
// way they already do mentally. Clients without a strong brand fall back to
// the Ralto accent (see "marathon" below).
// ---------------------------------------------------------------------------

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
    clientColor: "var(--primary)", // no strong client brand — falls back to Ralto accent
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

// A general crew pool per role — not job-specific, same as a real directory
// would be. Availability/conflict notes are what make someone unsuitable for
// a particular job, not the role list itself.
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

function JobRow({ job, onOpen }) {
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
        background: "#fff",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: "12px 14px 12px 18px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        overflow: "hidden",
      }}
    >
      {/* Client colour — left-edge stripe, derived from Client.brand_color_hex. */}
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
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              fontSize: 14.5,
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
              fontFamily: "var(--font-body)",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 600,
              fontSize: 13,
              color: u.color,
              flexShrink: 0,
            }}
          >
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
      {/* Status — icon inside a tinted dot, never colour alone. */}
      <div
        style={{
          flexShrink: 0,
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: u.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <StatusIcon size={14} color={u.color} strokeWidth={2.5} />
      </div>
    </button>
  );
}

function RoleRow({ role, onOpen }) {
  const unfilled = role.required - role.confirmed - role.offered;
  const pct = (role.confirmed / role.required) * 100;
  const complete = unfilled <= 0;
  const StatusIcon = complete ? CheckCircle2 : role.offered > 0 ? Clock : AlertTriangle;
  const statusColor = complete ? "var(--success)" : "var(--attention)";
  const statusBg = complete ? "var(--success-bg)" : "var(--attention-bg)";
  return (
    <button
      onClick={() => onOpen(role)}
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
        gap: 10,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{role.role}</span>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontVariantNumeric: "tabular-nums",
              fontSize: 13,
              fontWeight: 600,
              color: unfilled > 0 ? "var(--attention)" : "var(--ink-muted)",
            }}
          >
            {role.confirmed}/{role.required}
          </span>
        </div>
        <div style={{ height: 5, borderRadius: 999, background: "var(--track)", overflow: "hidden", marginTop: 8 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: unfilled > 0 ? "var(--attention)" : "var(--success)" }} />
        </div>
        {role.offered > 0 && (
          <div style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--attention)", marginTop: 6 }}>
            {role.offered} offered
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

function JobOverview({ job, onBack, onOffer }) {
  const { required, confirmed, unfilled } = totals(job);
  const u = urgency(job);
  const [roleDetail, setRoleDetail] = useState(null); // { mode, role }

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
          <RoleRow key={r.role} role={r} onOpen={openRole} />
        ))}
      </div>

      <div style={{ margin: "18px 20px 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-muted)", lineHeight: 1.5 }}>
        Tap a role to find crew for open positions, or see who's already assigned.
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}

// ---------------------------------------------------------------------------

const FILTERS = [
  { key: "all", label: "All" },
  { key: "attention", label: "Attention" },
  { key: "complete", label: "Complete" },
];

export default function RaltoJobsApp() {
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [openJobId, setOpenJobId] = useState(null);

  const openJob = jobs.find((j) => j.id === openJobId) || null;

  const handleOffer = (roleName) => {
    if (!openJobId) return;
    setJobs((prev) =>
      prev.map((j) =>
        j.id === openJobId
          ? { ...j, roles: j.roles.map((r) => (r.role === roleName ? { ...r, offered: r.offered + 1 } : r)) }
          : j
      )
    );
  };

  const filtered = useMemo(() => {
    let list = jobs.filter(
      (j) => j.name.toLowerCase().includes(query.toLowerCase()) || j.client.toLowerCase().includes(query.toLowerCase())
    );
    if (filter === "attention") {
      list = list.filter((j) => ["critical", "attention"].includes(urgency(j).tier));
    } else if (filter === "complete") {
      list = list.filter((j) => urgency(j).tier === "complete");
    }
    const rank = { critical: 0, attention: 1, quiet: 2, complete: 3 };
    return [...list].sort((a, b) => rank[urgency(a).tier] - rank[urgency(b).tier]);
  }, [jobs, query, filter]);

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
          {openJob ? (
            <JobOverview job={openJob} onBack={() => setOpenJobId(null)} onOffer={handleOffer} />
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
