import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'

import HomePage          from './pages/HomePage'
import HowItWorksPage    from './pages/HowItWorksPage'
import LoginPage         from './pages/LoginPage'
import AdminLoginPage    from './pages/AdminLoginPage'
import RegisterPage      from './pages/RegisterPage'
import CourtsPage        from './pages/CourtsPage'
import DashboardPage     from './pages/DashboardPage'
import BookingPage       from './pages/BookingPage'
import BookingDetailPage    from './pages/BookingDetailPage'
import AdminPage            from './pages/AdminPage'
import SuperAdminPage       from './pages/SuperAdminPage'
import CompleteProfilePage  from './pages/CompleteProfilePage'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/"              element={<HomePage />} />
        <Route path="/about"         element={<HowItWorksPage />} />
        <Route path="/courts"        element={<CourtsPage />} />

        {/* Auth — separate portals */}
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/admin/login"   element={<AdminLoginPage />} />
        <Route path="/auth/register"         element={<RegisterPage />} />
        <Route path="/auth/complete-profile" element={<CompleteProfilePage />} />

        {/* Backward-compat redirect: old /auth/login → /login */}
        <Route path="/auth/login"    element={<Navigate to="/login" replace />} />

        {/* Player-protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        }/>
        <Route path="/bookings/new" element={
          <ProtectedRoute><BookingPage /></ProtectedRoute>
        }/>
        <Route path="/bookings/:id" element={
          <ProtectedRoute><BookingDetailPage /></ProtectedRoute>
        }/>

        {/* Admin-only routes (ADMIN + SUPER_ADMIN) */}
        <Route path="/admin/*" element={
          <ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>
        }/>

        {/* Super Admin-only routes */}
        <Route path="/superadmin/*" element={
          <ProtectedRoute superAdminOnly><SuperAdminPage /></ProtectedRoute>
        }/>
      </Routes>
      <Footer />
      </ToastProvider>
    </AuthProvider>
  )
}
