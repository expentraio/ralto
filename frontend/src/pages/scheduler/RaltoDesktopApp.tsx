import { useEffect, useMemo, useState } from 'react'
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
} from 'lucide-react'
import { api } from '../../lib/api'
import { useStaffAuth } from '../../context/StaffAuthContext'
import { useAlerts, useClients, useVenues, useJobSummaries, usePeople, useCandidates, indexById, resolveAlert, offerBooking, type JobSummary } from '../../lib/hooks'
import type { Client, Job, JobContact, JobRequirementWithCounts, OperationalAlert, Person } from '../../types'

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

function packWeek(weekDates: Date[], jobs: CalendarJob[]) {
  const weekStart = weekDates[0]
  const weekEnd = addDays(weekDates[6], 1)

  const overlapping = jobs
    .map((job) => {
      const jobStart = new Date(job.start + 'T00:00:00')
      const jobEnd = addDays(new Date(job.end + 'T00:00:00'), 1)
      if (jobEnd <= weekStart || jobStart >= weekEnd) return null
      const clippedStart = jobStart < weekStart ? weekStart : jobStart
      const clippedEndExclusive = jobEnd > weekEnd ? weekEnd : jobEnd
      const startCol = Math.round((clippedStart.getTime() - weekStart.getTime()) / DAY_MS)
      const endCol = Math.round((clippedEndExclusive.getTime() - weekStart.getTime()) / DAY_MS) - 1
      return { job, startCol, endCol, jobStart }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.jobStart.getTime() - b.jobStart.getTime() || a.startCol - b.startCol)

  const laneEnds: number[] = []
  const placed: Array<{ job: CalendarJob; startCol: number; endCol: number; lane: number }> = []
  for (const item of overlapping) {
    let lane = laneEnds.findIndex((end) => end < item.startCol)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(item.endCol)
    } else {
      laneEnds[lane] = item.endCol
    }
    placed.push({ ...item, lane })
  }
  return { placed, laneCount: laneEnds.length }
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function WeekRow({ weekDates, referenceMonth, tall, jobs, onOpenJob }: { weekDates: Date[]; referenceMonth: number; tall: boolean; jobs: CalendarJob[]; onOpenJob: (id: string) => void }) {
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

function CalendarContent({ summaries, clients, onOpenJob }: { summaries: JobSummary[]; clients: Record<string, Client>; onOpenJob: (id: string) => void }) {
  const [mode, setMode] = useState<'month' | 'week'>('month')
  const [refDate, setRefDate] = useState(new Date())

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
          <WeekRow key={i} weekDates={weekDates} referenceMonth={refDate.getMonth()} tall={mode === 'week'} jobs={calendarJobs} onOpenJob={onOpenJob} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

function urgencyFor(summary: JobSummary) {
  const unfilled = summary.required - summary.confirmed - summary.offered
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
          <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 14, color: quiet ? 'var(--ink-muted)' : 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{summary.job.name}</span>
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
  const unfilled = req.quantity_required - req.quantity_confirmed - req.quantity_offered
  const pct = req.quantity_required > 0 ? (req.quantity_confirmed / req.quantity_required) * 100 : 0
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
        <div style={{ height: 5, borderRadius: 999, background: 'var(--track)', overflow: 'hidden', marginTop: 7 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: unfilled > 0 ? 'var(--attention)' : 'var(--success)' }} />
        </div>
      </div>
      <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: statusBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <StatusIcon size={12} color={statusColor} strokeWidth={2.5} />
      </div>
    </div>
  )
}

function JobsContent({ summaries, clients, venues, selectedId, onSelect }: { summaries: JobSummary[]; clients: Record<string, Client>; venues: Record<string, unknown>; selectedId: string | undefined; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [contacts, setContacts] = useState<JobContact[]>([])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return summaries.filter((s) => s.job.name.toLowerCase().includes(q) || (clients[s.job.client_id]?.name ?? '').toLowerCase().includes(q))
  }, [summaries, clients, query])

  const selected = summaries.find((s) => s.job.id === selectedId) ?? summaries[0]

  useEffect(() => {
    if (!selected) return
    api.get<JobContact[]>(`/jobs/${selected.job.id}/contacts`).then(setContacts).catch(() => setContacts([]))
  }, [selected?.job.id])

  if (!selected) {
    return <div style={{ flex: 1, padding: 32, fontFamily: 'var(--font)', color: 'var(--ink-muted)' }}>No jobs yet — create one to get started.</div>
  }

  const u = urgencyFor(selected)
  const client = clients[selected.job.client_id]
  const venueName = selected.job.venue_id ? (venues[selected.job.venue_id] as { name: string } | undefined)?.name : undefined
  const primaryContact = contacts[0]

  return (
    <>
      <div style={{ width: 380, flexShrink: 0, borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 20px 16px' }}>
          <div style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 22, color: 'var(--ink)', marginBottom: 14 }}>Jobs</div>
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
        </div>

        <div style={{ display: 'flex', gap: 32, marginTop: 8, borderBottom: '1px solid var(--line)', paddingBottom: 4 }}>
          <InfoRow icon={CalendarDays} label="Dates" value={`${selected.job.start_date} – ${selected.job.end_date}`} />
          <InfoRow icon={MapPin} label="Venue" value={venueName ?? 'Not set'} />
          <InfoRow icon={Phone} label="Production contact" value={primaryContact ? `${primaryContact.name}${primaryContact.phone ? ' · ' + primaryContact.phone : ''}` : 'Not yet assigned'} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '24px 0 12px' }}>
          <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 14, color: 'var(--ink-muted)' }}>Crewing by role</span>
          <span style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: 'var(--ink-muted)' }}>
            {selected.confirmed}/{selected.required} total
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
      <div style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{summary.job.name}</div>
      <div style={{ fontFamily: 'var(--font)', fontVariantNumeric: 'tabular-nums', fontSize: 12, marginTop: 3, color: complete ? 'var(--success)' : 'var(--attention)', fontWeight: 600 }}>
        {confirmed}/{required} confirmed
      </div>
    </button>
  )
}

function RequirementRow({ req, active, onOpen }: { req: JobRequirementWithCounts; active: boolean; onOpen: (req: JobRequirementWithCounts) => void }) {
  const unfilled = req.quantity_required - req.quantity_confirmed - req.quantity_offered
  const pctConfirmed = req.quantity_required > 0 ? (req.quantity_confirmed / req.quantity_required) * 100 : 0
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
        <div style={{ marginTop: 8, height: 6, borderRadius: 999, background: 'var(--track)', overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${pctConfirmed}%`, background: 'var(--success)' }} />
          <div style={{ width: `${pctOffered}%`, background: 'var(--attention)' }} />
        </div>
        {unfilled > 0 && (
          <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'var(--attention)', marginTop: 6 }}>
            {unfilled} unfilled{req.quantity_offered > 0 ? ` · ${req.quantity_offered} offered` : ''}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: statusBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <StatusIcon size={12} color={statusColor} strokeWidth={2.5} />
      </div>
    </button>
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
    setActiveReq(summary.requirements.find((r) => r.quantity_required - r.quantity_confirmed - r.quantity_offered > 0) ?? summary.requirements[0])
  }, [summary?.job.id, summary?.requirements])

  const { data: pool, reload: reloadCandidates } = useCandidates(activeReq?.id)

  async function handleOffer(personId: string) {
    if (!activeReq) return
    await offerBooking(activeReq.id, personId, activeReq.start_date, activeReq.end_date, activeReq.call_time)
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
                  <button
                    onClick={() => handleOffer(c.person_id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                  >
                    <Check size={12} /> Offer
                  </button>
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
                  <button
                    onClick={() => handleOffer(c.person_id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 12px', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                  >
                    <Check size={12} /> Offer
                  </button>
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
          </div>
        </div>
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

function PersonCard({ person }: { person: Person }) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 12, background: '#fff', padding: '14px 16px' }}>
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
    </div>
  )
}

function CrewContent({ people }: { people: Person[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof CREW_FILTERS)[number]['key']>('all')

  const filtered = useMemo(() => {
    let list = people.filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(query.toLowerCase()))
    if (filter === 'preferred') list = list.filter((p) => p.preferred_status === 'preferred')
    if (filter === 'staff' || filter === 'freelancer') list = list.filter((p) => p.employment_type === filter)
    return list
  }, [people, query, filter])

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
          <PersonCard key={p.id} person={p} />
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

  const { summaries, reload: reloadSummaries } = useJobSummaries()
  const { data: clientsList } = useClients()
  const { data: venuesList } = useVenues()
  const { data: people } = usePeople()
  const { data: alerts, reload: reloadAlerts } = useAlerts()

  const clients = useMemo(() => indexById(clientsList), [clientsList])
  const venues = useMemo(() => indexById(venuesList), [venuesList])

  const openJobFromCalendar = (jobId: string) => {
    setSelectedPlannerJobId(jobId)
    setActive('planner')
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
            {active === 'calendar' && <CalendarContent summaries={summaries} clients={clients} onOpenJob={openJobFromCalendar} />}
            {active === 'jobs' && <JobsContent summaries={summaries} clients={clients} venues={venues} selectedId={selectedJobId} onSelect={setSelectedJobId} />}
            {active === 'planner' && <PlannerContent summaries={summaries} clients={clients} selectedJobId={selectedPlannerJobId} onSelectJob={setSelectedPlannerJobId} reloadSummaries={reloadSummaries} />}
            {active === 'crew' && <CrewContent people={people} />}
          </>
        )}
      </div>
    </div>
  )
}
