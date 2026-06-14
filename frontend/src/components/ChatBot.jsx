import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import './ChatBot.css'

const API = 'http://localhost:3000'

const SUGGESTED = [
  'What is the overall churn rate?',
  'Which contract type has the highest churn?',
  'How does tech support affect churn?',
  'Who are the high-risk customers?',
  'What are your top recommendations?',
  'What is the annual revenue loss from churn?',
  'How does satisfaction score affect churn?',
  'How accurate is the ML model?',
  'How does tenure affect churn?',
  'What is the average monthly charge?',
]

const WELCOME = {
  role: 'bot',
  text: `👋 **Welcome to the Churn Analysis AI Assistant!**

I'm trained on your 5,000-customer dataset and can answer questions about:

• 📊 Churn rates, retention & key metrics
• 📋 Contract type analysis
• ⭐ Satisfaction score insights
• 🔴 High-risk customer identification
• 💰 Revenue & financial impact
• 🤖 ML model performance
• 🎯 Retention recommendations
• 📅 Tenure & onboarding insights

**Try one of the suggested questions below, or type your own!**`,
  time: new Date(),
}

/* Render simple markdown: **bold**, newlines → <br>, bullets */
function renderMarkdown(text) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g)
    const rendered = parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : <span key={j}>{p}</span>)
    return <span key={i} className="chat-line">{rendered}<br /></span>
  })
}

function Message({ msg }) {
  const isBot = msg.role === 'bot'
  const timeStr = msg.time?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <div className={`chat-msg ${isBot ? 'bot' : 'user'}`}>
      {isBot && <div className="chat-avatar bot-av">🤖</div>}
      <div className="chat-bubble">
        <div className="chat-text">{renderMarkdown(msg.text)}</div>
        <div className="chat-time">{timeStr}</div>
      </div>
      {!isBot && <div className="chat-avatar user-av">👤</div>}
    </div>
  )
}

export default function ChatBot({ data }) {
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const q = (text || input).trim()
    if (!q) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: q, time: new Date() }])
    setLoading(true)
    try {
      const res = await axios.post(`${API}/api/chat`, { message: q })
      setMessages(prev => [...prev, { role: 'bot', text: res.data.reply, time: new Date() }])
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: '⚠️ Could not reach the server. Make sure `node server.js` is running on port 3000.', time: new Date() }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const clear = () => setMessages([WELCOME])

  return (
    <div className="chatbot-container fade-up">
      {/* ── Sidebar: quick stats + suggested ── */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-section">
          <div className="css-title">📊 Live Stats</div>
          <div className="stat-chips">
            <div className="stat-chip red">
              <span className="sc-val">{data.summary.ChurnRate}%</span>
              <span className="sc-label">Churn Rate</span>
            </div>
            <div className="stat-chip green">
              <span className="sc-val">{(100 - data.summary.ChurnRate).toFixed(1)}%</span>
              <span className="sc-label">Retained</span>
            </div>
            <div className="stat-chip blue">
              <span className="sc-val">{Number(data.summary.TotalCustomers).toLocaleString()}</span>
              <span className="sc-label">Customers</span>
            </div>
            <div className="stat-chip amber">
              <span className="sc-val">{data.summary.AvgSatisfaction}/5</span>
              <span className="sc-label">Satisfaction</span>
            </div>
          </div>
        </div>

        <div className="chat-sidebar-section">
          <div className="css-title">💡 Suggested Questions</div>
          <div className="suggestions">
            {SUGGESTED.map((s, i) => (
              <button key={i} className="sugg-btn" onClick={() => send(s)} disabled={loading}>
                <span className="sugg-arrow">›</span>{s}
              </button>
            ))}
          </div>
        </div>

        <div className="chat-sidebar-section">
          <div className="css-title">ℹ️ About This Assistant</div>
          <p className="chat-info-text">
            Powered by real SQLite data from 5,000 customers. All answers are derived directly from the database with live SQL queries.
          </p>
          <div className="model-badge">🤖 Random Forest · 79.55% ROC-AUC</div>
        </div>
      </div>

      {/* ── Chat window ── */}
      <div className="chat-window">
        <div className="chat-header">
          <div className="chat-header-left">
            <div className="ch-avatar">🤖</div>
            <div>
              <div className="ch-name">Churn Analysis AI</div>
              <div className="ch-status"><span className="ch-dot" />Online · 5,000 customer dataset</div>
            </div>
          </div>
          <button className="clear-btn" onClick={clear} title="Clear chat">🗑 Clear</button>
        </div>

        <div className="chat-messages">
          {messages.map((m, i) => <Message key={i} msg={m} />)}
          {loading && (
            <div className="chat-msg bot">
              <div className="chat-avatar bot-av">🤖</div>
              <div className="chat-bubble typing">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-row">
          <input
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about churn, customers, recommendations..."
            disabled={loading}
          />
          <button
            className="send-btn"
            onClick={() => send()}
            disabled={loading || !input.trim()}
          >
            {loading ? '⏳' : '➤'}
          </button>
        </div>
        <div className="chat-hint">Press Enter to send · Shift+Enter for new line</div>
      </div>
    </div>
  )
}
