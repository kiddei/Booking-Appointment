import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'

import HomePage         from './pages/HomePage'
import LoginPage        from './pages/LoginPage'
import RegisterPage     from './pages/RegisterPage'
import CourtsPage       from './pages/CourtsPage'
import DashboardPage    from './pages/DashboardPage'
import BookingPage      from './pages/BookingPage'
import BookingDetailPage from './pages/BookingDetailPage'
import AdminPage        from './pages/AdminPage'

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/"              element={<HomePage />} />
        <Route path="/courts"        element={<CourtsPage />} />
        <Route path="/auth/login"    element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        }/>
        <Route path="/bookings/new" element={
          <ProtectedRoute><BookingPage /></ProtectedRoute>
        }/>
        <Route path="/bookings/:id" element={
          <ProtectedRoute><BookingDetailPage /></ProtectedRoute>
        }/>
        <Route path="/admin/*" element={
          <ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>
        }/>
      </Routes>
      <Footer />
    </AuthProvider>
  )
}
