import { useState } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import './Recommendations.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const RECS = [
  {
    id: 1, icon: '📋', color: '#dc2626', colorLight: '#fff5f5',
    title: 'Contract Migration Strategy',
    objective: 'Reduce month-to-month churn from 54.4% → 35%',
    impact: '~$84K/year', timeline: '6 months', effort: 'Medium',
    actions: [
      'Offer 10–15% discount for 12-month commitment upgrades',
      'Automatic renewal reminders 30 days before contract expiry',
      'Conversion target: 50% of MTM customers in 12 months',
      'Dedicated contract specialist team for outreach',
    ],
    kpi: 'MTM Churn: 54.4% → 35%',
    roi: 84,
  },
  {
    id: 2, icon: '⭐', color: '#d97706', colorLight: '#fffbeb',
    title: 'Satisfaction Enhancement Program',
    objective: 'Improve score 1–2 customers: churn 65% → 40%',
    impact: '~$180K/year', timeline: 'Immediate', effort: 'High',
    actions: [
      'Proactive outreach to low-satisfaction customers (48-hr SLA)',
      'Personalized support sessions with senior specialists',
      'Root cause analysis & action plans per customer',
      'Service recovery credits and loyalty incentives',
    ],
    kpi: 'Low-Sat Churn: 65% → 40%',
    roi: 180,
  },
  {
    id: 3, icon: '🛠️', color: '#2563a8', colorLight: '#eff6ff',
    title: 'Tech Support Expansion',
    objective: 'Grow adoption from 30% → 50%+ of customer base',
    impact: '~$108K/year', timeline: '3 months', effort: 'Low',
    actions: [
      'Free 30-day tech support trial (no credit card required)',
      'Tiered pricing: Basic $5/mo, Plus $10/mo, Premium $20/mo',
      '24/7 AI-backed chat support with human escalation',
      '15-minute response time SLA for paid tiers',
    ],
    kpi: 'Support Adoption: 30% → 50%',
    roi: 108,
  },
  {
    id: 4, icon: '🚀', color: '#7c3aed', colorLight: '#f5f3ff',
    title: 'Onboarding & Early Stage Focus',
    objective: 'Reduce first-6-month churn by 20–30%',
    impact: '~$250K/year', timeline: 'Ongoing', effort: 'Medium',
    actions: [
      'Welcome call within 24 hours of sign-up',
      'Weekly check-ins during first 6 months of tenure',
      'Success milestones at 30 / 60 / 90 days with rewards',
      'Quick-start value demonstration for each service tier',
    ],
    kpi: 'Early Churn: −20 to −30%',
    roi: 250,
  },
  {
    id: 5, icon: '📊', color: '#0f766e', colorLight: '#f0fdfa',
    title: 'Predictive Segment-Based Retention',
    objective: 'Drive overall churn from 41.8% → 28–30%',
    impact: '$330K–$400K/year', timeline: '12 months', effort: 'High',
    actions: [
      'Deploy Random Forest model (79.55% ROC-AUC) for live scoring',
      'High-risk trigger: automatic escalation + aggressive incentives',
      'Medium-risk: targeted offers + quarterly service reviews',
      'Low-risk: VIP loyalty programs + referral campaigns',
    ],
    kpi: 'Overall Churn: 41.8% → 28–30%',
    roi: 365,
  },
]

const ROADMAP = [
  { quarter: 'Q1', label: 'Foundation', color: '#2563a8', tasks: ['Launch satisfaction outreach program', 'Roll out free tech support trial', 'Redesign new-customer onboarding flow', 'Target: −2 to −3 pp churn'] },
  { quarter: 'Q2', label: 'Scale',      color: '#7c3aed', tasks: ['Full contract upgrade campaign rollout', 'Expand onboarding to 50% of new customers', 'Deploy predictive churn model', 'Target: −5 to −7 pp cumulative'] },
  { quarter: 'Q3', label: 'Optimize',   color: '#d97706', tasks: ['Refine all programs based on data', 'Advanced ML targeting for medium-risk', 'Cross-sell & loyalty reward launch', 'Target: −10 to −12 pp cumulative'] },
  { quarter: 'Q4', label: 'Full Launch',color: '#16a34a', tasks: ['Enterprise-wide rollout of all initiatives', 'Year-2 planning & budget allocation', 'Full KPI dashboard live reporting', 'Target: 41.8% → 28–30% churn'] },
]

const KPIS = [
  { label: 'Overall Churn Rate',     current: '41.8%', target: '≤30%',      icon: '📉', good: false },
  { label: 'Customer Satisfaction',  current: '2.98/5', target: '3.8/5',    icon: '⭐', good: false },
  { label: 'Tech Support Adoption',  current: '30.1%', target: '50%',       icon: '🛠️', good: false },
  { label: 'MTM Churn Rate',         current: '54.4%', target: '35%',       icon: '📋', good: false },
  { label: 'Revenue at Risk',        current: '$1.25M', target: '~$750K',   icon: '💰', good: false },
  { label: '3-Year ROI',             current: 'Baseline', target: '145%',   icon: '📈', good: true  },
]

export default function Recommendations({ data }) {
  const [expanded, setExpanded] = useState(null)

  const toggle = (id) => setExpanded(expanded === id ? null : id)

  /* ── ROI bar chart ── */
  const roiBar = {
    labels: RECS.map(r => `P${r.id}`),
    datasets: [{
      label: 'Annual Revenue Impact ($K)',
      data: RECS.map(r => r.roi),
      backgroundColor: RECS.map(r => r.color + 'cc'),
      borderColor:     RECS.map(r => r.color),
      borderWidth: 2, borderRadius: 6, borderSkipped: false,
    }]
  }
  const roiOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` $${ctx.parsed.y}K annually` } }
    },
    scales: {
      y: { beginAtZero: true, ticks: { callback: v => '$' + v + 'K', font: { size: 11 } }, grid: { color: '#f3f4f6' } },
      x: { grid: { display: false } }
    }
  }

  return (
    <div className="recommendations-tab fade-up">

      {/* ── Key Insights ── */}
      <div className="rec-insights">
        <h2 className="section-title">💡 Key Findings from the Analysis</h2>
        <div className="insights-grid">
          {[
            { n: '2.1×', text: 'Month-to-month customers churn 2.1× more than 2-year contracts', icon: '📋', color: '#dc2626' },
            { n: '65%',  text: 'Customers with satisfaction score 1–2 churn at 65% rate',          icon: '⭐', color: '#d97706' },
            { n: '−11.8pp', text: 'Tech support reduces churn by 11.8 percentage points',          icon: '🛠️', color: '#2563a8' },
            { n: '70.2%',text: 'Of customers fall into high-risk categories needing action',        icon: '🔴', color: '#dc2626' },
            { n: '$1.25M',text: 'Annual revenue lost to churn — 30–35% is preventable',            icon: '💰', color: '#7c3aed' },
          ].map((ins, i) => (
            <div key={i} className="insight-card" style={{ borderLeftColor: ins.color }}>
              <span className="ic-icon">{ins.icon}</span>
              <div>
                <span className="ic-number" style={{ color: ins.color }}>{ins.n}</span>
                <p>{ins.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recommendations ── */}
      <div>
        <h2 className="section-title">🎯 5 Strategic Recommendations</h2>
        <div className="rec-list">
          {RECS.map(rec => (
            <div key={rec.id} className={`rec-item ${expanded === rec.id ? 'open' : ''}`}
              style={{ '--rec-color': rec.color, '--rec-bg': rec.colorLight }}>
              <div className="rec-header" onClick={() => toggle(rec.id)}>
                <div className="rec-left">
                  <span className="rec-num">P{rec.id}</span>
                  <span className="rec-icon">{rec.icon}</span>
                  <div>
                    <div className="rec-title">{rec.title}</div>
                    <div className="rec-obj">{rec.objective}</div>
                  </div>
                </div>
                <div className="rec-right">
                  <span className="rec-impact">{rec.impact}</span>
                  <span className="rec-timeline">{rec.timeline}</span>
                  <span className={`rec-effort effort-${rec.effort.toLowerCase()}`}>{rec.effort} effort</span>
                  <span className="rec-chevron">{expanded === rec.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded === rec.id && (
                <div className="rec-body">
                  <div className="rec-actions">
                    <h4>Action Steps</h4>
                    <ul>
                      {rec.actions.map((a, j) => (
                        <li key={j}><span className="rec-check">✓</span>{a}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rec-kpi-box">
                    <div className="rec-kpi-label">Target KPI</div>
                    <div className="rec-kpi-value">{rec.kpi}</div>
                    <div className="rec-kpi-revenue">Expected Annual Impact: <strong>{rec.impact}</strong></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── ROI + KPI charts ── */}
      <div className="rec-charts-row">
        <div className="chart-box">
          <div className="chart-box-title">💰 Revenue Impact by Initiative</div>
          <div className="chart-box-sub">Annual financial benefit per priority (P1–P5)</div>
          <div style={{ height: 260 }}>
            <Bar data={roiBar} options={roiOpts} />
          </div>
        </div>

        <div className="chart-box roi-summary">
          <div className="chart-box-title">📊 Combined ROI Summary</div>
          <div className="chart-box-sub">Full program investment return over 3 years</div>
          <div className="roi-cards">
            {[
              { label: 'Year 1 Investment', value: '$450K', sub: 'Implementation + incentives', color: '#dc2626' },
              { label: 'Annual Benefit (Y2+)', value: '$373K', sub: 'Ongoing operations return', color: '#16a34a' },
              { label: 'Payback Period', value: '14.5 mo', sub: 'Break-even timeline', color: '#d97706' },
              { label: '3-Year ROI', value: '145%', sub: '+$669K cumulative', color: '#2563a8' },
            ].map((c, i) => (
              <div key={i} className="roi-mini" style={{ borderTopColor: c.color }}>
                <div className="roi-mini-val" style={{ color: c.color }}>{c.value}</div>
                <div className="roi-mini-label">{c.label}</div>
                <div className="roi-mini-sub">{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Roadmap ── */}
      <div className="chart-box">
        <div className="chart-box-title">📅 12-Month Implementation Roadmap</div>
        <div className="chart-box-sub">Phased rollout with quarterly milestones</div>
        <div className="roadmap">
          {ROADMAP.map((q, i) => (
            <div key={i} className="roadmap-quarter">
              <div className="rq-header" style={{ background: q.color }}>
                <span className="rq-q">{q.quarter}</span>
                <span className="rq-label">{q.label}</span>
              </div>
              <ul className="rq-tasks">
                {q.tasks.map((t, j) => (
                  <li key={j}>{j === q.tasks.length - 1 ? <strong>{t}</strong> : t}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI targets ── */}
      <div className="chart-box">
        <div className="chart-box-title">📈 Success Metrics & KPI Targets</div>
        <div className="chart-box-sub">12-month goals across key performance indicators</div>
        <div className="kpi-targets">
          {KPIS.map((k, i) => (
            <div key={i} className="kpit">
              <span className="kpit-icon">{k.icon}</span>
              <div className="kpit-body">
                <div className="kpit-label">{k.label}</div>
                <div className="kpit-row">
                  <span className="kpit-current">Now: <strong>{k.current}</strong></span>
                  <span className="kpit-arrow">→</span>
                  <span className={`kpit-target ${k.good ? 'good' : ''}`}>Target: <strong>{k.target}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
