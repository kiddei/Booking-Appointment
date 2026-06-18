import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'

import HomePage          from './pages/HomePage'
import LoginPage         from './pages/LoginPage'
import AdminLoginPage    from './pages/AdminLoginPage'
import RegisterPage      from './pages/RegisterPage'
import CourtsPage        from './pages/CourtsPage'
import DashboardPage     from './pages/DashboardPage'
import BookingPage       from './pages/BookingPage'
import BookingDetailPage from './pages/BookingDetailPage'
import AdminPage         from './pages/AdminPage'

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/"              element={<HomePage />} />
        <Route path="/courts"        element={<CourtsPage />} />

        {/* Auth — separate portals */}
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/admin/login"   element={<AdminLoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />

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

        {/* Admin-only routes */}
        <Route path="/admin/*" element={
          <ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>
        }/>
      </Routes>
      <Footer />
    </AuthProvider>
  )
}
