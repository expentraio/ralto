// Postgres TIME columns come back as "HH:MM:SS" text (see backend/internal/db/db.go's
// SimpleProtocol note) — trim the seconds for display everywhere a call time is shown.
export function formatTime(time: string | undefined): string | undefined {
  return time?.slice(0, 5)
}
