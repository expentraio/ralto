import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import type {
  Booking,
  CandidateGroups,
  Client,
  Job,
  JobRequirementWithCounts,
  OperationalAlert,
  Person,
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
  const [data, setData] = useState<CandidateGroups>({ suitable: [], possible: [], unavailable: [] })
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

export function resolveAlert(id: string) {
  return api.post(`/alerts/${id}/resolve`)
}

export function offerBooking(requirementId: string, personId: string, startDate: string, endDate: string, callTime?: string) {
  return api.post(`/job-requirements/${requirementId}/bookings`, {
    person_id: personId,
    start_date: startDate,
    end_date: endDate,
    call_time: callTime,
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
        const offered = requirements.reduce((sum, r) => sum + r.quantity_offered, 0)
        return { job, requirements, required, confirmed, offered }
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
