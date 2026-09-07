import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import type {
  Availability,
  AvailabilityStatus,
  AvailabilityType,
  Booking,
  CandidateGroups,
  Client,
  Job,
  JobCommitment,
  JobRequirementWithCounts,
  JobStatus,
  OperationalAlert,
  Person,
  Project,
  ProspectiveEvent,
  ResourceCalendarResponse,
  Role,
  Venue,
} from '../types'

// Shared read/write hooks for the scheduler apps (desktop + mobile) — one
// place to fetch each resource so both prototype shells stay in sync
// rather than duplicating fetch logic per screen.

function useCollection<T>(path: string) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setLoading(true)
    return api
      .get<T[]>(path)
      .then(setData)
      .finally(() => setLoading(false))
  }, [path])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, reload }
}

export function useJobs() {
  return useCollection<Job>('/jobs')
}

export function useClients() {
  return useCollection<Client>('/clients')
}

export function useVenues() {
  return useCollection<Venue>('/venues')
}

export function usePeople() {
  return useCollection<Person>('/people')
}

export function useAlerts() {
  return useCollection<OperationalAlert>('/alerts')
}

export function useRoles() {
  return useCollection<Role>('/roles')
}

export function useProjects() {
  return useCollection<Project>('/projects')
}

export interface CreateJobInput {
  name: string
  client_id: string
  project_id?: string
  venue_id?: string
  project_reference?: string
  start_date: string
  end_date: string
  status: JobStatus
  commitment: JobCommitment
  notes?: string
}

export function createJob(input: CreateJobInput) {
  return api.post<Job>('/jobs', input)
}

export function createJobRequirement(
  jobId: string,
  input: { role_id: string; quantity_required: number; start_date: string; end_date: string; call_time?: string; notes?: string },
) {
  return api.post(`/jobs/${jobId}/requirements`, input)
}

export function createJobContact(jobId: string, input: { name: string; role_title?: string; email?: string; phone?: string }) {
  return api.post(`/jobs/${jobId}/contacts`, input)
}

export function convertProspectiveEvent(eventId: string, jobId: string) {
  return api.post(`/prospective-events/${eventId}/convert`, { job_id: jobId })
}

export function useProspectiveEvents() {
  return useCollection<ProspectiveEvent>('/prospective-events')
}

export function createProspectiveEvent(input: { name: string; date_start: string; date_end: string; client_id?: string; notes?: string }) {
  return api.post('/prospective-events', input)
}

export function dropProspectiveEvent(id: string) {
  return api.post(`/prospective-events/${id}/drop`)
}

// useResourceCalendar — the "people down, dates across" read model
// (addendum v2 §1). includeIds is session state the caller owns (a
// scheduler searching in a specific freelancer to check against the
// grid) — not persisted, so it's just re-sent on every request.
export function useResourceCalendar(startDate: string, endDate: string, includeIds: string[]) {
  const [data, setData] = useState<ResourceCalendarResponse | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const includeKey = includeIds.join(',')

  const reload = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ start: startDate, end: endDate })
    if (includeKey) params.set('include', includeKey)
    return api
      .get<ResourceCalendarResponse>(`/resource-calendar?${params.toString()}`)
      .then(setData)
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, includeKey])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, reload }
}

export function useJobRequirements(jobId: string | undefined) {
  const [data, setData] = useState<JobRequirementWithCounts[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    if (!jobId) return Promise.resolve()
    setLoading(true)
    return api
      .get<JobRequirementWithCounts[]>(`/jobs/${jobId}/requirements`)
      .then(setData)
      .finally(() => setLoading(false))
  }, [jobId])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, reload }
}

export function useCandidates(requirementId: string | undefined) {
  const [data, setData] = useState<CandidateGroups>({
    suitable: [],
    possible: [],
    unavailable: [],
    already_asked: { awaiting_response: [], declined: [] },
  })
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    if (!requirementId) return Promise.resolve()
    setLoading(true)
    return api
      .get<CandidateGroups>(`/job-requirements/${requirementId}/candidates`)
      .then(setData)
      .finally(() => setLoading(false))
  }, [requirementId])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, reload }
}

export function useBookingsForRequirement(requirementId: string | undefined) {
  const [data, setData] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    if (!requirementId) return Promise.resolve()
    setLoading(true)
    return api
      .get<Booking[]>(`/job-requirements/${requirementId}/bookings`)
      .then(setData)
      .finally(() => setLoading(false))
  }, [requirementId])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, reload }
}

export function useAvailability(personId: string | undefined) {
  const [data, setData] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    if (!personId) return Promise.resolve()
    setLoading(true)
    return api
      .get<Availability[]>(`/people/${personId}/availability`)
      .then(setData)
      .finally(() => setLoading(false))
  }, [personId])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, reload }
}

export function createAvailability(
  personId: string,
  input: { start_date: string; end_date: string; status: AvailabilityStatus; type?: AvailabilityType; notes?: string },
) {
  return api.post(`/people/${personId}/availability`, input)
}

export function deleteAvailability(personId: string, availabilityId: string) {
  return api.delete(`/people/${personId}/availability/${availabilityId}`)
}

export function resolveAlert(id: string) {
  return api.post(`/alerts/${id}/resolve`)
}

export function offerBooking(
  requirementId: string,
  personId: string,
  startDate: string,
  endDate: string,
  callTime?: string,
  status: 'offered' | 'pencilled' = 'offered',
) {
  return api.post(`/job-requirements/${requirementId}/bookings`, {
    person_id: personId,
    start_date: startDate,
    end_date: endDate,
    call_time: callTime,
    status,
  })
}

// clientById/venueById — small helpers for the many places the prototypes
// display a job's client name/colour or venue name given only the id FK.
export function indexById<T extends { id: string }>(items: T[]): Record<string, T> {
  const out: Record<string, T> = {}
  for (const item of items) out[item.id] = item
  return out
}

export interface JobSummary {
  job: Job
  requirements: JobRequirementWithCounts[]
  required: number
  confirmed: number
  pencilled: number
  offered: number
}

// useJobSummaries fetches every job's requirements alongside the job list —
// an N+1 pattern that's fine at Phase 1's scale (manual data entry, a
// handful of live jobs) and avoids adding a bespoke aggregate endpoint for
// what the Jobs/Today/Calendar screens all need: crewing totals per job.
export function useJobSummaries() {
  const [summaries, setSummaries] = useState<JobSummary[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const freshJobs = await api.get<Job[]>('/jobs')
    const withRequirements = await Promise.all(
      freshJobs.map(async (job) => {
        const requirements = await api.get<JobRequirementWithCounts[]>(`/jobs/${job.id}/requirements`)
        const required = requirements.reduce((sum, r) => sum + r.quantity_required, 0)
        const confirmed = requirements.reduce((sum, r) => sum + r.quantity_confirmed, 0)
        const pencilled = requirements.reduce((sum, r) => sum + r.quantity_pencilled, 0)
        const offered = requirements.reduce((sum, r) => sum + r.quantity_offered, 0)
        return { job, requirements, required, confirmed, pencilled, offered }
      }),
    )
    setSummaries(withRequirements)
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { summaries, loading, reload }
}
