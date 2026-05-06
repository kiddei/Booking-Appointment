import { createContext, useContext, useEffect, useState } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, ask the server if we already have a valid session
  useEffect(() => {
    client.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const res = await client.post('/auth/login', { username, password })
    setUser(res.data)
    return res.data
  }

  const logout = async () => {
    await client.post('/auth/logout')
    setUser(null)
  }

  const register = async (data) => {
    const res = await client.post('/auth/register', data)
    return res.data
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
