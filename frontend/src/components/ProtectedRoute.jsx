import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    )
  }

  if (!user) return <Navigate to="/auth/login" replace />

  if (adminOnly && user.role !== 'ROLE_ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
