import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import './UserMenu.css'

const API = 'http://localhost:3000'

export default function UserMenu({ user, token, onLogout }) {
  const [open, setOpen]           = useState(false)
  const [showPwModal, setShowPwModal] = useState(false)
  const [pwForm, setPwForm]       = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError]     = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const menuRef = useRef()

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const ROLE_META = {
    admin:   { label: 'Admin',        color: '#7c3aed', bg: '#ede9fe' },
    analyst: { label: 'Data Analyst', color: '#2563a8', bg: '#dbeafe' },
    manager: { label: 'Manager',      color: '#16a34a', bg: '#dcfce7' },
  }
  const role = ROLE_META[user.role] || ROLE_META.analyst
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const logout = () => {
    localStorage.removeItem('churn_token')
    localStorage.removeItem('churn_user')
    onLogout()
  }

  const changePw = async (e) => {
    e.preventDefault()
    setPwError(''); setPwSuccess('')
    if (!pwForm.current || !pwForm.next) return setPwError('All fields are required')
    if (pwForm.next.length < 6) return setPwError('New password must be at least 6 characters')
    if (pwForm.next !== pwForm.confirm) return setPwError('New passwords do not match')
    setPwLoading(true)
    try {
      await axios.post(`${API}/api/auth/change-password`,
        { currentPassword: pwForm.current, newPassword: pwForm.next },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPwSuccess('Password changed successfully!')
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => { setShowPwModal(false); setPwSuccess('') }, 1800)
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <>
      <div className="user-menu-wrap" ref={menuRef}>
        <button className="user-pill" onClick={() => setOpen(o => !o)}>
          <div className="user-avatar">{initials}</div>
          <div className="user-pill-info">
            <span className="user-name">{user.name}</span>
            <span className="user-role-pill" style={{ background: role.bg, color: role.color }}>{role.label}</span>
          </div>
          <span className={`user-chevron ${open ? 'open' : ''}`}>▾</span>
        </button>

        {open && (
          <div className="user-dropdown">
            <div className="ud-header">
              <div className="ud-avatar-lg">{initials}</div>
              <div>
                <div className="ud-name">{user.name}</div>
                <div className="ud-email">{user.email}</div>
                <span className="ud-role" style={{ background: role.bg, color: role.color }}>{role.label}</span>
              </div>
            </div>

            <div className="ud-divider" />

            <div className="ud-menu">
              <button className="ud-item" onClick={() => { setShowPwModal(true); setOpen(false) }}>
                <span>🔑</span> Change Password
              </button>
              <button className="ud-item danger" onClick={logout}>
                <span>🚪</span> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Change Password Modal ── */}
      {showPwModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPwModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h3>🔑 Change Password</h3>
              <button className="modal-close" onClick={() => setShowPwModal(false)}>✕</button>
            </div>
            {pwSuccess && <div className="pw-success">✅ {pwSuccess}</div>}
            {pwError   && <div className="pw-error">⚠️ {pwError}</div>}
            <form onSubmit={changePw}>
              {[
                { key: 'current', label: 'Current Password',     placeholder: 'Enter current password' },
                { key: 'next',    label: 'New Password',          placeholder: 'Min 6 characters' },
                { key: 'confirm', label: 'Confirm New Password',  placeholder: 'Repeat new password' },
              ].map(f => (
                <div className="modal-field" key={f.key}>
                  <label>{f.label}</label>
                  <input
                    type="password" placeholder={f.placeholder}
                    value={pwForm[f.key]}
                    onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowPwModal(false)}>Cancel</button>
                <button type="submit" className="btn-confirm" disabled={pwLoading}>
                  {pwLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
