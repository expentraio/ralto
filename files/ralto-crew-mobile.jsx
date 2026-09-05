import { useState } from "react";
import {
  Home as HomeIcon,
  CalendarDays,
  CalendarCheck,
  User,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Plane,
  BedDouble,
  FileText,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Mock data — stands in for what the API would return for the logged-in crew
// member. Shaped loosely around the Ralto data model (Booking, Job, etc).
// ---------------------------------------------------------------------------

const CREW_MEMBER = { name: "Maya Chen", role: "EVS Operator", base: "London" };

const NEXT_JOB = {
  id: "job-ufc327",
  name: "UFC 327 — Las Vegas",
  role: "EVS Operator",
  day: "Thu 17 Nov",
  callTime: "07:00",
  venue: "T-Mobile Arena",
  status: "confirmed",
  client: "TNT Sports",
  clientColor: "#F4511E", // matches TNT Sports across every Ralto screen
  contact: { name: "Dana Whitfield", role: "Production Manager", phone: "+1 702 555 0148" },
  location: "T-Mobile Arena, 3780 S Las Vegas Blvd, Las Vegas, NV",
  travel: "Flight UA 2201 · arrives 16 Nov, 18:40 · hotel transfer arranged",
  hotel: "Park MGM · check-in 16 Nov · check-out 20 Nov",
  documents: ["Site access pass", "Broadcast credential"],
  notes: "Load-in via loading dock C. Ask for Dana on arrival for badge collection.",
};

const INITIAL_OFFERS = [
  {
    id: "offer-riyadh",
    job: "Riyadh Boxing",
    role: "Audio",
    dates: "3–10 Dec",
    venue: "Kingdom Arena, Riyadh",
    status: "pending",
  },
];

const INITIAL_ALERTS = [
  {
    id: "alert-cl-final",
    job: "Champions League Final",
    text: "Call time moved from 05:30 to 06:00",
    acknowledged: false,
  },
];

const UPCOMING = [
  { id: "job-cl-final", name: "Champions League Final", clientColor: "#1B3A8C", day: "Sat 22 Nov", status: "confirmed" },
  { id: "job-riyadh", name: "Riyadh Boxing", clientColor: "#006C35", day: "3–10 Dec", status: "pending" },
];

const AVAILABILITY_REQUEST = {
  id: "avail-abudhabi",
  window: "20–27 October",
  location: "Abu Dhabi",
};

// ---------------------------------------------------------------------------

const statusStyle = {
  confirmed: { color: "var(--success)", bg: "var(--success-bg)", label: "Confirmed", Icon: CheckCircle2 },
  pending: { color: "var(--attention)", bg: "var(--attention-bg)", label: "Awaiting response", Icon: Clock },
  declined: { color: "var(--danger)", bg: "var(--danger-bg)", label: "Declined", Icon: X },
};

function StatusPill({ status }) {
  const s = statusStyle[status];
  return (
    <span
      style={{
        color: s.color,
        background: s.bg,
        fontFamily: "var(--font-body)",
        fontWeight: 600,
        fontSize: 12,
        padding: "4px 10px",
        borderRadius: 999,
        letterSpacing: 0.1,
      }}
    >
      {s.label}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-body)",
        fontWeight: 600,
        fontSize: 13,
        color: "var(--ink-muted)",
        margin: "28px 20px 10px",
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--line)", margin: "0 20px" }} />;
}

// ---------------------------------------------------------------------------

function HomeScreen({ offers, setOffers, alerts, setAlerts, onOpenJob }) {
  const respond = (id, decision) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: decision, responding: false } : o))
    );
  };

  const startResponding = (id) => {
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, responding: true } : o)));
  };

  const acknowledge = (id) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  };

  const visibleOffers = offers.filter((o) => o.status === "pending");
  const visibleAlerts = alerts.filter((a) => !a.acknowledged);
  const attentionCount = visibleOffers.length + visibleAlerts.length;

  return (
    <div>
      <div style={{ padding: "22px 20px 4px" }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-muted)" }}>
          Good morning
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 22,
            color: "var(--ink)",
          }}
        >
          {CREW_MEMBER.name}
        </div>
      </div>

      {/* Next job hero — wrapped as a bordered card (the confirmed "card"
          treatment), with the client colour as a full-height left-edge
          stripe since this is the single most important card on the screen. */}
      <div style={{ padding: "0 20px 20px" }}>
        <div
          style={{
            position: "relative",
            border: "1px solid var(--line)",
            borderRadius: 16,
            padding: "18px 18px 18px 24px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 6,
              background: NEXT_JOB.clientColor,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  color: "var(--ink-muted)",
                  marginBottom: 8,
                }}
              >
                Next job
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: 22,
                  lineHeight: 1.2,
                  color: "var(--ink)",
                }}
              >
                {NEXT_JOB.name}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 14.5,
                  color: "var(--ink-muted)",
                  marginTop: 4,
                }}
              >
                {NEXT_JOB.client} · {NEXT_JOB.role}
              </div>
            </div>
            {/* Status — icon inside a tinted dot, never colour alone. The
                text pill below still carries the full label. */}
            <div
              style={{
                flexShrink: 0,
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: statusStyle[NEXT_JOB.status].bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {(() => {
                const Icon = statusStyle[NEXT_JOB.status].Icon;
                return <Icon size={15} color={statusStyle[NEXT_JOB.status].color} strokeWidth={2.5} />;
              })()}
            </div>
          </div>

          <div style={{ display: "flex", gap: 18, marginTop: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-muted)" }}>
                Call time
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 600,
                  fontSize: 17,
                  color: "var(--ink)",
                }}
              >
                {NEXT_JOB.day} · {NEXT_JOB.callTime}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-muted)" }}>
                Venue
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: 17,
                  color: "var(--ink)",
                }}
              >
                {NEXT_JOB.venue}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
            <StatusPill status={NEXT_JOB.status} />
          </div>

          <button
            onClick={() => onOpenJob(NEXT_JOB)}
            style={{
              marginTop: 18,
              width: "100%",
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "13px 0",
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            View details <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Needs attention */}
      {attentionCount > 0 && (
        <>
          <SectionLabel>Needs your attention</SectionLabel>
          <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            {visibleOffers.map((offer) => (
              <div
                key={offer.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  padding: 16,
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 999,
                      background: "var(--attention-bg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Bell size={15} color="var(--attention)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontWeight: 600,
                        fontSize: 15,
                        color: "var(--ink)",
                      }}
                    >
                      {offer.job}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: 13,
                        color: "var(--ink-muted)",
                        marginTop: 2,
                      }}
                    >
                      {offer.role} · {offer.dates}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: 13,
                        color: "var(--ink-muted)",
                      }}
                    >
                      {offer.venue}
                    </div>
                  </div>
                </div>

                {!offer.responding ? (
                  <button
                    onClick={() => startResponding(offer.id)}
                    style={{
                      marginTop: 12,
                      width: "100%",
                      background: "var(--ink)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 0",
                      fontFamily: "var(--font-body)",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    Respond
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <button
                      onClick={() => respond(offer.id, "declined")}
                      style={{
                        flex: 1,
                        background: "#fff",
                        color: "var(--danger)",
                        border: "1px solid var(--danger)",
                        borderRadius: 10,
                        padding: "10px 0",
                        fontFamily: "var(--font-body)",
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <X size={15} /> Decline
                    </button>
                    <button
                      onClick={() => respond(offer.id, "confirmed")}
                      style={{
                        flex: 1,
                        background: "var(--success)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 10,
                        padding: "10px 0",
                        fontFamily: "var(--font-body)",
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <Check size={15} /> Accept
                    </button>
                  </div>
                )}
              </div>
            ))}

            {visibleAlerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  padding: 16,
                  background: "#fff",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    background: "var(--attention-bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Bell size={15} color="var(--attention)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontWeight: 600,
                      fontSize: 15,
                      color: "var(--ink)",
                    }}
                  >
                    {alert.job}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 13,
                      color: "var(--ink-muted)",
                      marginTop: 2,
                    }}
                  >
                    {alert.text}
                  </div>
                </div>
                <button
                  onClick={() => acknowledge(alert.id)}
                  style={{
                    background: "none",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontFamily: "var(--font-body)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--ink-muted)",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Got it
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Upcoming */}
      <SectionLabel>Upcoming</SectionLabel>
      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {UPCOMING.map((job) => {
          const s = statusStyle[job.status];
          const StatusIcon = s.Icon;
          return (
            <div
              key={job.id}
              style={{
                position: "relative",
                border: "1px solid var(--line)",
                borderRadius: 12,
                background: "#fff",
                padding: "12px 14px 12px 18px",
                overflow: "hidden",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
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
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    fontSize: 15,
                    color: "var(--ink)",
                  }}
                >
                  {job.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 13,
                    color: "var(--ink-muted)",
                  }}
                >
                  {job.day}
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
          );
        })}
      </div>
      <div style={{ height: 90 }} />
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "flex", gap: 14, padding: "16px 20px" }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "var(--tint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={16} color="var(--primary)" />
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-muted)" }}>
          {label}
        </div>
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 14.5,
            color: "var(--ink)",
            marginTop: 2,
            lineHeight: 1.4,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function JobDetailScreen({ job, onBack }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "18px 20px 6px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            marginLeft: -4,
            color: "var(--ink)",
          }}
        >
          <ChevronLeft size={22} />
        </button>
      </div>

      <div style={{ padding: "6px 20px 16px" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 22,
            color: "var(--ink)",
            lineHeight: 1.2,
          }}
        >
          {job.name}
        </div>
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "var(--ink-muted)",
            marginTop: 4,
          }}
        >
          {job.role} · {job.client}
        </div>
        <div style={{ marginTop: 10 }}>
          <StatusPill status={job.status} />
        </div>
      </div>

      <Divider />
      <Row icon={CalendarDays} label="Call" value={`${job.day} · ${job.callTime}`} />
      <Divider />
      <Row icon={MapPin} label="Location" value={job.location} />
      <Divider />
      <Row icon={Phone} label="Production contact" value={`${job.contact.name} · ${job.contact.role} · ${job.contact.phone}`} />
      <Divider />
      <Row icon={Plane} label="Travel" value={job.travel} />
      <Divider />
      <Row icon={BedDouble} label="Hotel" value={job.hotel} />
      <Divider />
      <Row icon={FileText} label="Documents" value={job.documents.join(" · ")} />
      <Divider />
      <Row icon={Bell} label="Notes" value={job.notes} />

      <div style={{ height: 40 }} />
    </div>
  );
}

function AvailabilityScreen() {
  const [answered, setAnswered] = useState(false);
  const [choice, setChoice] = useState(null);

  const choose = (val) => {
    setChoice(val);
    setAnswered(true);
  };

  return (
    <div style={{ padding: "22px 20px" }}>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 20,
          color: "var(--ink)",
        }}
      >
        Availability
      </div>
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 14,
          color: "var(--ink-muted)",
          marginTop: 4,
        }}
      >
        One request waiting on you
      </div>

      <div
        style={{
          marginTop: 20,
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: 18,
          background: "#fff",
        }}
      >
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-muted)" }}>
          {AVAILABILITY_REQUEST.location}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 18,
            color: "var(--ink)",
            marginTop: 2,
          }}
        >
          {AVAILABILITY_REQUEST.window}
        </div>
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "var(--ink-muted)",
            marginTop: 6,
          }}
        >
          Are you available?
        </div>

        {!answered ? (
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {[
              { key: "yes", label: "Yes" },
              { key: "partial", label: "Partially" },
              { key: "no", label: "No" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => choose(opt.key)}
                style={{
                  flex: 1,
                  background: opt.key === "yes" ? "var(--primary)" : "#fff",
                  color: opt.key === "yes" ? "#fff" : "var(--ink)",
                  border: opt.key === "yes" ? "none" : "1px solid var(--line)",
                  borderRadius: 10,
                  padding: "10px 0",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <div
            style={{
              marginTop: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--success)",
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            <Check size={16} />
            Sent — thanks, {CREW_MEMBER.name.split(" ")[0]}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 24,
          fontFamily: "var(--font-body)",
          fontSize: 13,
          color: "var(--ink-muted)",
          lineHeight: 1.5,
        }}
      >
        No other requests right now. When one comes in, it'll show here — a
        one-tap answer, nothing to fill in.
      </div>
    </div>
  );
}

function ProfileScreen() {
  return (
    <div style={{ padding: "22px 20px" }}>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 20,
          color: "var(--ink)",
        }}
      >
        {CREW_MEMBER.name}
      </div>
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 14,
          color: "var(--ink-muted)",
          marginTop: 4,
        }}
      >
        {CREW_MEMBER.role} · Based in {CREW_MEMBER.base}
      </div>

      <SectionLabelInline>Documents</SectionLabelInline>
      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <Row icon={FileText} label="Broadcast credential" value="Valid to Mar 2027" />
        <Divider />
        <Row icon={FileText} label="US work visa (P-1)" value="Valid to Aug 2027" />
      </div>
    </div>
  );
}

function SectionLabelInline({ children }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-body)",
        fontWeight: 600,
        fontSize: 13,
        color: "var(--ink-muted)",
        margin: "24px 0 10px",
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function RaltoCrewApp() {
  const [tab, setTab] = useState("home");
  const [screen, setScreen] = useState({ name: "home" });
  const [offers, setOffers] = useState(INITIAL_OFFERS);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);

  const pendingCount =
    offers.filter((o) => o.status === "pending").length +
    alerts.filter((a) => !a.acknowledged).length;

  const goTab = (t) => {
    setTab(t);
    setScreen({ name: t });
  };

  let body;
  if (screen.name === "jobDetail") {
    body = <JobDetailScreen job={screen.job} onBack={() => setScreen({ name: "home" })} />;
  } else if (tab === "home") {
    body = (
      <HomeScreen
        offers={offers}
        setOffers={setOffers}
        alerts={alerts}
        setAlerts={setAlerts}
        onOpenJob={(job) => setScreen({ name: "jobDetail", job })}
      />
    );
  } else if (tab === "availability") {
    body = <AvailabilityScreen />;
  } else if (tab === "profile") {
    body = <ProfileScreen />;
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
          --line: #E7E5E2;
          --success: #3F8F6D;
          --success-bg: #EAF4EF;
          --attention: #C98A2B;
          --attention-bg: #FBF1E1;
          --danger: #B5473C;
          --danger-bg: #F8EBE9;
        }
      `}</style>

      {/* Phone frame */}
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
        {/* Status bar */}
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

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto" }}>{body}</div>

        {/* Bottom tab bar */}
        <div
          style={{
            display: "flex",
            borderTop: "1px solid var(--line)",
            background: "#fff",
            padding: "10px 0 16px",
          }}
        >
          {[
            { key: "home", icon: HomeIcon, label: "Home" },
            { key: "availability", icon: CalendarCheck, label: "Availability" },
            { key: "profile", icon: User, label: "Profile" },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.key && screen.name !== "jobDetail" ? tab === t.key : tab === t.key;
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => goTab(t.key)}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  position: "relative",
                }}
              >
                <Icon size={20} color={isActive ? "var(--primary)" : "var(--ink-muted)"} />
                {t.key === "home" && pendingCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -2,
                      right: "calc(50% - 14px)",
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: "var(--danger)",
                    }}
                  />
                )}
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: isActive ? "var(--primary)" : "var(--ink-muted)",
                  }}
                >
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
