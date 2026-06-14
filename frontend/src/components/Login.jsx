import { useState } from 'react'
import axios from 'axios'
import './Login.css'

const API = 'http://localhost:3000'

export default function Login({ onLogin }) {
  const [mode, setMode]         = useState('login')   // 'login' | 'register'
  const [form, setForm]         = useState({ name: '', email: '', password: '', confirm: '', role: 'analyst' })
  const [errors, setErrors]     = useState({})
  const [loading, setLoading]   = useState(false)
  const [serverErr, setServerErr] = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [success, setSuccess]     = useState('')

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); setServerErr('') }

  const validate = () => {
    const e = {}
    if (mode === 'register' && !form.name.trim()) e.name = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 6) e.password = 'Must be at least 6 characters'
    if (mode === 'register' && form.password !== form.confirm) e.confirm = 'Passwords do not match'
    return e
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true); setServerErr('')
    try {
      if (mode === 'login') {
        const res = await axios.post(`${API}/api/auth/login`, { email: form.email, password: form.password })
        localStorage.setItem('churn_token', res.data.token)
        localStorage.setItem('churn_user',  JSON.stringify(res.data.user))
        onLogin(res.data.user, res.data.token)
      } else {
        const res = await axios.post(`${API}/api/auth/register`, { name: form.name, email: form.email, password: form.password, role: form.role })
        localStorage.setItem('churn_token', res.data.token)
        localStorage.setItem('churn_user',  JSON.stringify(res.data.user))
        setSuccess('Account created! Signing you in...')
        setTimeout(() => onLogin(res.data.user, res.data.token), 900)
      }
    } catch (err) {
      setServerErr(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m) => {
    setMode(m); setErrors({}); setServerErr(''); setSuccess('')
    setForm({ name: '', email: '', password: '', confirm: '', role: 'analyst' })
  }

  const fillDemo = () => {
    setForm(f => ({ ...f, email: 'admin@churn.ai', password: 'admin123' }))
    setErrors({}); setServerErr('')
  }

  return (
    <div className="login-page">
      {/* ── Left Panel ── */}
      <div className="login-left">
        <div className="login-left-content">
          <div className="ll-logo">
            <span className="ll-icon">📊</span>
            <div>
              <h1>Churn Intelligence</h1>
              <p>AI-Powered Retention Platform</p>
            </div>
          </div>

          <div className="ll-features">
            {[
              { icon: '📈', title: 'Real-time Analytics',    desc: 'Live dashboards powered by 5,000+ customer records' },
              { icon: '🤖', title: 'AI Predictions',         desc: 'Random Forest model with 79.55% ROC-AUC accuracy' },
              { icon: '📂', title: 'Dataset Upload',         desc: 'Upload any CSV and get instant churn predictions' },
              { icon: '💬', title: 'AI Chat Assistant',      desc: 'Ask questions and get data-driven answers instantly' },
            ].map((f, i) => (
              <div key={i} className="ll-feature">
                <span className="llf-icon">{f.icon}</span>
                <div>
                  <strong>{f.title}</strong>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="ll-stats">
            <div className="lls"><span>5,000+</span><small>Customers</small></div>
            <div className="lls"><span>79.5%</span><small>ROC-AUC</small></div>
            <div className="lls"><span>41.8%</span><small>Churn Detected</small></div>
            <div className="lls"><span>$1.25M</span><small>Revenue at Risk</small></div>
          </div>
        </div>
      </div>

      {/* ── Right Panel (Form) ── */}
      <div className="login-right">
        <div className="login-form-wrap">
          {/* Mode toggle */}
          <div className="mode-toggle">
            <button className={mode === 'login'    ? 'active' : ''} onClick={() => switchMode('login')}>Sign In</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Create Account</button>
          </div>

          <div className="form-header">
            <h2>{mode === 'login' ? 'Welcome back 👋' : 'Get started 🚀'}</h2>
            <p>{mode === 'login' ? 'Sign in to your dashboard' : 'Create your free analyst account'}</p>
          </div>

          {/* Success message */}
          {success && <div className="form-success"><span>✅</span>{success}</div>}

          {/* Server error */}
          {serverErr && <div className="form-error-box"><span>⚠️</span>{serverErr}</div>}

          <form onSubmit={submit} noValidate autoComplete="off">
            {/* Name (register only) */}
            {mode === 'register' && (
              <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
                <label>Full Name</label>
                <div className="input-wrap">
                  <span className="input-icon">👤</span>
                  <input
                    type="text" placeholder="John Smith"
                    value={form.name} onChange={e => set('name', e.target.value)}
                    autoFocus
                  />
                </div>
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>
            )}

            {/* Email */}
            <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
              <label>Email Address</label>
              <div className="input-wrap">
                <span className="input-icon">✉️</span>
                <input
                  type="email" placeholder="you@company.com"
                  value={form.email} onChange={e => set('email', e.target.value)}
                  autoFocus={mode === 'login'}
                />
              </div>
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
              <label>Password</label>
              <div className="input-wrap">
                <span className="input-icon">🔒</span>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder={mode === 'register' ? 'Min 6 characters' : 'Your password'}
                  value={form.password} onChange={e => set('password', e.target.value)}
                />
                <button type="button" className="toggle-pass" onClick={() => setShowPass(s => !s)}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            {/* Confirm password (register only) */}
            {mode === 'register' && (
              <div className={`form-group ${errors.confirm ? 'has-error' : ''}`}>
                <label>Confirm Password</label>
                <div className="input-wrap">
                  <span className="input-icon">🔒</span>
                  <input
                    type={showPass ? 'text' : 'password'} placeholder="Repeat your password"
                    value={form.confirm} onChange={e => set('confirm', e.target.value)}
                  />
                </div>
                {errors.confirm && <span className="field-error">{errors.confirm}</span>}
              </div>
            )}

            {/* Role (register only) */}
            {mode === 'register' && (
              <div className="form-group">
                <label>Role</label>
                <div className="role-select">
                  {[
                    { value: 'analyst',  label: '📊 Data Analyst',  desc: 'Analyze churn data & insights' },
                    { value: 'manager',  label: '👔 Manager',        desc: 'Review reports & KPIs' },
                  ].map(r => (
                    <label key={r.value} className={`role-option ${form.role === r.value ? 'selected' : ''}`}>
                      <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={() => set('role', r.value)} />
                      <div>
                        <span>{r.label}</span>
                        <small>{r.desc}</small>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Demo credentials hint */}
            {mode === 'login' && (
              <div className="demo-hint">
                <span>🔑 Demo account:</span>
                <code>admin@churn.ai</code> / <code>admin123</code>
                <button type="button" onClick={fillDemo}>Fill</button>
              </div>
            )}

            <button type="submit" className={`submit-btn ${loading ? 'loading' : ''}`} disabled={loading}>
              {loading
                ? <><span className="btn-spinner" /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
                : mode === 'login' ? '→ Sign In to Dashboard' : '→ Create My Account'
              }
            </button>
          </form>

          <div className="form-footer">
            {mode === 'login'
              ? <p>Don't have an account? <button onClick={() => switchMode('register')}>Create one free</button></p>
              : <p>Already have an account? <button onClick={() => switchMode('login')}>Sign in</button></p>
            }
          </div>

          <div className="form-security">
            <span>🔐 Secured with JWT · Passwords hashed with bcrypt</span>
          </div>
        </div>
      </div>
    </div>
  )
}
