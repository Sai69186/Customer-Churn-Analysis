import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import Login from './components/Login'
import UserMenu from './components/UserMenu'
import Overview from './components/Overview'
import Analysis from './components/Analysis'
import Segments from './components/Segments'
import Recommendations from './components/Recommendations'
import Upload from './components/Upload'
import ChatBot from './components/ChatBot'

const API = 'http://localhost:3000'

function App() {
  const [user,  setUser]  = useState(null)
  const [token, setToken] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  const [activeTab, setActiveTab] = useState('overview')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  // ── Restore session from localStorage ──────────────────────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem('churn_token')
    const savedUser  = localStorage.getItem('churn_user')
    if (savedToken && savedUser) {
      try {
        // Verify token is not expired by checking the user endpoint
        axios.get(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${savedToken}` } })
          .then(res => {
            setUser(res.data)
            setToken(savedToken)
            setAuthChecked(true)
          })
          .catch(() => {
            // Token expired or invalid
            localStorage.removeItem('churn_token')
            localStorage.removeItem('churn_user')
            setAuthChecked(true)
          })
      } catch {
        setAuthChecked(true)
      }
    } else {
      setAuthChecked(true)
    }
  }, [])

  // ── Fetch dashboard data after login ───────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      try {
        setLoading(true); setError(false)
        const [summary, contract, satisfaction, support, risk, highRisk, tenure, internet, revenue, features] = await Promise.all([
          axios.get(`${API}/api/summary`),
          axios.get(`${API}/api/churn-by-contract`),
          axios.get(`${API}/api/churn-by-satisfaction`),
          axios.get(`${API}/api/tech-support-impact`),
          axios.get(`${API}/api/risk-segments`),
          axios.get(`${API}/api/high-risk-customers`),
          axios.get(`${API}/api/churn-by-tenure`),
          axios.get(`${API}/api/churn-by-internet`),
          axios.get(`${API}/api/revenue-by-contract`),
          axios.get(`${API}/api/feature-importance`),
        ])
        setData({
          summary:      summary.data,
          contract:     contract.data,
          satisfaction: satisfaction.data,
          support:      support.data,
          risk:         risk.data,
          highRisk:     highRisk.data,
          tenure:       tenure.data,
          internet:     internet.data,
          revenue:      revenue.data,
          features:     features.data,
        })
      } catch (err) {
        console.error('Data fetch error:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  const handleLogin = (u, t) => {
    setUser(u); setToken(t)
    setActiveTab('overview')
  }

  const handleLogout = () => {
    setUser(null); setToken(null)
    setData(null); setLoading(true); setError(false)
    setActiveTab('overview')
  }

  const tabs = [
    { id: 'overview',        icon: '📊', label: 'Overview'        },
    { id: 'analysis',        icon: '📈', label: 'Analysis'        },
    { id: 'segments',        icon: '🎯', label: 'Segments'        },
    { id: 'recommendations', icon: '💡', label: 'Recommendations' },
    { id: 'upload',          icon: '📂', label: 'Upload & Predict', badge: 'NEW', badgeColor: 'green' },
    { id: 'chat',            icon: '🤖', label: 'AI Assistant',    badge: 'AI',  badgeColor: 'purple' },
  ]

  // ── Still checking auth ────────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="splash-screen">
        <div className="splash-inner">
          <div className="splash-logo">📊</div>
          <h2>Customer Churn Intelligence</h2>
          <p>Initializing...</p>
          <div className="splash-bar"><div className="splash-fill" /></div>
        </div>
      </div>
    )
  }

  // ── Not logged in → show Login ─────────────────────────────────────────────
  if (!user) return <Login onLogin={handleLogin} />

  // ── Loading data after login ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="splash-screen">
        <div className="splash-inner">
          <div className="splash-logo">📊</div>
          <h2>Welcome, {user.name.split(' ')[0]}!</h2>
          <p>Loading your dashboard...</p>
          <div className="splash-bar"><div className="splash-fill" /></div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="splash-screen error">
        <div className="splash-inner">
          <div className="splash-logo">⚠️</div>
          <h2>Connection Error</h2>
          <p>Could not reach backend at <code>localhost:3000</code>.</p>
          <p>Make sure <code>node server.js</code> is running.</p>
          <button onClick={() => window.location.reload()} className="retry-btn">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-bg" />
        <div className="header-content">
          <div className="header-brand">
            <span className="brand-icon">📊</span>
            <div>
              <h1>Customer Churn Intelligence</h1>
              <p>Real-time analytics &amp; AI-powered retention insights</p>
            </div>
          </div>

          <div className="header-center">
            <div className="hstat">
              <span className="hstat-value">{data.summary.TotalCustomers.toLocaleString()}</span>
              <span className="hstat-label">Customers</span>
            </div>
            <div className="hstat danger">
              <span className="hstat-value">{data.summary.ChurnRate}%</span>
              <span className="hstat-label">Churn Rate</span>
            </div>
            <div className="hstat success">
              <span className="hstat-value">{(100 - data.summary.ChurnRate).toFixed(1)}%</span>
              <span className="hstat-label">Retained</span>
            </div>
            <div className="hstat warning">
              <span className="hstat-value">{data.summary.AvgSatisfaction}/5</span>
              <span className="hstat-label">Satisfaction</span>
            </div>
          </div>

          <div className="header-right">
            <div className="welcome-msg">
              <span>👋 Hello, <strong>{user.name.split(' ')[0]}</strong></span>
            </div>
            <UserMenu user={user} token={token} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      {/* ── Nav ── */}
      <nav className="navbar">
        <div className="nav-content">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`nav-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="nav-icon">{t.icon}</span>
              <span className="nav-label">{t.label}</span>
              {t.badge && (
                <span className="nav-badge" style={
                  t.badgeColor === 'green'
                    ? { background: 'linear-gradient(135deg,#16a34a,#15803d)' }
                    : {}
                }>{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="dashboard">
        {activeTab === 'overview'        && <Overview        data={data} />}
        {activeTab === 'analysis'        && <Analysis        data={data} />}
        {activeTab === 'segments'        && <Segments        data={data} />}
        {activeTab === 'recommendations' && <Recommendations data={data} />}
        {activeTab === 'upload'          && <Upload />}
        {activeTab === 'chat'            && <ChatBot         data={data} />}
      </main>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-content">
          <span>📊 Customer Churn Intelligence Platform</span>
          <span className="footer-sep">|</span>
          <span>5,000 records · SQLite · Random Forest 79.55% ROC-AUC · CSV Upload & Predict</span>
          <span className="footer-sep">|</span>
          <span>Logged in as <strong style={{color:'#86efac'}}>{user.name}</strong></span>
          <span className="footer-sep">|</span>
          <span className="footer-live">🟢 Live</span>
        </div>
      </footer>
    </div>
  )
}

export default App
