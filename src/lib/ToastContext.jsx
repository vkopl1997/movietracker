// Toast notification system.
//
// API used by any component:
//   const { showToast } = useToast()
//   showToast('Added to favorites')
//   showToast('Error', { type: 'error' })
//
// Internally:
//   - Toasts are kept in an array; each has a unique id
//   - Each one auto-dismisses after 2.5s via setTimeout
//   - The provider renders the toast stack itself (bottom-right), so callers
//     don't need to add any JSX

import { createContext, useCallback, useContext, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const ToastContext = createContext(null)

let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  // useCallback so consumers get a stable function reference.
  const showToast = useCallback((message, { type = 'success', duration = 2500 } = {}) => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast stack — fixed bottom-right, doesn't affect layout */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{    opacity: 0, x: 40, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`
                px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md
                text-sm font-medium pointer-events-auto
                ${t.type === 'error'
                  ? 'bg-red-500/95 text-white'
                  : 'bg-neutral-900/95 text-white ring-1 ring-white/10'}
              `}
            >
              {t.type === 'error' ? '⚠️  ' : '✓  '}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
