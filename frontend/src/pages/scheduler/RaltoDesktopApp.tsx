import { Fragment, useEffect, useMemo, useState } from 'react'
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
  LogOut,
  Plus,
  Trash2,
  Rows3,
  X,
  AlertOctagon,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useStaffAuth } from '../../context/StaffAuthContext'
import {
  useAlerts,
  useClients,
  useVenues,
  useJobSummaries,
  usePeople,
  useCandidates,
  useAvailability,
  createAvailability,
  deleteAvailability,
  useProspectiveEvents,
  createProspectiveEvent,
  dropProspectiveEvent,
  convertProspectiveEvent,
  useResourceCalendar,
  useProjects,
  useRoles,
  createJob,
  createJobRequirement,
  createJobContact,
  indexById,
  resolveAlert,
  offerBooking,
  type JobSummary,
} from '../../lib/hooks'
import type {
  AlreadyAskedEntry,
  Availability,
  AvailabilityStatus,
  AvailabilityType,
  Client,
  Job,
  JobCommitment,
  JobContact,
  JobRequirementWithCounts,
  OperationalAlert,
  Person,
  Project,
  ProspectiveEvent,
  ResourceCalendarBooking,
  ResourceCalendarRow,
  Role,
  Venue,
} from '../../types'

// ---------------------------------------------------------------------------
// Combined desktop app — merges what were ralto-today-desktop.jsx,
// ralto-jobs-desktop.jsx, ralto-planner-desktop.jsx and
// ralto-crew-desktop.jsx into one shell with a single Sidebar and real
// navigation. Design tokens and layout are unchanged from the prototype;
// every hardcoded mock constant has been replaced with live data from the
// Ralto API via src/lib/hooks.ts.
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { key: 'today', label: 'Today', icon: LayoutDashboard },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
  { key: 'team', label: 'Team', icon: Rows3 },
  { key: 'jobs', label: 'Jobs', icon: Briefcase },
  { key: 'planner', label: 'Planner', icon: CalendarRange },
  { key: 'crew', label: 'Crew', icon: Users },
] as const

type NavKey = (typeof NAV_ITEMS)[number]['key']

const FALLBACK_CLIENT_COLORS = ['#453E96', '#F4511E', '#1B3A8C', '#006C35', '#E10600', '#005C30']

function clientColor(client: Client | undefined, fallbackIndex: number): string {
  if (client?.brand_color_hex) return client.brand_color_hex
  return FALLBACK_CLIENT_COLORS[fallbackIndex % FALLBACK_CLIENT_COLORS.length]
}

// The three-tag vocabulary from addendum v2 §4 — derived, never stored.
// Cancelled beats Pencil beats Booked, and the lifecycle enum underneath
// (Draft..Complete) is untouched by this — it's a second, orthogonal axis.
function commitmentTag(job: Job): { label: string; color: string; bg: string } {
  if (job.status === 'cancelled') return { label: 'Cancelled', color: 'var(--danger)', bg: 'var(--danger-bg)' }
  if (job.commitment === 'pencil') return { label: 'Pencil', color: 'var(--primary-soft)', bg: 'var(--primary-tint)' }
  return { label: 'Booked', color: 'var(--success)', bg: 'var(--success-bg)' }
}

function CommitmentBadge({ job }: { job: Job }) {
  const tag = commitmentTag(job)
  return (
    <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 10.5, padding: '2px 8px', borderRadius: 999, color: tag.color, background: tag.bg, whiteSpace: 'nowrap' }}>
      {tag.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Shared Sidebar
// ---------------------------------------------------------------------------

function Sidebar({ active, onSelect, onOpenSuite }: { active: NavKey; onSelect: (k: NavKey) => void; onOpenSuite: () => void }) {
  const { logout } = useStaffAuth()
  return (
    <div style={{ width: 232, flexShrink: 0, background: '#fff', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', padding: '24px 16px' }}>
      <button
        onClick={onOpenSuite}
        title="Open Simplified Suite"
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 4, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ width: 20, height: 4, borderRadius: 2, background: 'var(--primary)' }} />
          <div style={{ width: 15, height: 4, borderRadius: 2, background: 'var(--primary)' }} />
          <div style={{ width: 10, height: 4, borderRadius: 2, background: 'var(--primary)' }} />
        </div>
        <span style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 16, color: 'var(--ink)', letterSpacing: 0.2 }}>RALTO</span>
      </button>
      <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'var(--ink-muted)', padding: '4px 8px 24px', lineHeight: 1.4 }}>Crewing, simplified.</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = item.key === active
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 8,
                border: 'none',
                background: isActive ? 'var(--primary-tint)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--ink-muted)',
                fontFamily: 'var(--font)',
                fontWeight: isActive ? 600 : 500,
                fontSize: 13.5,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Icon size={16} />
              {item.label}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1 }} />

      <button
        onClick={logout}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, color: 'var(--ink-muted)', fontFamily: 'var(--font)', fontWeight: 500, fontSize: 13.5, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <LogOut size={16} />
        Sign out
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, color: 'var(--ink-muted)', fontFamily: 'var(--font)', fontWeight: 500, fontSize: 13.5 }}>
        <Settings size={16} />
        Settings
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Today
// ---------------------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function isLiveToday(job: Job): boolean {
  const today = todayISO()
  return job.start_date <= today && job.end_date >= today && job.status !== 'cancelled' && job.status !== 'complete'
}

const ALERT_COPY: Record<OperationalAlert['type'], { title: string; icon: typeof Bell; tone: 'attention' | 'danger'; actionLabel: string }> = {
  missing_crew: { title: 'Position unfilled', icon: UserPlus, tone: 'danger', actionLabel: 'Find crew' },
  late_confirmation: { title: 'Late confirmation', icon: Clock, tone: 'attention', actionLabel: 'Follow up' },
  call_time_change: { title: 'Call time changed', icon: RefreshCw, tone: 'attention', actionLabel: 'Mark reviewed' },
  conflict: { title: 'Booking conflict', icon: AlertTriangle, tone: 'danger', actionLabel: 'Resolve' },
  unacknowledged_update: { title: 'Call-time change unacknowledged', icon: RefreshCw, tone: 'attention', actionLabel: 'Mark acknowledged' },
  no_show: { title: 'No-show reported', icon: AlertTriangle, tone: 'danger', actionLabel: 'Review' },
  auto_suggested_booking: { title: 'Auto-suggested booking to review', icon: Bell, tone: 'attention', actionLabel: 'Review' },
}

const toneColor = {
  attention: { fg: 'var(--attention)', bg: 'var(--attention-bg)' },
  danger: { fg: 'var(--danger)', bg: 'var(--danger-bg)' },
}

function StatCard({ value, label, tone }: { value: number; label: string; tone?: string }) {
  return (
    <div style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 12, background: '#fff', padding: '18px 20px' }}>
      <div style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 30, fontVariantNumeric: 'tabular-nums', color: tone || 'var(--ink)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font)', fontSize: 13, color: 'var(--ink-muted)', marginTop: 6 }}>{label}</div>
    </div>
  )
}

function AttentionCard({ alert, onResolve }: { alert: OperationalAlert; onResolve: (id: string) => void }) {
  const copy = ALERT_COPY[alert.type]
  const Icon = copy.icon
  const tone = toneColor[copy.tone]
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 16, background: '#fff', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 34, height: 34, borderRadius: 999, background: tone.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={tone.fg} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{copy.title}</div>
        <div style={{ fontFamily: 'var(--font)', fontSize: 13, color: 'var(--ink-muted)', marginTop: 2 }}>{alert.job_name}</div>
      </div>
      <button
        onClick={() => onResolve(alert.id)}
        style={{ flexShrink: 0, background: 'none', border: '1px solid var(--line)', borderRadius: 8, padding: '7px 12px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, color: 'var(--ink)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
      >
        {copy.actionLabel} <Check size={12} />
      </button>
    </div>
  )
}

function TodayContent({ summaries, clients, alerts, reloadAlerts }: { summaries: JobSummary[]; clients: Record<string, Client>; alerts: OperationalAlert[]; reloadAlerts: () => void }) {
  const liveSummaries = useMemo(() => summaries.filter((s) => isLiveToday(s.job)), [summaries])
  const totalRequired = liveSummaries.reduce((sum, s) => sum + s.required, 0)
  const totalConfirmed = liveSummaries.reduce((sum, s) => sum + s.confirmed, 0)

  async function resolve(id: string) {
    await resolveAlert(id)
    reloadAlerts()
  }

  const today = new Date()
  const dateLabel = today.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 32px 0' }}>
        <div>
          <div style={{ fontFamily: 'var(--font)', fontSize: 13.5, color: 'var(--ink-muted)' }}>{dateLabel}</div>
          <div style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 26, color: 'var(--ink)' }}>Today</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, padding: '24px 32px 0' }}>
        <StatCard value={liveSummaries.length} label="Jobs live" />
        <StatCard value={totalRequired} label="Crew needed" />
        <StatCard value={totalConfirmed} label="Confirmed & ready" tone={totalConfirmed === totalRequired && totalRequired > 0 ? 'var(--success)' : 'var(--attention)'} />
      </div>

      <div style={{ display: 'flex', gap: 20, padding: '28px 32px 32px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1.4 }}>
          <div style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 14, color: 'var(--ink-muted)', marginBottom: 12 }}>Needs attention</div>
          {alerts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {alerts.map((alert) => (
                <AttentionCard key={alert.id} alert={alert} onResolve={resolve} />
              ))}
            </div>
          ) : (
            <div style={{ border: '1px solid var(--line)', borderRadius: 12, background: '#fff', padding: '26px 20px', textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                <Check size={17} color="var(--success)" />
              </div>
              <div style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 14.5, color: 'var(--ink)' }}>All crew covered</div>
              <div style={{ fontFamily: 'var(--font)', fontSize: 13, color: 'var(--ink-muted)', marginTop: 2 }}>No action required.</div>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 14, color: 'var(--ink-muted)', marginBottom: 12 }}>Today's jobs</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {liveSummaries.length === 0 && <div style={{ fontFamily: 'var(--font)', fontSize: 13, color: 'var(--ink-muted)' }}>No jobs running today.</div>}
            {liveSummaries.map((s, i) => {
              const complete = s.confirmed === s.required && s.required > 0
              const client = clients[s.job.client_id]
              return (
                <div key={s.job.id} style={{ position: 'relative', border: '1px solid var(--line)', borderRadius: 12, background: '#fff', padding: '12px 14px 12px 18px', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: clientColor(client, i) }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13.5, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.job.name}</div>
                      <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'var(--ink-muted)', marginTop: 1 }}>{client?.name ?? 'Unknown client'}</div>
                    </div>
                    <div style={{ flexShrink: 0, fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: complete ? 'var(--success)' : 'var(--attention)' }}>
                      {s.confirmed}/{s.required}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - day)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString()
}

function getMonthWeeks(refDate: Date): Date[][] {
  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)
  const gridStart = startOfWeek(firstOfMonth)
  const gridEnd = startOfWeek(lastOfMonth)
  const weeks: Date[][] = []
  let cursor = gridStart
  while (cursor <= gridEnd) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)))
    cursor = addDays(cursor, 7)
  }
  return weeks
}

interface CalendarJob {
  id: string
  name: string
  clientColor: string
  start: string
  end: string
  confirmed: number
  required: number
}

// packRanges is the shared lane-packing algorithm behind both the job bars
// and the ProspectiveEvent bands below — same "clip to this week, stack
// overlaps into lanes" problem for any dated item.
function packRanges<T>(weekDates: Date[], items: T[], getRange: (item: T) => { start: string; end: string }) {
  const weekStart = weekDates[0]
  const weekEnd = addDays(weekDates[6], 1)

  const overlapping = items
    .map((item) => {
      const { start, end } = getRange(item)
      const itemStart = new Date(start + 'T00:00:00')
      const itemEnd = addDays(new Date(end + 'T00:00:00'), 1)
      if (itemEnd <= weekStart || itemStart >= weekEnd) return null
      const clippedStart = itemStart < weekStart ? weekStart : itemStart
      const clippedEndExclusive = itemEnd > weekEnd ? weekEnd : itemEnd
      const startCol = Math.round((clippedStart.getTime() - weekStart.getTime()) / DAY_MS)
      const endCol = Math.round((clippedEndExclusive.getTime() - weekStart.getTime()) / DAY_MS) - 1
      return { item, startCol, endCol, itemStart }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.itemStart.getTime() - b.itemStart.getTime() || a.startCol - b.startCol)

  const laneEnds: number[] = []
  const placed: Array<{ item: T; startCol: number; endCol: number; lane: number }> = []
  for (const entry of overlapping) {
    let lane = laneEnds.findIndex((end) => end < entry.startCol)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(entry.endCol)
    } else {
      laneEnds[lane] = entry.endCol
    }
    placed.push({ item: entry.item, startCol: entry.startCol, endCol: entry.endCol, lane })
  }
  return { placed, laneCount: laneEnds.length }
}

function packWeek(weekDates: Date[], jobs: CalendarJob[]) {
  const { placed, laneCount } = packRanges(weekDates, jobs, (job) => ({ start: job.start, end: job.end }))
  return { placed: placed.map((p) => ({ job: p.item, startCol: p.startCol, endCol: p.endCol, lane: p.lane })), laneCount }
}

function packProspectiveBands(weekDates: Date[], events: ProspectiveEvent[]) {
  const { placed, laneCount } = packRanges(weekDates, events, (e) => ({ start: e.date_start, end: e.date_end }))
  return { placed: placed.map((p) => ({ event: p.item, startCol: p.startCol, endCol: p.endCol, lane: p.lane })), laneCount }
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// ProspectiveEvent bands render in their own thin strip above the job
// lanes, never mixed into the same lane-packing as real jobs — addendum v2
// §3's "visible behind the schedule, never presenting itself as a job"
// means distinct space and distinct texture (dashed outline, no fill),
// not competing with job bars for the same row.
function ProspectiveBandRow({ weekDates, events, onSelect }: { weekDates: Date[]; events: ProspectiveEvent[]; onSelect: (event: ProspectiveEvent) => void }) {
  const { placed, laneCount } = packProspectiveBands(weekDates, events)
  if (laneCount === 0) return null
  return (
    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 16, padding: '2px 4px 0' }}>
      {placed.map(({ event, startCol, endCol, lane }) => (
        <div
          key={event.id}
          onClick={() => onSelect(event)}
          title={`${event.name} (prospective) — ${event.date_start} – ${event.date_end}`}
          style={{
            gridColumn: `${startCol + 1} / ${endCol + 2}`,
            gridRow: lane + 1,
            margin: '1px 4px',
            border: '1px dashed var(--primary-soft)',
            borderRadius: 4,
            padding: '0 6px',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            cursor: 'pointer',
            background: 'repeating-linear-gradient(135deg, var(--primary-tint), var(--primary-tint) 4px, transparent 4px, transparent 8px)',
          }}
        >
          <span style={{ fontFamily: 'var(--font)', fontStyle: 'italic', fontWeight: 500, fontSize: 10.5, color: 'var(--primary-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.name}</span>
        </div>
      ))}
    </div>
  )
}

function WeekRow({
  weekDates,
  referenceMonth,
  tall,
  jobs,
  events,
  onOpenJob,
  onSelectEvent,
}: {
  weekDates: Date[]
  referenceMonth: number
  tall: boolean
  jobs: CalendarJob[]
  events: ProspectiveEvent[]
  onOpenJob: (id: string) => void
  onSelectEvent: (event: ProspectiveEvent) => void
}) {
  const { placed, laneCount } = packWeek(weekDates, jobs)
  const barHeight = tall ? 30 : 22
  const today = new Date()

  return (
    <div style={{ borderBottom: '1px solid var(--line)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {weekDates.map((date) => {
          const inMonth = date.getMonth() === referenceMonth
          const isToday = sameDay(date, today)
          return (
            <div key={date.toISOString()} style={{ padding: '8px 10px 4px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--primary)' : inMonth ? 'var(--ink)' : 'var(--ink-muted)', opacity: inMonth ? 1 : 0.5 }}>
              {isToday ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: 'var(--primary)', color: '#fff' }}>{date.getDate()}</span>
              ) : (
                date.getDate()
              )}
            </div>
          )
        })}
      </div>
      <ProspectiveBandRow weekDates={weekDates} events={events} onSelect={onSelectEvent} />
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: barHeight + 4, padding: '0 4px 8px', minHeight: laneCount === 0 ? 10 : undefined }}>
        {placed.map(({ job, startCol, endCol, lane }) => (
          <div
            key={job.id}
            onClick={() => onOpenJob(job.id)}
            title={`${job.name} — ${job.confirmed}/${job.required} confirmed. Click to open in Planner.`}
            style={{ gridColumn: `${startCol + 1} / ${endCol + 2}`, gridRow: lane + 1, margin: '2px 4px', background: job.clientColor, borderRadius: 6, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', cursor: 'pointer' }}
          >
            <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 11.5, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.name}</span>
            <span style={{ fontFamily: 'var(--font)', fontSize: 11, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 'auto' }}>
              {job.confirmed}/{job.required}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AddProspectiveEventForm({ clients, onSaved, onCancel }: { clients: Client[]; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [dateStart, setDateStart] = useState(todayISO())
  const [dateEnd, setDateEnd] = useState(todayISO())
  const [clientId, setClientId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const inputStyle = { border: '1px solid var(--line)', borderRadius: 8, padding: '7px 10px', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--ink)', background: '#fff' }

  async function submit() {
    setSaving(true)
    setError(undefined)
    try {
      await createProspectiveEvent({ name, date_start: dateStart, date_end: dateEnd, client_id: clientId || undefined, notes: notes || undefined })
      onSaved()
    } catch {
      setError('Could not save that event.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ border: '1px solid var(--primary-soft)', background: 'var(--primary-surface)', borderRadius: 10, padding: 14, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 2 }}>
          <span style={{ fontFamily: 'var(--font)', fontSize: 11.5, color: 'var(--ink-muted)' }}>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. FA Cup Final" style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <span style={{ fontFamily: 'var(--font)', fontSize: 11.5, color: 'var(--ink-muted)' }}>Start date</span>
          <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <span style={{ fontFamily: 'var(--font)', fontSize: 11.5, color: 'var(--ink-muted)' }}>End date</span>
          <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <span style={{ fontFamily: 'var(--font)', fontSize: 11.5, color: 'var(--ink-muted)' }}>Client</span>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={inputStyle}>
            <option value="">Unknown / TBC</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" style={inputStyle} />
      {error && <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'var(--danger)' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ border: '1px solid var(--line)', background: '#fff', borderRadius: 8, padding: '7px 14px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', color: 'var(--ink-muted)' }}>
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving || !name || !dateStart || !dateEnd}
          style={{ border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 8, padding: '7px 14px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : 'Add event'}
        </button>
      </div>
    </div>
  )
}

function ProspectiveEventDetailCard({
  event,
  client,
  onDropped,
  onClose,
  onConvert,
}: {
  event: ProspectiveEvent
  client: Client | undefined
  onDropped: () => void
  onClose: () => void
  onConvert: (event: ProspectiveEvent) => void
}) {
  const [dropping, setDropping] = useState(false)

  async function drop() {
    setDropping(true)
    try {
      await dropProspectiveEvent(event.id)
      onDropped()
    } finally {
      setDropping(false)
    }
  }

  return (
    <div style={{ border: '1px dashed var(--primary-soft)', background: 'var(--primary-surface)', borderRadius: 10, padding: 14, marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <div>
        <div style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
          {event.name} <span style={{ fontWeight: 500, fontSize: 11.5, color: 'var(--primary-soft)', fontStyle: 'italic' }}>· Prospective</span>
        </div>
        <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 2 }}>
          {event.date_start} – {event.date_end}
          {client ? ` · ${client.name}` : ''}
        </div>
        {event.notes && <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 4 }}>{event.notes}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={onClose} style={{ border: '1px solid var(--line)', background: '#fff', borderRadius: 8, padding: '7px 14px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', color: 'var(--ink-muted)' }}>
          Close
        </button>
        <button
          onClick={() => onConvert(event)}
          style={{ border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 8, padding: '7px 14px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}
        >
          Convert to job
        </button>
        <button
          onClick={drop}
          disabled={dropping}
          title="Mark as never happening — kept for history, not deleted"
          style={{ border: '1px solid var(--danger)', background: '#fff', borderRadius: 8, padding: '7px 14px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', color: 'var(--danger)', opacity: dropping ? 0.7 : 1 }}
        >
          {dropping ? 'Dropping…' : 'Drop'}
        </button>
      </div>
    </div>
  )
}

function CalendarContent({
  summaries,
  clients,
  onOpenJob,
  onConvertEvent,
}: {
  summaries: JobSummary[]
  clients: Record<string, Client>
  onOpenJob: (id: string) => void
  onConvertEvent: (event: ProspectiveEvent) => void
}) {
  const [mode, setMode] = useState<'month' | 'week'>('month')
  const [refDate, setRefDate] = useState(new Date())
  const [addingEvent, setAddingEvent] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined)
  const { data: prospectiveEvents, reload: reloadEvents } = useProspectiveEvents()

  const openEvents = useMemo(() => prospectiveEvents.filter((e) => e.status === 'open'), [prospectiveEvents])
  const selectedEvent = openEvents.find((e) => e.id === selectedEventId)

  const calendarJobs: CalendarJob[] = useMemo(
    () =>
      summaries.map((s, i) => ({
        id: s.job.id,
        name: s.job.name,
        clientColor: clientColor(clients[s.job.client_id], i),
        start: s.job.start_date,
        end: s.job.end_date,
        confirmed: s.confirmed,
        required: s.required,
      })),
    [summaries, clients],
  )

  const weeks = mode === 'month' ? getMonthWeeks(refDate) : [Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(refDate), i))]

  const goPrev = () => setRefDate((d) => (mode === 'month' ? new Date(d.getFullYear(), d.getMonth() - 1, 1) : addDays(d, -7)))
  const goNext = () => setRefDate((d) => (mode === 'month' ? new Date(d.getFullYear(), d.getMonth() + 1, 1) : addDays(d, 7)))
  const goToday = () => setRefDate(new Date())

  const headerLabel =
    mode === 'month'
      ? `${MONTH_LABELS[refDate.getMonth()]} ${refDate.getFullYear()}`
      : (() => {
          const s = startOfWeek(refDate)
          const e = addDays(s, 6)
          return `${s.getDate()} – ${e.getDate()} ${MONTH_LABELS[e.getMonth()]} ${e.getFullYear()}`
        })()

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 24, color: 'var(--ink)' }}>Calendar</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setAddingEvent(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1px dashed var(--primary-soft)', background: '#fff', color: 'var(--primary-soft)', borderRadius: 8, padding: '7px 12px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}
          >
            <Plus size={13} /> Prospective event
          </button>
          <div style={{ display: 'flex', background: '#fff', border: '1px solid var(--line)', borderRadius: 10, padding: 3 }}>
            {(['month', 'week'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{ background: mode === m ? 'var(--primary-tint)' : 'none', color: mode === m ? 'var(--primary)' : 'var(--ink-muted)', border: 'none', borderRadius: 7, padding: '6px 14px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', textTransform: 'capitalize' }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {addingEvent && (
        <AddProspectiveEventForm
          clients={Object.values(clients)}
          onCancel={() => setAddingEvent(false)}
          onSaved={() => {
            setAddingEvent(false)
            reloadEvents()
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={goPrev} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronLeft size={15} color="var(--ink-muted)" />
          </button>
          <button onClick={goNext} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronRight size={15} color="var(--ink-muted)" />
          </button>
          <div style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 15, color: 'var(--ink)', marginLeft: 4 }}>{headerLabel}</div>
        </div>
        <button onClick={goToday} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 14px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, color: 'var(--ink)', cursor: 'pointer' }}>
          Today
        </button>
      </div>

      <div style={{ border: '1px solid var(--line)', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} style={{ padding: '8px 10px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 11, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
              {d}
            </div>
          ))}
        </div>
        {weeks.map((weekDates, i) => (
          <WeekRow
            key={i}
            weekDates={weekDates}
            referenceMonth={refDate.getMonth()}
            tall={mode === 'week'}
            jobs={calendarJobs}
            events={openEvents}
            onOpenJob={onOpenJob}
            onSelectEvent={(event) => setSelectedEventId(event.id)}
          />
        ))}
      </div>

      {selectedEvent && (
        <ProspectiveEventDetailCard
          event={selectedEvent}
          client={selectedEvent.client_id ? clients[selectedEvent.client_id] : undefined}
          onClose={() => setSelectedEventId(undefined)}
          onConvert={onConvertEvent}
          onDropped={() => {
            setSelectedEventId(undefined)
            reloadEvents()
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

function urgencyFor(summary: JobSummary) {
  const unfilled = summary.required - summary.confirmed - summary.pencilled - summary.offered
  if (unfilled <= 0 && summary.required > 0) return { tier: 'complete', color: 'var(--success)', bg: 'var(--success-bg)', Icon: CheckCircle2 }
  const daysUntilStart = Math.ceil((new Date(summary.job.start_date).getTime() - Date.now()) / DAY_MS)
  if (daysUntilStart <= 5) return { tier: 'critical', color: 'var(--danger)', bg: 'var(--danger-bg)', Icon: AlertTriangle }
  if (daysUntilStart <= 30) return { tier: 'attention', color: 'var(--attention)', bg: 'var(--attention-bg)', Icon: Clock }
  return { tier: 'quiet', color: 'var(--ink-muted)', bg: 'var(--track)', Icon: Minus }
}

function JobListRow({ summary, client, selected, fallbackIndex, onOpen }: { summary: JobSummary; client: Client | undefined; selected: boolean; fallbackIndex: number; onOpen: (id: string) => void }) {
  const u = urgencyFor(summary)
  const quiet = u.tier === 'complete' || u.tier === 'quiet'
  const pct = summary.required > 0 ? (summary.confirmed / summary.required) * 100 : 0
  const StatusIcon = u.Icon

  return (
    <button
      onClick={() => onOpen(summary.job.id)}
      style={{ position: 'relative', width: '100%', textAlign: 'left', background: selected ? 'var(--primary-tint)' : '#fff', border: selected ? '1px solid var(--primary-soft)' : '1px solid var(--line)', borderRadius: 12, padding: '12px 14px 12px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: clientColor(client, fallbackIndex), opacity: quiet ? 0.6 : 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 14, color: quiet ? 'var(--ink-muted)' : 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{summary.job.name}</span>
            <CommitmentBadge job={summary.job} />
          </div>
          <span style={{ fontFamily: 'var(--font)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 12.5, color: u.color, flexShrink: 0 }}>
            {summary.confirmed}/{summary.required}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>
          {summary.job.start_date} – {summary.job.end_date}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: u.tier === 'quiet' ? 'var(--ink-muted)' : u.color, opacity: quiet ? 0.5 : 1 }} />
          </div>
        </div>
      </div>
      <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: u.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <StatusIcon size={12} color={u.color} strokeWidth={2.5} />
      </div>
    </button>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--primary-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={14} color="var(--primary)" />
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font)', fontSize: 11.5, color: 'var(--ink-muted)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font)', fontSize: 13.5, color: 'var(--ink)', marginTop: 1 }}>{value}</div>
      </div>
    </div>
  )
}

function JobRoleRow({ req }: { req: JobRequirementWithCounts }) {
  const unfilled = req.quantity_required - req.quantity_confirmed - req.quantity_pencilled - req.quantity_offered
  const pctConfirmed = req.quantity_required > 0 ? (req.quantity_confirmed / req.quantity_required) * 100 : 0
  const pctPencilled = req.quantity_required > 0 ? (req.quantity_pencilled / req.quantity_required) * 100 : 0
  const complete = unfilled <= 0
  const StatusIcon = complete ? CheckCircle2 : req.quantity_offered > 0 ? Clock : AlertTriangle
  const statusColor = complete ? 'var(--success)' : 'var(--attention)'
  const statusBg = complete ? 'var(--success-bg)' : 'var(--attention-bg)'
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{req.role_name}</span>
          <span style={{ fontFamily: 'var(--font)', fontVariantNumeric: 'tabular-nums', fontSize: 12.5, fontWeight: 600, color: unfilled > 0 ? 'var(--attention)' : 'var(--ink-muted)' }}>
            {req.quantity_confirmed}/{req.quantity_required}
          </span>
        </div>
        <div style={{ height: 5, borderRadius: 999, background: 'var(--track)', overflow: 'hidden', marginTop: 7, display: 'flex' }}>
          <div style={{ width: `${pctConfirmed}%`, background: unfilled > 0 ? 'var(--attention)' : 'var(--success)' }} />
          <div
            style={{
              width: `${pctPencilled}%`,
              background: `repeating-linear-gradient(135deg, var(--primary-soft), var(--primary-soft) 2px, transparent 2px, transparent 4px)`,
            }}
          />
        </div>
        {req.quantity_pencilled > 0 && (
          <div style={{ fontFamily: 'var(--font)', fontSize: 11, color: 'var(--primary-soft)', marginTop: 4 }}>{req.quantity_pencilled} pencilled</div>
        )}
      </div>
      <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: statusBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <StatusIcon size={12} color={statusColor} strokeWidth={2.5} />
      </div>
    </div>
  )
}

// --- Job creation ---
//
// Scheduler-side, desktop-only. Field list is the data model doc's Job
// entity (§2.3) plus addendum v1 §1 (project_id) and addendum v2 §4
// (commitment) — not inferred from what the rest of the UI happens to
// show. Colour is deliberately absent: it's inherited (Job → Project →
// Client), never picked, so there's no colour control here at all.
//
// Requirements are folded into this form rather than left for Planner,
// because Planner has no way to add a requirement to a job either — a
// pre-existing gap, not something addendum v2 introduced. A job created
// here without at least the option to add roles would come out
// permanently uncrewable from the UI.

export interface JobCreatePrefill {
  name?: string
  start_date?: string
  end_date?: string
  client_id?: string
  fromProspectiveEventId?: string
}

interface DraftRequirement {
  key: number
  role_id: string
  quantity_required: string
  start_date: string
  end_date: string
}

interface DraftContact {
  key: number
  name: string
  role_title: string
  email: string
  phone: string
}

function JobCreateForm({
  clients,
  projects,
  venues,
  roles,
  prefill,
  onCancel,
  onCreated,
}: {
  clients: Client[]
  projects: Project[]
  venues: Venue[]
  roles: Role[]
  prefill?: JobCreatePrefill
  onCancel: () => void
  onCreated: (jobId: string) => void
}) {
  const [name, setName] = useState(prefill?.name ?? '')
  const [clientId, setClientId] = useState(prefill?.client_id ?? '')
  const [projectId, setProjectId] = useState('')
  const [venueId, setVenueId] = useState('')
  const [startDate, setStartDate] = useState(prefill?.start_date ?? todayISO())
  const [endDate, setEndDate] = useState(prefill?.end_date ?? prefill?.start_date ?? todayISO())
  // Converting a ProspectiveEvent defaults to Pencil — addendum v2 §4's
  // one exception to Job.commitment's usual Firm default.
  const [commitment, setCommitment] = useState<JobCommitment>(prefill?.fromProspectiveEventId ? 'pencil' : 'firm')
  const [notes, setNotes] = useState('')
  const [requirements, setRequirements] = useState<DraftRequirement[]>([])
  const [contacts, setContacts] = useState<DraftContact[]>([])
  const [nextKey, setNextKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const inputStyle = { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--ink)', background: '#fff', width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { display: 'flex', flexDirection: 'column' as const, gap: 4, fontFamily: 'var(--font)', fontSize: 11.5, color: 'var(--ink-muted)' }

  function addRequirement() {
    setRequirements((rows) => [...rows, { key: nextKey, role_id: '', quantity_required: '1', start_date: startDate, end_date: endDate }])
    setNextKey((k) => k + 1)
  }

  function updateRequirement(key: number, patch: Partial<DraftRequirement>) {
    setRequirements((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function removeRequirement(key: number) {
    setRequirements((rows) => rows.filter((r) => r.key !== key))
  }

  function addContact() {
    setContacts((rows) => [...rows, { key: nextKey, name: '', role_title: '', email: '', phone: '' }])
    setNextKey((k) => k + 1)
  }

  function updateContact(key: number, patch: Partial<DraftContact>) {
    setContacts((rows) => rows.map((c) => (c.key === key ? { ...c, ...patch } : c)))
  }

  function removeContact(key: number) {
    setContacts((rows) => rows.filter((c) => c.key !== key))
  }

  async function submit() {
    setError(undefined)
    if (!name || !clientId || !startDate || !endDate) {
      setError('Name, client, and dates are required.')
      return
    }
    for (const r of requirements) {
      if (!r.role_id || Number(r.quantity_required) < 1) {
        setError('Every role added needs a role and a quantity of at least 1.')
        return
      }
    }
    for (const c of contacts) {
      if (!c.name) {
        setError('Every contact added needs at least a name.')
        return
      }
    }

    setSaving(true)
    try {
      const job = await createJob({
        name,
        client_id: clientId,
        project_id: projectId || undefined,
        venue_id: venueId || undefined,
        start_date: startDate,
        end_date: endDate,
        status: 'draft',
        commitment,
        notes: notes || undefined,
      })
      await Promise.all(
        requirements.map((r) =>
          createJobRequirement(job.id, {
            role_id: r.role_id,
            quantity_required: Number(r.quantity_required),
            start_date: r.start_date,
            end_date: r.end_date,
          }),
        ),
      )
      await Promise.all(
        contacts.map((c) =>
          createJobContact(job.id, {
            name: c.name,
            role_title: c.role_title || undefined,
            email: c.email || undefined,
            phone: c.phone || undefined,
          }),
        ),
      )
      if (prefill?.fromProspectiveEventId) {
        await convertProspectiveEvent(prefill.fromProspectiveEventId, job.id)
      }
      onCreated(job.id)
    } catch {
      setError('Could not create that job — check the fields and try again.')
      setSaving(false)
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 22, color: 'var(--ink)' }}>New job</div>
      </div>
      {prefill?.fromProspectiveEventId && (
        <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: 'var(--primary-soft)', fontStyle: 'italic', marginBottom: 16 }}>
          Converting from a prospective event — commitment defaults to Pencil.
        </div>
      )}

      <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 14, marginTop: prefill?.fromProspectiveEventId ? 0 : 16 }}>
        <label style={labelStyle}>
          Job name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. UFC 327 — Las Vegas" style={inputStyle} />
        </label>

        <div style={{ display: 'flex', gap: 14 }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Client
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={inputStyle}>
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ ...labelStyle, flex: 1 }}>
            Project (optional)
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={inputStyle}>
              <option value="">No project — standalone job</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Start date
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ ...labelStyle, flex: 1 }}>
            End date
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ ...labelStyle, flex: 1 }}>
            Venue (optional)
            <select value={venueId} onChange={(e) => setVenueId(e.target.value)} style={inputStyle}>
              <option value="">Not set</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label style={labelStyle}>
          Commitment
          <div style={{ display: 'flex', gap: 8 }}>
            {(['firm', 'pencil'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCommitment(c)}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  textTransform: 'capitalize',
                  padding: '8px 0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  fontWeight: 600,
                  fontSize: 13,
                  border: commitment === c ? '1px solid var(--primary-soft)' : '1px solid var(--line)',
                  background: commitment === c ? 'var(--primary-tint)' : '#fff',
                  color: commitment === c ? 'var(--primary-soft)' : 'var(--ink-muted)',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </label>

        <label style={labelStyle}>
          Notes (optional)
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font)' }} />
        </label>

        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>Roles</span>
            <button
              onClick={addRequirement}
              style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px dashed var(--primary-soft)', background: '#fff', color: 'var(--primary-soft)', borderRadius: 8, padding: '5px 10px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
            >
              <Plus size={12} /> Add role
            </button>
          </div>
          {requirements.length === 0 && (
            <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: 'var(--ink-muted)' }}>
              No roles yet — the job can be saved without any, but nothing will be crewable in Planner until at least one is added (here, since Planner can't add roles to a job itself).
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {requirements.map((r) => (
              <div key={r.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
                <label style={{ ...labelStyle, flex: 1.4 }}>
                  Role
                  <select value={r.role_id} onChange={(e) => updateRequirement(r.key, { role_id: e.target.value })} style={inputStyle}>
                    <option value="">Select…</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ ...labelStyle, flex: 0.7 }}>
                  Qty
                  <input type="number" min={1} value={r.quantity_required} onChange={(e) => updateRequirement(r.key, { quantity_required: e.target.value })} style={inputStyle} />
                </label>
                <label style={{ ...labelStyle, flex: 1 }}>
                  Start
                  <input type="date" value={r.start_date} onChange={(e) => updateRequirement(r.key, { start_date: e.target.value })} style={inputStyle} />
                </label>
                <label style={{ ...labelStyle, flex: 1 }}>
                  End
                  <input type="date" value={r.end_date} onChange={(e) => updateRequirement(r.key, { end_date: e.target.value })} style={inputStyle} />
                </label>
                <button onClick={() => removeRequirement(r.key)} title="Remove role" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink-muted)', padding: '8px 2px' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>Production contacts</span>
            <button
              onClick={addContact}
              style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px dashed var(--primary-soft)', background: '#fff', color: 'var(--primary-soft)', borderRadius: 8, padding: '5px 10px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
            >
              <Plus size={12} /> Add contact
            </button>
          </div>
          {contacts.length === 0 && (
            <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: 'var(--ink-muted)' }}>
              Optional — on-site production contacts, distinct from the client's own contact on file.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {contacts.map((c) => (
              <div key={c.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
                <label style={{ ...labelStyle, flex: 1.2 }}>
                  Name
                  <input value={c.name} onChange={(e) => updateContact(c.key, { name: e.target.value })} placeholder="e.g. Jordan Blake" style={inputStyle} />
                </label>
                <label style={{ ...labelStyle, flex: 1 }}>
                  Role
                  <input value={c.role_title} onChange={(e) => updateContact(c.key, { role_title: e.target.value })} placeholder="e.g. Production Manager" style={inputStyle} />
                </label>
                <label style={{ ...labelStyle, flex: 1.2 }}>
                  Email
                  <input value={c.email} onChange={(e) => updateContact(c.key, { email: e.target.value })} style={inputStyle} />
                </label>
                <label style={{ ...labelStyle, flex: 1 }}>
                  Phone
                  <input value={c.phone} onChange={(e) => updateContact(c.key, { phone: e.target.value })} style={inputStyle} />
                </label>
                <button onClick={() => removeContact(c.key)} title="Remove contact" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink-muted)', padding: '8px 2px' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: 'var(--danger)' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={onCancel} style={{ border: '1px solid var(--line)', background: '#fff', borderRadius: 8, padding: '9px 16px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: 'var(--ink-muted)' }}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            style={{ border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 8, padding: '9px 18px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Creating…' : 'Create job'}
          </button>
        </div>
      </div>
    </div>
  )
}

function JobsContent({
  summaries,
  clients,
  venues,
  venuesList,
  projects,
  roles,
  selectedId,
  onSelect,
  reloadSummaries,
  prefill,
  onConsumedPrefill,
}: {
  summaries: JobSummary[]
  clients: Record<string, Client>
  venues: Record<string, unknown>
  venuesList: Venue[]
  projects: Project[]
  roles: Role[]
  selectedId: string | undefined
  onSelect: (id: string) => void
  reloadSummaries: () => void
  prefill?: JobCreatePrefill
  onConsumedPrefill: () => void
}) {
  const [query, setQuery] = useState('')
  const [contacts, setContacts] = useState<JobContact[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (prefill) setCreating(true)
  }, [prefill])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return summaries.filter((s) => s.job.name.toLowerCase().includes(q) || (clients[s.job.client_id]?.name ?? '').toLowerCase().includes(q))
  }, [summaries, clients, query])

  const selected = summaries.find((s) => s.job.id === selectedId) ?? summaries[0]

  useEffect(() => {
    if (!selected) return
    api.get<JobContact[]>(`/jobs/${selected.job.id}/contacts`).then(setContacts).catch(() => setContacts([]))
  }, [selected?.job.id])

  function finishCreating(jobId: string) {
    setCreating(false)
    if (prefill) onConsumedPrefill()
    reloadSummaries()
    onSelect(jobId)
  }

  function cancelCreating() {
    setCreating(false)
    if (prefill) onConsumedPrefill()
  }

  if (creating) {
    return <JobCreateForm clients={Object.values(clients)} projects={projects} venues={venuesList} roles={roles} prefill={prefill} onCancel={cancelCreating} onCreated={finishCreating} />
  }

  if (!selected) {
    return (
      <div style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font)', color: 'var(--ink-muted)', fontSize: 13.5 }}>No jobs yet — create one to get started.</div>
        <button
          onClick={() => setCreating(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
        >
          <Plus size={13} /> New job
        </button>
      </div>
    )
  }

  const u = urgencyFor(selected)
  const client = clients[selected.job.client_id]
  const venueName = selected.job.venue_id ? (venues[selected.job.venue_id] as { name: string } | undefined)?.name : undefined
  const primaryContact = contacts[0]

  return (
    <>
      <div style={{ width: 380, flexShrink: 0, borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 20px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 22, color: 'var(--ink)' }}>Jobs</div>
            <button
              onClick={() => setCreating(true)}
              title="New job"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              <Plus size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px', background: '#fff' }}>
            <Search size={15} color="var(--ink-muted)" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search jobs or clients" style={{ border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 13.5, color: 'var(--ink)', flex: 1 }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((s, i) => (
            <JobListRow key={s.job.id} summary={s} client={clients[s.job.client_id]} fallbackIndex={i} selected={s.job.id === selected.job.id} onOpen={onSelect} />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px' }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: 13, color: 'var(--ink-muted)' }}>{client?.name ?? 'Unknown client'}</div>
        <div style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 24, color: 'var(--ink)', marginTop: 2 }}>{selected.job.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12, padding: '4px 10px', borderRadius: 999, color: u.color, background: u.bg }}>{selected.job.status}</span>
          <CommitmentBadge job={selected.job} />
        </div>

        <div style={{ display: 'flex', gap: 32, marginTop: 8, borderBottom: '1px solid var(--line)', paddingBottom: 4 }}>
          <InfoRow icon={CalendarDays} label="Dates" value={`${selected.job.start_date} – ${selected.job.end_date}`} />
          <InfoRow icon={MapPin} label="Venue" value={venueName ?? 'Not set'} />
          <InfoRow icon={Phone} label="Production contact" value={primaryContact ? `${primaryContact.name}${primaryContact.phone ? ' · ' + primaryContact.phone : ''}` : 'Not yet assigned'} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '24px 0 12px' }}>
          <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 14, color: 'var(--ink-muted)' }}>Crewing by role</span>
          <span style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: 'var(--ink-muted)' }}>
            {selected.confirmed} confirmed{selected.pencilled > 0 ? ` · ${selected.pencilled} pencilled` : ''} · {selected.required} total
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {selected.requirements.map((r) => (
            <JobRoleRow key={r.id} req={r} />
          ))}
          {selected.requirements.length === 0 && <div style={{ fontFamily: 'var(--font)', fontSize: 13, color: 'var(--ink-muted)' }}>No role requirements added yet.</div>}
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

function completeness(reqs: JobRequirementWithCounts[]) {
  const required = reqs.reduce((s, r) => s + r.quantity_required, 0)
  const confirmed = reqs.reduce((s, r) => s + r.quantity_confirmed, 0)
  return { required, confirmed }
}

function JobChip({ summary, client, fallbackIndex, active, onClick }: { summary: JobSummary; client: Client | undefined; fallbackIndex: number; active: boolean; onClick: () => void }) {
  const { required, confirmed } = completeness(summary.requirements)
  const complete = confirmed === required && required > 0
  return (
    <button
      onClick={onClick}
      style={{ position: 'relative', background: active ? 'var(--primary-tint)' : '#fff', border: active ? '1px solid var(--primary-soft)' : '1px solid var(--line)', borderRadius: 12, padding: '10px 16px 10px 20px', textAlign: 'left', cursor: 'pointer', minWidth: 168, overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: clientColor(client, fallbackIndex) }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{summary.job.name}</div>
        <CommitmentBadge job={summary.job} />
      </div>
      <div style={{ fontFamily: 'var(--font)', fontVariantNumeric: 'tabular-nums', fontSize: 12, marginTop: 3, color: complete ? 'var(--success)' : 'var(--attention)', fontWeight: 600 }}>
        {confirmed}/{required} confirmed
      </div>
    </button>
  )
}

function RequirementRow({ req, active, onOpen }: { req: JobRequirementWithCounts; active: boolean; onOpen: (req: JobRequirementWithCounts) => void }) {
  const unfilled = req.quantity_required - req.quantity_confirmed - req.quantity_pencilled - req.quantity_offered
  const pctConfirmed = req.quantity_required > 0 ? (req.quantity_confirmed / req.quantity_required) * 100 : 0
  const pctPencilled = req.quantity_required > 0 ? (req.quantity_pencilled / req.quantity_required) * 100 : 0
  const pctOffered = req.quantity_required > 0 ? (req.quantity_offered / req.quantity_required) * 100 : 0
  const complete = unfilled <= 0
  const StatusIcon = complete ? CheckCircle2 : req.quantity_offered > 0 ? Clock : AlertTriangle
  const statusColor = complete ? 'var(--success)' : 'var(--attention)'
  const statusBg = complete ? 'var(--success-bg)' : 'var(--attention-bg)'

  return (
    <button
      onClick={() => onOpen(req)}
      style={{ width: '100%', textAlign: 'left', background: active ? 'var(--primary-tint)' : '#fff', border: active ? '1px solid var(--primary-soft)' : '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 14.5, color: 'var(--ink)' }}>{req.role_name}</span>
          <span style={{ fontFamily: 'var(--font)', fontVariantNumeric: 'tabular-nums', fontSize: 12.5, color: unfilled > 0 ? 'var(--attention)' : 'var(--ink-muted)', fontWeight: 600 }}>
            {req.quantity_confirmed}/{req.quantity_required}
          </span>
        </div>
        {/* Pencils never count as filled (addendum v2 §4) — a distinct
            hatched segment, not folded into the confirmed (solid) or
            offered (flat attention-colour) segments. */}
        <div style={{ marginTop: 8, height: 6, borderRadius: 999, background: 'var(--track)', overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${pctConfirmed}%`, background: 'var(--success)' }} />
          <div
            style={{
              width: `${pctPencilled}%`,
              background: `repeating-linear-gradient(135deg, var(--primary-soft), var(--primary-soft) 2px, transparent 2px, transparent 4px)`,
            }}
          />
          <div style={{ width: `${pctOffered}%`, background: 'var(--attention)' }} />
        </div>
        {(unfilled > 0 || req.quantity_pencilled > 0) && (
          <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'var(--attention)', marginTop: 6 }}>
            {unfilled > 0 ? `${unfilled} unfilled` : 'Fully held'}
            {req.quantity_pencilled > 0 ? ` · ${req.quantity_pencilled} pencilled` : ''}
            {req.quantity_offered > 0 ? ` · ${req.quantity_offered} offered` : ''}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: statusBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <StatusIcon size={12} color={statusColor} strokeWidth={2.5} />
      </div>
    </button>
  )
}

// "Already asked" — addendum v2 §5. Scoped to the whole Job (a decline on
// Camera still surfaces while crewing Utilities on the same job), so this
// carries whichever role the ask was against rather than assuming it's
// always the role currently being crewed.
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function AlreadyAskedRow({ entry, declined }: { entry: AlreadyAskedEntry; declined: boolean }) {
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{entry.name}</div>
      <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'var(--ink-muted)', marginTop: 1 }}>
        {entry.role_name ? `${entry.role_name} · ` : ''}
        {declined ? `Declined ${shortDate(entry.responded_at ?? entry.asked_at)}` : `Asked ${shortDate(entry.asked_at)} · awaiting response`}
      </div>
    </div>
  )
}

function CandidateGroup({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: tone }} />
        <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, color: 'var(--ink-muted)' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function PlannerContent({ summaries, clients, selectedJobId, onSelectJob, reloadSummaries }: { summaries: JobSummary[]; clients: Record<string, Client>; selectedJobId: string | undefined; onSelectJob: (id: string) => void; reloadSummaries: () => void }) {
  const summary = summaries.find((s) => s.job.id === selectedJobId) ?? summaries[0]
  const [activeReq, setActiveReq] = useState<JobRequirementWithCounts | undefined>(undefined)

  useEffect(() => {
    if (!summary) return
    setActiveReq(summary.requirements.find((r) => r.quantity_required - r.quantity_confirmed - r.quantity_pencilled - r.quantity_offered > 0) ?? summary.requirements[0])
  }, [summary?.job.id, summary?.requirements])

  const { data: pool, reload: reloadCandidates } = useCandidates(activeReq?.id)

  async function handleOffer(personId: string, status: 'offered' | 'pencilled' = 'offered') {
    if (!activeReq) return
    await offerBooking(activeReq.id, personId, activeReq.start_date, activeReq.end_date, activeReq.call_time, status)
    await Promise.all([reloadCandidates(), reloadSummaries()])
  }

  if (!summary) {
    return <div style={{ flex: 1, padding: 32, fontFamily: 'var(--font)', color: 'var(--ink-muted)' }}>No jobs yet — create one to get started.</div>
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 24, color: 'var(--ink)', marginBottom: 16 }}>Planner</div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, overflowX: 'auto' }}>
        {summaries.map((s, i) => (
          <JobChip key={s.job.id} summary={s} client={clients[s.job.client_id]} fallbackIndex={i} active={s.job.id === summary.job.id} onClick={() => onSelectJob(s.job.id)} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 14, color: 'var(--ink-muted)', marginBottom: 12 }}>Roles — {summary.job.name}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {summary.requirements.map((r) => (
              <RequirementRow key={r.id} req={r} active={r.id === activeReq?.id} onOpen={setActiveReq} />
            ))}
            {summary.requirements.length === 0 && <div style={{ fontFamily: 'var(--font)', fontSize: 13, color: 'var(--ink-muted)' }}>No role requirements added yet.</div>}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 14, color: 'var(--ink-muted)', marginBottom: 12 }}>Crew matching — {activeReq?.role_name}</div>
          <div style={{ border: '1px solid var(--line)', borderRadius: 12, background: '#fff', padding: '16px 18px' }}>
            <CandidateGroup title="AVAILABLE & SUITABLE" tone="var(--success)">
              {pool.suitable.length === 0 && <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: 'var(--ink-muted)' }}>No one in this group right now.</div>}
              {pool.suitable.map((c) => (
                <div key={c.person_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{c.name}</span>
                      {c.preferred_status === 'preferred' && <Star size={11} color="var(--primary)" fill="var(--primary)" />}
                    </div>
                    <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'var(--ink-muted)', marginTop: 1 }}>
                      {c.base_location ?? 'Location unknown'}
                      {c.standard_rate ? ` · ${c.rate_currency ?? ''}${c.standard_rate}/day` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => handleOffer(c.person_id, 'pencilled')}
                      title="Hold this person without formally asking yet"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff', color: 'var(--primary-soft)', border: '1px dashed var(--primary-soft)', borderRadius: 8, padding: '6px 12px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                    >
                      Pencil
                    </button>
                    <button
                      onClick={() => handleOffer(c.person_id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                    >
                      <Check size={12} /> Offer
                    </button>
                  </div>
                </div>
              ))}
            </CandidateGroup>

            <CandidateGroup title="POSSIBLE" tone="var(--attention)">
              {pool.possible.length === 0 && <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: 'var(--ink-muted)' }}>No one in this group right now.</div>}
              {pool.possible.map((c) => (
                <div key={c.person_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{c.name}</div>
                    <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'var(--ink-muted)', marginTop: 1 }}>{c.base_location ?? 'Location unknown'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => handleOffer(c.person_id, 'pencilled')}
                      title="Hold this person without formally asking yet"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff', color: 'var(--primary-soft)', border: '1px dashed var(--primary-soft)', borderRadius: 8, padding: '6px 12px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                    >
                      Pencil
                    </button>
                    <button
                      onClick={() => handleOffer(c.person_id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 12px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                    >
                      <Check size={12} /> Offer
                    </button>
                  </div>
                </div>
              ))}
            </CandidateGroup>

            <CandidateGroup title="UNAVAILABLE" tone="var(--ink-muted)">
              {pool.unavailable.map((c) => (
                <div key={c.person_id} style={{ padding: '8px 0', opacity: 0.6 }}>
                  <div style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{c.name}</div>
                  <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'var(--ink-muted)', marginTop: 1 }}>{c.reason}</div>
                </div>
              ))}
            </CandidateGroup>

            {(pool.already_asked.awaiting_response.length > 0 || pool.already_asked.declined.length > 0) && (
              <CandidateGroup title="ALREADY ASKED" tone="var(--attention)">
                {pool.already_asked.awaiting_response.map((entry, i) => (
                  <AlreadyAskedRow key={`awaiting-${entry.person_id}-${i}`} entry={entry} declined={false} />
                ))}
                {pool.already_asked.declined.map((entry, i) => (
                  <AlreadyAskedRow key={`declined-${entry.person_id}-${i}`} entry={entry} declined={true} />
                ))}
              </CandidateGroup>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Team — the resource calendar (addendum v2 §1): "people down, dates
// across." Distinct from Calendar (jobs-over-time) — this is the axis
// Ralto had no view on at all, built to answer "is Kate double-booked in
// November" / "who's actually free that week."
// ---------------------------------------------------------------------------

function dateISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMonthDates(refDate: Date): Date[] {
  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))
}

const DAY_COL_WIDTH = 30
const NAME_COL_WIDTH = 168

// Terminal Booking statuses (Declined/Cancelled) don't occupy a day on the
// grid — addendum v2 §5's own warning about ghosts applies here too.
const ACTIVE_BOOKING_STATUSES = new Set(['pencilled', 'offered', 'confirmed', 'complete', 'conflict'])

// A solid fill can never safely mean "conflict" — a client's own brand
// colour can be red (Man Utd), and a solid confirmed block in that colour
// is then pixel-identical to a solid "conflict" block. Addendum v1 §3's
// rule (status is never colour-only) applies here exactly as it does to
// the client-stripe/status-dot problem it was written for, so conflict
// gets its own fixed hazard-stripe texture — red/white, never the client's
// colour — rather than a flat fill in a colour the palette can collide
// with.
function bookingCellStyle(booking: ResourceCalendarBooking): { background: string; opacity: number } {
  const color = booking.effective_color_hex || '#7A7A78'
  if (booking.status === 'conflict') {
    return { background: `repeating-linear-gradient(135deg, var(--danger), var(--danger) 3px, #fff 3px, #fff 6px)`, opacity: 1 }
  }
  if (booking.status === 'pencilled') {
    return { background: `repeating-linear-gradient(135deg, ${color}, ${color} 3px, transparent 3px, transparent 6px)`, opacity: 1 }
  }
  if (booking.status === 'offered') return { background: color, opacity: 0.5 }
  return { background: color, opacity: 1 } // confirmed, complete
}

// Cell precedence (addendum v2 §1): a Booking overlapping an Unavailable
// Availability row is rendered as BOTH, flagged — never one picked over
// the other, since that overlap is exactly the exception this view exists
// to catch.
function ResourceCalendarCell({ row, date, onOpenJob }: { row: ResourceCalendarRow; date: Date; onOpenJob: (id: string) => void }) {
  const iso = dateISO(date)
  const bookings = row.bookings.filter((b) => ACTIVE_BOOKING_STATUSES.has(b.status) && b.start_date <= iso && b.end_date >= iso)
  const booking = bookings[0]
  const unavailable = row.availability.find((a) => a.status === 'unavailable' && a.start_date <= iso && a.end_date >= iso)
  const tentative = !unavailable && row.availability.find((a) => a.status === 'tentative' && a.start_date <= iso && a.end_date >= iso)
  // Two independent sources of "conflict": a booking directly marked
  // Conflict, or a live booking overlapping an Unavailable row. Either one
  // gets the same badge — the texture in bookingCellStyle only covers the
  // first case, so the badge is what carries the second.
  const conflict = booking?.status === 'conflict' || (!!booking && !!unavailable)

  const style = booking ? bookingCellStyle(booking) : undefined
  const title = booking
    ? `${booking.job_name} — ${booking.role_name} (${booking.status})${unavailable ? ' · also marked unavailable this day' : ''}`
    : unavailable
      ? `Unavailable${unavailable.type ? ` — ${unavailable.type.replace('_', ' ')}` : ''}`
      : tentative
        ? 'Tentative'
        : undefined

  return (
    <div
      title={title}
      onClick={() => booking && onOpenJob(booking.job_id)}
      style={{
        position: 'relative',
        height: 26,
        margin: '2px 1px',
        borderRadius: 4,
        cursor: booking ? 'pointer' : 'default',
        background: style ? style.background : unavailable ? 'var(--danger-bg)' : tentative ? 'var(--attention-bg)' : 'transparent',
        opacity: style?.opacity,
        border: !booking && unavailable ? '1px solid var(--danger)' : !booking && tentative ? '1px solid var(--attention)' : undefined,
        boxSizing: 'border-box',
      }}
    >
      {conflict && (
        <span style={{ position: 'absolute', top: -4, right: -4, width: 13, height: 13, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 1px var(--line)' }}>
          <AlertOctagon size={9} color="var(--danger)" />
        </span>
      )}
    </div>
  )
}

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font)', fontSize: 11.5, color: 'var(--ink-muted)' }}>
      {swatch}
      {label}
    </div>
  )
}

function ResourceCalendarContent({
  people,
  onOpenJob,
  onConvertEvent,
}: {
  people: Person[]
  onOpenJob: (id: string) => void
  onConvertEvent: (event: ProspectiveEvent) => void
}) {
  const [refDate, setRefDate] = useState(new Date())
  const [includeIds, setIncludeIds] = useState<string[]>([])
  const [search, setSearch] = useState('')

  const dates = useMemo(() => getMonthDates(refDate), [refDate])
  const startDate = dateISO(dates[0])
  const endDate = dateISO(dates[dates.length - 1])

  const { data, loading } = useResourceCalendar(startDate, endDate, includeIds)
  const today = new Date()

  const goPrev = () => setRefDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const goNext = () => setRefDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  const goToday = () => setRefDate(new Date())

  // Explicitly-added rows are session state only, never persisted — see
  // addendum v2 §1's "no pinning is persisted in v1."
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q.length < 2) return []
    return people
      .filter((p) => p.employment_type === 'freelancer' && !includeIds.includes(p.id))
      .filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q))
      .slice(0, 6)
  }, [search, people, includeIds])

  const rows = data?.rows ?? []
  const events = data?.prospective_events ?? []

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 24, color: 'var(--ink)' }}>Team</div>
          <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 2 }}>Who's booked, pencilled, or away — by day.</div>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px', background: '#fff', width: 220 }}>
            <Search size={14} color="var(--ink-muted)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Add a freelancer…"
              style={{ border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--ink)', flex: 1 }}
            />
          </div>
          {searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: '110%', right: 0, width: 220, background: '#fff', border: '1px solid var(--line)', borderRadius: 10, boxShadow: '0 8px 20px rgba(0,0,0,0.1)', zIndex: 10, overflow: 'hidden' }}>
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setIncludeIds((ids) => [...ids, p.id])
                    setSearch('')
                  }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--ink)' }}
                >
                  {p.first_name} {p.last_name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button onClick={goPrev} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={15} color="var(--ink-muted)" />
        </button>
        <button onClick={goNext} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronRight size={15} color="var(--ink-muted)" />
        </button>
        <div style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>
          {MONTH_LABELS[refDate.getMonth()]} {refDate.getFullYear()}
        </div>
        <button onClick={goToday} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 14px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, color: 'var(--ink)', cursor: 'pointer' }}>
          Today
        </button>
        {loading && <span style={{ fontFamily: 'var(--font)', fontSize: 11.5, color: 'var(--ink-muted)' }}>Loading…</span>}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 12, background: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `${NAME_COL_WIDTH}px repeat(${dates.length}, ${DAY_COL_WIDTH}px)`, width: 'max-content' }}>
          <div style={{ position: 'sticky', top: 0, left: 0, zIndex: 4, background: 'var(--surface)', borderBottom: '1px solid var(--line)', borderRight: '1px solid var(--line)' }} />
          {dates.map((date) => {
            const iso = dateISO(date)
            const inEvent = events.find((e) => e.date_start <= iso && e.date_end >= iso)
            const isToday = sameDay(date, today)
            return (
              <div
                key={iso}
                title={inEvent ? `${inEvent.name} (prospective) — click to convert to a job` : undefined}
                onClick={inEvent ? () => onConvertEvent(inEvent) : undefined}
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 3,
                  background: inEvent ? 'var(--primary-tint)' : 'var(--surface)',
                  borderBottom: '1px solid var(--line)',
                  textAlign: 'center',
                  padding: '6px 0',
                  fontFamily: 'var(--font)',
                  fontSize: 10,
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? 'var(--primary)' : 'var(--ink-muted)',
                  lineHeight: 1.4,
                  cursor: inEvent ? 'pointer' : 'default',
                }}
              >
                <div>{WEEKDAY_LABELS[(date.getDay() + 6) % 7][0]}</div>
                <div>{date.getDate()}</div>
              </div>
            )
          })}

          {rows.map((row) => (
            <Fragment key={row.person_id}>
              <div
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  background: '#fff',
                  borderRight: '1px solid var(--line)',
                  borderBottom: '1px solid var(--line)',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  minWidth: 0,
                }}
              >
                <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                {row.employment_type === 'freelancer' && includeIds.includes(row.person_id) && (
                  <button
                    onClick={() => setIncludeIds((ids) => ids.filter((id) => id !== row.person_id))}
                    title="Remove from this session's grid"
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink-muted)', marginLeft: 'auto', padding: 2, flexShrink: 0 }}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
              {dates.map((date) => {
                const iso = dateISO(date)
                // Full-height, not header-only — see check 1 write-up: a
                // header tint only works if the scheduler happens to look
                // up while scanning rows, which defeats the point of a
                // background band.
                const inEvent = events.find((e) => e.date_start <= iso && e.date_end >= iso)
                return (
                  <div key={iso} style={{ borderBottom: '1px solid var(--line)', borderRight: '1px solid #F0EFEA', background: inEvent ? 'var(--primary-tint)' : undefined }}>
                    <ResourceCalendarCell row={row} date={date} onOpenJob={onOpenJob} />
                  </div>
                )
              })}
            </Fragment>
          ))}

          {!loading && rows.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '32px 0', textAlign: 'center', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--ink-muted)' }}>
              No one to show for this month — staff appear here always; freelancers show up once they have a booking or availability entry.
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
        <LegendItem swatch={<span style={{ width: 12, height: 8, borderRadius: 3, background: '#7A7A78', display: 'inline-block' }} />} label="Confirmed" />
        <LegendItem
          swatch={<span style={{ width: 12, height: 8, borderRadius: 3, background: 'repeating-linear-gradient(135deg, #7A7A78, #7A7A78 3px, transparent 3px, transparent 6px)', display: 'inline-block' }} />}
          label="Pencilled"
        />
        <LegendItem swatch={<span style={{ width: 12, height: 8, borderRadius: 3, background: '#7A7A78', opacity: 0.5, display: 'inline-block' }} />} label="Offered" />
        <LegendItem swatch={<span style={{ width: 12, height: 8, borderRadius: 3, border: '1px solid var(--danger)', display: 'inline-block' }} />} label="Unavailable" />
        <LegendItem swatch={<AlertOctagon size={12} color="var(--danger)" />} label="Conflict" />
        <LegendItem swatch={<span style={{ width: 12, height: 8, borderRadius: 3, background: 'var(--primary-tint)', display: 'inline-block' }} />} label="Prospective event" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Crew (scheduler's people directory)
//
// Simplification vs. the original mock: the prototype's per-person
// "booked/available/pending" status was hand-authored mock data implying a
// cross-reference against live bookings for every person. Doing that for
// real would mean an aggregate endpoint this Phase 1 backend doesn't have
// yet (see backend/internal/handlers/people.go) — so this screen shows
// each Person's own real fields (role via primary PersonRole isn't fetched
// per-row either, to avoid an N+1 call per card) and filters by
// preferred_status/employment_type instead of a derived booking status.
// ---------------------------------------------------------------------------

const CREW_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'preferred', label: 'Preferred' },
  { key: 'staff', label: 'Staff' },
  { key: 'freelancer', label: 'Freelancer' },
] as const

function PersonCard({ person, onClick }: { person: Person; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: '1px solid var(--line)', borderRadius: 12, background: '#fff', padding: '14px 16px', fontFamily: 'inherit' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 14.5, color: 'var(--ink)' }}>
              {person.first_name} {person.last_name}
            </span>
            {person.preferred_status === 'preferred' && <Star size={12} color="var(--primary)" fill="var(--primary)" />}
          </div>
          <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 2, textTransform: 'capitalize' }}>{person.employment_type}</div>
          {person.base_location && (
            <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'var(--ink-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={11} /> {person.base_location}
            </div>
          )}
        </div>
        <span style={{ flexShrink: 0, fontFamily: 'var(--font)', fontWeight: 600, fontSize: 11, padding: '4px 9px', borderRadius: 999, color: person.active ? 'var(--success)' : 'var(--ink-muted)', background: person.active ? 'var(--success-bg)' : 'var(--track)' }}>
          {person.active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </button>
  )
}

// --- Person detail (Crew screen drill-in) ---
//
// Availability is the first tab built — see addendum v2 §2. PERSON_TABS is
// deliberately an array so Roles/Skills/Documents can be added as further
// tabs later without restructuring this component.

const AVAILABILITY_TYPE_LABEL: Record<AvailabilityType, string> = {
  annual_leave: 'Annual leave',
  sick: 'Sick',
  toil: 'TOIL',
  other: 'Other',
}

const AVAILABILITY_STATUS_LABEL: Record<AvailabilityStatus, string> = {
  available: 'Available',
  unavailable: 'Unavailable',
  tentative: 'Tentative',
  booked: 'Booked',
}

function availabilityStatusColor(status: AvailabilityStatus) {
  if (status === 'unavailable') return { color: 'var(--danger)', bg: 'var(--danger-bg)' }
  if (status === 'tentative') return { color: 'var(--attention)', bg: 'var(--attention-bg)' }
  return { color: 'var(--success)', bg: 'var(--success-bg)' }
}

function AvailabilityRow({ entry, onDelete }: { entry: Availability; onDelete: () => void }) {
  const tone = availabilityStatusColor(entry.status)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px', background: '#fff' }}>
      <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 11.5, padding: '4px 10px', borderRadius: 999, color: tone.color, background: tone.bg, flexShrink: 0 }}>
        {AVAILABILITY_STATUS_LABEL[entry.status]}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: 13.5, color: 'var(--ink)' }}>
          {entry.start_date} – {entry.end_date}
          {entry.type && <span style={{ color: 'var(--ink-muted)' }}> · {AVAILABILITY_TYPE_LABEL[entry.type]}</span>}
        </div>
        {entry.notes && <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{entry.notes}</div>}
      </div>
      <button onClick={onDelete} title="Remove entry" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--ink-muted)' }}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function AddAvailabilityForm({ personId, onSaved, onCancel }: { personId: string; onSaved: () => void; onCancel: () => void }) {
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState(todayISO())
  const [status, setStatus] = useState<AvailabilityStatus>('unavailable')
  const [type, setType] = useState<AvailabilityType | ''>('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const inputStyle = { border: '1px solid var(--line)', borderRadius: 8, padding: '7px 10px', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--ink)', background: '#fff' }

  async function submit() {
    setSaving(true)
    setError(undefined)
    try {
      await createAvailability(personId, {
        start_date: startDate,
        end_date: endDate,
        status,
        type: status === 'unavailable' && type ? type : undefined,
        notes: notes || undefined,
      })
      onSaved()
    } catch {
      setError('Could not save that entry.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ border: '1px solid var(--primary-soft)', background: 'var(--primary-surface)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <span style={{ fontFamily: 'var(--font)', fontSize: 11.5, color: 'var(--ink-muted)' }}>Start date</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <span style={{ fontFamily: 'var(--font)', fontSize: 11.5, color: 'var(--ink-muted)' }}>End date</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <span style={{ fontFamily: 'var(--font)', fontSize: 11.5, color: 'var(--ink-muted)' }}>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as AvailabilityStatus)} style={inputStyle}>
            <option value="unavailable">Unavailable</option>
            <option value="available">Available</option>
            <option value="tentative">Tentative</option>
          </select>
        </label>
        {status === 'unavailable' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            <span style={{ fontFamily: 'var(--font)', fontSize: 11.5, color: 'var(--ink-muted)' }}>Reason</span>
            <select value={type} onChange={(e) => setType(e.target.value as AvailabilityType | '')} style={inputStyle}>
              <option value="">Unspecified</option>
              <option value="annual_leave">Annual leave</option>
              <option value="sick">Sick</option>
              <option value="toil">TOIL</option>
              <option value="other">Other</option>
            </select>
          </label>
        )}
      </div>
      <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" style={inputStyle} />
      {error && <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'var(--danger)' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ border: '1px solid var(--line)', background: '#fff', borderRadius: 8, padding: '7px 14px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', color: 'var(--ink-muted)' }}>
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving || !startDate || !endDate}
          style={{ border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 8, padding: '7px 14px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : 'Add entry'}
        </button>
      </div>
    </div>
  )
}

function PersonAvailabilityTab({ person }: { person: Person }) {
  const { data: entries, loading, reload } = useAvailability(person.id)
  const [adding, setAdding] = useState(false)

  const sorted = useMemo(() => [...entries].sort((a, b) => a.start_date.localeCompare(b.start_date)), [entries])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 14, color: 'var(--ink-muted)' }}>Availability</span>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 8, padding: '7px 12px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}
          >
            <Plus size={13} /> Add entry
          </button>
        )}
      </div>

      {adding && (
        <div style={{ marginBottom: 14 }}>
          <AddAvailabilityForm
            personId={person.id}
            onCancel={() => setAdding(false)}
            onSaved={() => {
              setAdding(false)
              reload()
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((entry) => (
          <AvailabilityRow key={entry.id} entry={entry} onDelete={() => deleteAvailability(person.id, entry.id).then(reload)} />
        ))}
        {!loading && sorted.length === 0 && !adding && (
          <div style={{ fontFamily: 'var(--font)', fontSize: 13, color: 'var(--ink-muted)', padding: '12px 0' }}>No availability entries logged yet.</div>
        )}
      </div>
    </div>
  )
}

type PersonTabKey = 'availability'
const PERSON_TABS: { key: PersonTabKey; label: string }[] = [{ key: 'availability', label: 'Availability' }]

function PersonDetail({ person, onBack }: { person: Person; onBack: () => void }) {
  const [tab, setTab] = useState<PersonTabKey>('availability')

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer', padding: 0, marginBottom: 16, fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, color: 'var(--ink-muted)' }}
      >
        <ChevronLeft size={14} /> Crew
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 22, color: 'var(--ink)' }}>
            {person.first_name} {person.last_name}
          </span>
          {person.preferred_status === 'preferred' && <Star size={14} color="var(--primary)" fill="var(--primary)" />}
        </div>
        <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 11, padding: '4px 9px', borderRadius: 999, color: person.active ? 'var(--success)' : 'var(--ink-muted)', background: person.active ? 'var(--success-bg)' : 'var(--track)' }}>
          {person.active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font)', fontSize: 13, color: 'var(--ink-muted)', textTransform: 'capitalize', marginBottom: 18 }}>
        {person.employment_type}
        {person.base_location ? ` · ${person.base_location}` : ''}
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 18 }}>
        {PERSON_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '8px 4px',
              marginRight: 20,
              fontFamily: 'var(--font)',
              fontWeight: 600,
              fontSize: 13,
              color: tab === t.key ? 'var(--primary)' : 'var(--ink-muted)',
              borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'availability' && <PersonAvailabilityTab person={person} />}
    </div>
  )
}

function CrewContent({ people }: { people: Person[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof CREW_FILTERS)[number]['key']>('all')
  const [selectedPersonId, setSelectedPersonId] = useState<string | undefined>(undefined)

  const filtered = useMemo(() => {
    let list = people.filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(query.toLowerCase()))
    if (filter === 'preferred') list = list.filter((p) => p.preferred_status === 'preferred')
    if (filter === 'staff' || filter === 'freelancer') list = list.filter((p) => p.employment_type === filter)
    return list
  }, [people, query, filter])

  const selectedPerson = people.find((p) => p.id === selectedPersonId)
  if (selectedPerson) {
    return <PersonDetail person={selectedPerson} onBack={() => setSelectedPersonId(undefined)} />
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 24, color: 'var(--ink)' }}>Crew</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px', background: '#fff', width: 260 }}>
          <Search size={15} color="var(--ink-muted)" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name" style={{ border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 13.5, color: 'var(--ink)', flex: 1 }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {CREW_FILTERS.map((f) => {
          const isActive = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{ background: isActive ? 'var(--primary)' : '#fff', color: isActive ? '#fff' : 'var(--ink-muted)', border: isActive ? 'none' : '1px solid var(--line)', borderRadius: 999, padding: '7px 16px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {filtered.map((p) => (
          <PersonCard key={p.id} person={p} onClick={() => setSelectedPersonId(p.id)} />
        ))}
        {filtered.length === 0 && <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', fontFamily: 'var(--font)', fontSize: 13.5, color: 'var(--ink-muted)' }}>No one matches.</div>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Suite — the "Simplified Suite" core landing view (unchanged from the
// prototype — purely navigational, no live data of its own yet since no
// suite-core service exists).
// ---------------------------------------------------------------------------

const CORE_CAPABILITIES = ['Organisation', 'Users & permissions', 'Clients', 'Projects / Jobs', 'Locations', 'Shared identifiers', 'Integrations']

const SUITE_PRODUCTS = [
  { key: 'ralto', name: 'RALTO', tagline: 'Crewing, simplified.', color: '#453E96', available: true },
  { key: 'equiptra', name: 'EQUIPTRA', tagline: 'Equipment management, simplified.', color: '#4F7693', available: false },
  { key: 'expentra', name: 'EXPENTRA', tagline: 'Business expenses, simplified.', color: '#4BA38B', available: false },
] as const

function SuiteMark({ color = '#fff' }: { color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ width: 22, height: 4, borderRadius: 2, background: color }} />
      <div style={{ width: 17, height: 4, borderRadius: 2, background: color }} />
      <div style={{ width: 12, height: 4, borderRadius: 2, background: color }} />
    </div>
  )
}

function SuiteContent({ onEnterRalto }: { onEnterRalto: () => void }) {
  return (
    <div style={{ flex: 1, background: '#141E2A', overflowY: 'auto', padding: '32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <SuiteMark />
        <span style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 20, color: '#fff', letterSpacing: 0.3 }}>SIMPLIFIED SUITE</span>
      </div>
      <div style={{ fontFamily: 'var(--font)', fontSize: 13.5, color: 'rgba(255,255,255,0.6)', marginBottom: 32 }}>Shared platform / neutral shell</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 40, maxWidth: 720 }}>
        {CORE_CAPABILITIES.map((c) => (
          <div key={c} style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: '12px 16px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
            {c}
          </div>
        ))}
      </div>

      <div style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12.5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>Your products</div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {SUITE_PRODUCTS.map((p) => (
          <button
            key={p.key}
            onClick={() => p.available && onEnterRalto()}
            disabled={!p.available}
            style={{ width: 220, textAlign: 'left', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12, padding: '16px 18px', cursor: p.available ? 'pointer' : 'default', opacity: p.available ? 1 : 0.45 }}
          >
            <SuiteMark color={p.color} />
            <div style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 14, color: '#fff', marginTop: 10, letterSpacing: 0.3 }}>{p.name}</div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>{p.available ? p.tagline : 'Not in this workspace'}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root app — the only thing that owns navigation state
// ---------------------------------------------------------------------------

export function RaltoDesktopApp() {
  const [active, setActive] = useState<NavKey>('today')
  const [inSuite, setInSuite] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(undefined)
  const [selectedPlannerJobId, setSelectedPlannerJobId] = useState<string | undefined>(undefined)
  const [jobPrefill, setJobPrefill] = useState<JobCreatePrefill | undefined>(undefined)

  const { summaries, reload: reloadSummaries } = useJobSummaries()
  const { data: clientsList } = useClients()
  const { data: venuesList } = useVenues()
  const { data: projectsList } = useProjects()
  const { data: rolesList } = useRoles()
  const { data: people } = usePeople()
  const { data: alerts, reload: reloadAlerts } = useAlerts()

  const clients = useMemo(() => indexById(clientsList), [clientsList])
  const venues = useMemo(() => indexById(venuesList), [venuesList])

  const openJobFromCalendar = (jobId: string) => {
    setSelectedPlannerJobId(jobId)
    setActive('planner')
  }

  // Conversion is a thin layer on top of job creation (addendum v2 §3):
  // pre-fill the same form from the event's own fields and jump to Jobs.
  // client_id may be null on the event — the form just leaves that field
  // blank, since Job.client_id is required and the scheduler has to
  // supply it regardless.
  const convertEventToJob = (event: ProspectiveEvent) => {
    setJobPrefill({
      name: event.name,
      start_date: event.date_start,
      end_date: event.date_end,
      client_id: event.client_id,
      fromProspectiveEventId: event.id,
    })
    setSelectedJobId(undefined)
    setActive('jobs')
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0', background: '#E7E5E1' }}>
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

      <div style={{ width: 1240, height: 800, background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', boxShadow: '0 30px 60px rgba(23,21,31,0.20)', overflow: 'hidden', display: 'flex' }}>
        {inSuite ? (
          <SuiteContent onEnterRalto={() => setInSuite(false)} />
        ) : (
          <>
            <Sidebar active={active} onSelect={setActive} onOpenSuite={() => setInSuite(true)} />
            {active === 'today' && <TodayContent summaries={summaries} clients={clients} alerts={alerts} reloadAlerts={reloadAlerts} />}
            {active === 'calendar' && <CalendarContent summaries={summaries} clients={clients} onOpenJob={openJobFromCalendar} onConvertEvent={convertEventToJob} />}
            {active === 'team' && <ResourceCalendarContent people={people} onOpenJob={openJobFromCalendar} onConvertEvent={convertEventToJob} />}
            {active === 'jobs' && (
              <JobsContent
                summaries={summaries}
                clients={clients}
                venues={venues}
                venuesList={venuesList}
                projects={projectsList}
                roles={rolesList}
                selectedId={selectedJobId}
                onSelect={setSelectedJobId}
                reloadSummaries={reloadSummaries}
                prefill={jobPrefill}
                onConsumedPrefill={() => setJobPrefill(undefined)}
              />
            )}
            {active === 'planner' && <PlannerContent summaries={summaries} clients={clients} selectedJobId={selectedPlannerJobId} onSelectJob={setSelectedPlannerJobId} reloadSummaries={reloadSummaries} />}
            {active === 'crew' && <CrewContent people={people} />}
          </>
        )}
      </div>
    </div>
  )
}
