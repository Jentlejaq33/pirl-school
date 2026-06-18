import { Navigate } from 'react-router-dom'
import { useAuth } from './auth'

export function RequireAuth({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="center muted">Loading…</div>
  if (!session) return <Navigate to="/login" replace />
  return children
}

// Gate a route to specific roles. Falls back to the dashboard if not allowed.
export function RequireRole({ roles, children }) {
  const { role, loading } = useAuth()
  if (loading) return <div className="center muted">Loading…</div>
  if (!roles.includes(role)) return <Navigate to="/" replace />
  return children
}
