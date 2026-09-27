import { createContext, useContext, useState, useCallback } from 'react'

const ToastCtx = createContext(null)

const ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }
const DURATIONS = { success: 3000, error: 5000, warning: 5000, info: 4000 }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const add = useCallback((message, type, duration) => {
    const id  = `${Date.now()}-${Math.random()}`
    const dur = duration ?? DURATIONS[type] ?? 4000
    setToasts(prev => [...prev, { id, message, type }])
    if (dur > 0) setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), dur)
  }, [])

  const toast = {
    success: (msg, dur) => add(msg, 'success', dur),
    error:   (msg, dur) => add(msg, 'error',   dur),
    warning: (msg, dur) => add(msg, 'warning', dur),
    info:    (msg, dur) => add(msg, 'info',    dur),
  }

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-stack" role="region" aria-label="Notifications" aria-live="polite">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast--${t.type}`} role="alert">
              <span className={`toast__icon toast__icon--${t.type}`} aria-hidden="true">
                {ICONS[t.type]}
              </span>
              <span className="toast__msg">{t.message}</span>
              <button className="toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
            </div>
          ))}
        </div>
      )}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
