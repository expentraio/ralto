import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { StaffAuthProvider, useStaffAuth } from './context/StaffAuthContext'
import { CrewAuthProvider, useCrewAuth } from './context/CrewAuthContext'
import { StaffLogin } from './pages/StaffLogin'
import { CrewLogin } from './pages/CrewLogin'
import { RaltoDesktopApp } from './pages/scheduler/RaltoDesktopApp'
import { RaltoMobileApp } from './pages/scheduler/RaltoMobileApp'
import { RaltoCrewApp } from './pages/crew/RaltoCrewApp'

// One React codebase serves desktop and mobile (per Phase 1 scope): the
// scheduler shell picks a layout by viewport width. The crew persona is a
// structurally separate app (/crew/*) with its own session/auth context —
// not just a different route, a different cookie entirely (see
// backend/internal/middleware/auth.go's staff/crew split).
const MOBILE_BREAKPOINT = 768

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

function SchedulerShell() {
  const { user, loading } = useStaffAuth()
  const isMobile = useIsMobileViewport()

  if (loading) return null
  if (!user) return <StaffLogin />
  return isMobile ? <RaltoMobileApp /> : <RaltoDesktopApp />
}

function CrewShell() {
  const { person, loading } = useCrewAuth()

  if (loading) return null
  if (!person) return <CrewLogin />
  return <RaltoCrewApp />
}

export function App() {
  return (
    <Routes>
      <Route
        path="/crew/*"
        element={
          <CrewAuthProvider>
            <CrewShell />
          </CrewAuthProvider>
        }
      />
      <Route
        path="/*"
        element={
          <StaffAuthProvider>
            <SchedulerShell />
          </StaffAuthProvider>
        }
      />
    </Routes>
  )
}
