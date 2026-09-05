import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, ApiError } from '../lib/api'
import type { Person } from '../types'

interface CrewAuthContextValue {
  person: Person | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updatePerson: (person: Person) => void
}

const CrewAuthContext = createContext<CrewAuthContextValue | undefined>(undefined)

// A separate provider/hook from StaffAuthContext — not just a different
// permission check, a structurally different session (ralto_crew_session
// cookie, /api/crew/* endpoints) matching the backend's two-persona split.
export function CrewAuthProvider({ children }: { children: ReactNode }) {
  const [person, setPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<Person>('/crew/me')
      .then(setPerson)
      .catch(() => setPerson(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const loggedInPerson = await api.post<Person>('/crew/auth/login', { email, password })
    setPerson(loggedInPerson)
  }

  async function logout() {
    await api.post('/crew/auth/logout')
    setPerson(null)
  }

  function updatePerson(next: Person) {
    setPerson(next)
  }

  return <CrewAuthContext.Provider value={{ person, loading, login, logout, updatePerson }}>{children}</CrewAuthContext.Provider>
}

export function useCrewAuth() {
  const ctx = useContext(CrewAuthContext)
  if (!ctx) throw new Error('useCrewAuth must be used within CrewAuthProvider')
  return ctx
}

export { ApiError }
