import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, ApiError } from '../lib/api'
import type { StaffUser } from '../types'

interface StaffAuthContextValue {
  user: StaffUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: StaffUser) => void
}

const StaffAuthContext = createContext<StaffAuthContextValue | undefined>(undefined)

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<StaffUser>('/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const loggedInUser = await api.post<StaffUser>('/auth/login', { email, password })
    setUser(loggedInUser)
  }

  async function logout() {
    await api.post('/auth/logout')
    setUser(null)
  }

  // Used after changing the password, which already returns the full
  // updated user (must_change_password cleared) alongside a fresh session
  // cookie — no need for a separate /me round-trip.
  function updateUser(next: StaffUser) {
    setUser(next)
  }

  return <StaffAuthContext.Provider value={{ user, loading, login, logout, updateUser }}>{children}</StaffAuthContext.Provider>
}

export function useStaffAuth() {
  const ctx = useContext(StaffAuthContext)
  if (!ctx) throw new Error('useStaffAuth must be used within StaffAuthProvider')
  return ctx
}

export { ApiError }
