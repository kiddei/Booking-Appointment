import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ADMIN_ROLES      = ['ADMIN', 'SUPER_ADMIN']
const SUPER_ADMIN_ROLE = 'SUPER_ADMIN'

export default function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false }) {
  const { user, loading } = useAuth()
  const location          = useLocation()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    )
  }

  if (!user) {
    const loginPath = (adminOnly || superAdminOnly) ? '/admin/login' : '/login'
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  if (superAdminOnly && user.role !== SUPER_ADMIN_ROLE) {
    if (ADMIN_ROLES.includes(user.role)) return <Navigate to="/admin" replace />
    return <Navigate to="/dashboard" replace />
  }

  if (adminOnly && !ADMIN_ROLES.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
