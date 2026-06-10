import { useState, useEffect, useCallback, createContext } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useAuth } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import { ToastContainer, useToast } from './components/Toast'

// Pages (to be created)
import Home from './pages/Home'
import Marketplace from './pages/Marketplace'
import Profile from './pages/Profile'
import JobDetails from './pages/JobDetails'
import PostJob from './pages/PostJob'
import Dashboard from './components/Dashboard'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export const SocketContext = createContext();

function App() {
  const [socket, setSocket] = useState(null)
  const [agentEvents, setAgentEvents] = useState([])
  const { toasts, addToast, removeToast } = useToast()
  const { user } = useAuth()

  // ── Socket connection ──────────────────────────────────────────────────────
  useEffect(() => {
    const s = io(BACKEND_URL, { transports: ['websocket', 'polling'] })

    s.on('connect', () => {
      addToast('Connected to WorkClaw backend', 'success')
    })

    // Agent events
    const agentEventTypes = [
      'agent:thinking', 'agent:action', 'agent:error',
      'event:JobCreated', 'event:JobAccepted', 'event:DeliverableSubmitted',
      'event:FundsReleased', 'event:DisputeRaised', 'event:DisputeResolved',
      'event:YieldUpdated', 'yield:update',
    ]

    agentEventTypes.forEach(type => {
      s.on(type, (data) => {
        setAgentEvents(prev => [{
          id: Date.now() + Math.random(),
          type,
          data,
          timestamp: new Date().toISOString(),
        }, ...prev].slice(0, 100))

        if (type === 'event:FundsReleased') addToast(`💰 $${data.principal} USDC released! + $${data.freelancerYield} yield bonus`, 'success')
        if (type === 'event:JobCreated') addToast(`📋 New job: "${data.title}" for $${data.amount} USDC`, 'info')
        if (type === 'event:JobAccepted') addToast(`🤝 Job accepted! Agent deploying to Byreal CLMM...`, 'info')
      })
    })

    setSocket(s)
    return () => s.disconnect()
  }, [])

  return (
    <SocketContext.Provider value={{ socket, agentEvents, BACKEND_URL, addToast }}>
      <Router>
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }} className="bg-grid">
          <Navbar />

          <main style={{ flex: 1, maxWidth: 1400, width: '100%', margin: '0 auto', padding: '24px 20px' }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/jobs" element={<Marketplace />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" />} />
              <Route path="/post-job" element={user?.role === 'Client' ? <PostJob /> : <Navigate to="/" />} />
              <Route path="/dashboard" element={user ? <Dashboard agentEvents={agentEvents} addToast={addToast} /> : <Navigate to="/" />} />
            </Routes>
          </main>

          <ToastContainer toasts={toasts} onRemove={removeToast} />
        </div>
      </Router>
    </SocketContext.Provider>
  )
}

export default App

