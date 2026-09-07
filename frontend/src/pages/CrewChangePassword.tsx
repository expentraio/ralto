import { useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { useCrewAuth, ApiError } from '../context/CrewAuthContext'
import type { Person } from '../types'

// Mirrors StaffChangePassword.tsx for the crew persona. This one matters
// more in practice: every crew account is created by a scheduler with a
// temporary password, for someone outside the company, holding their own
// rate and contact details — so an unenforced temporary password staying
// valid indefinitely is a real exposure, not just a rough edge.
export function CrewChangePassword() {
  const { updatePerson } = useCrewAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      const updated = await api.patch<Person>('/crew/password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      updatePerson(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F5F7F8', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', padding: 20 }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 340, background: '#fff', border: '1px solid #DCE3E7', borderRadius: 16, padding: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 20, color: '#18232E', marginBottom: 4 }}>RALTO</div>
        <div style={{ fontSize: 13, color: '#667085', marginBottom: 24 }}>Set a new password to continue</div>

        <label style={{ display: 'block', fontSize: 12.5, color: '#667085', marginBottom: 4 }}>Current (temporary) password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #DCE3E7', marginBottom: 14, fontSize: 14 }}
        />
        <label style={{ display: 'block', fontSize: 12.5, color: '#667085', marginBottom: 4 }}>New password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #DCE3E7', marginBottom: 14, fontSize: 14 }}
        />
        <label style={{ display: 'block', fontSize: 12.5, color: '#667085', marginBottom: 4 }}>Confirm new password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #DCE3E7', marginBottom: 14, fontSize: 14 }}
        />

        {error && <div style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
        <button
          type="submit"
          disabled={submitting}
          style={{ width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', background: '#453E96', color: '#fff', fontWeight: 600, fontSize: 14, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? 'Saving…' : 'Set password'}
        </button>
      </form>
    </div>
  )
}
