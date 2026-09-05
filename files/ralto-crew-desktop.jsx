import { useState, useMemo } from "react";
import {
  LayoutDashboard,
  Briefcase,
  CalendarRange,
  Users,
  Settings,
  Search,
  Star,
  MapPin,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens — identical to the other desktop screens.
//
// Note: this is the SCHEDULER's people directory (roster, roles,
// availability at a glance) — not the same thing as ralto-crew-mobile.jsx,
// which is the field crew member's own personal app. Same nav label
// ("Crew") but a different audience and purpose, per the suite dashboard
// mockup's nav structure.
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { key: "today", label: "Today", icon: LayoutDashboard },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "planner", label: "Planner", icon: CalendarRange },
  { key: "crew", label: "Crew", icon: Users },
];

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

const STATUS = {
  booked: { label: "Booked", color: "var(--primary)", bg: "var(--primary-tint)" },
  available: { label: "Available", color: "var(--success)", bg: "var(--success-bg)" },
  pending: { label: "Pending", color: "var(--attention)", bg: "var(--attention-bg)" },
  unavailable: { label: "Unavailable", color: "var(--ink-muted)", bg: "var(--track)" },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "booked", label: "Booked" },
  { key: "pending", label: "Pending" },
];

function Sidebar({ active }) {
  return (
    <div style={{ width: 232, flexShrink: 0, background: "#fff", borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", padding: "24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px", marginBottom: 4 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ width: 20, height: 4, borderRadius: 2, background: "var(--primary)" }} />
          <div style={{ width: 15, height: 4, borderRadius: 2, background: "var(--primary)" }} />
          <div style={{ width: 10, height: 4, borderRadius: 2, background: "var(--primary)" }} />
        </div>
        <span style={{ fontFamily: "var(--font)", fontWeight: 700, fontSize: 16, color: "var(--ink)", letterSpacing: 0.2 }}>RALTO</span>
      </div>
      <div style={{ fontFamily: "var(--font)", fontSize: 12, color: "var(--ink-muted)", padding: "4px 8px 24px", lineHeight: 1.4 }}>
        Crewing, simplified.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === active;
          return (
            <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, background: isActive ? "var(--primary-tint)" : "transparent", color: isActive ? "var(--primary)" : "var(--ink-muted)", fontFamily: "var(--font)", fontWeight: isActive ? 600 : 500, fontSize: 13.5 }}>
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

function PersonCard({ person }) {
  const s = STATUS[person.status];
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

export default function CrewDesktop() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = PEOPLE.filter(
      (p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.role.toLowerCase().includes(query.toLowerCase())
    );
    if (filter !== "all") list = list.filter((p) => p.status === filter);
    return list;
  }, [query, filter]);

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

      <div style={{ width: 1240, height: 800, background: "var(--surface)", borderRadius: 16, border: "1px solid var(--line)", boxShadow: "0 30px 60px rgba(23,21,31,0.20)", overflow: "hidden", display: "flex" }}>
        <Sidebar active="crew" />

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
            {FILTERS.map((f) => {
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
      </div>
    </div>
  );
}
