import { useState } from 'react'
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import './Segments.css'

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const RISK = {
  'High Risk':   { color: '#dc2626', bg: '#fee2e2', cls: 'seg-red',   icon: '🔴', action: 'IMMEDIATE',  accentLight: '#fff5f5' },
  'Medium Risk': { color: '#d97706', bg: '#fef3c7', cls: 'seg-amber', icon: '🟡', action: 'PREVENTIVE', accentLight: '#fffbeb' },
  'Low Risk':    { color: '#16a34a', bg: '#dcfce7', cls: 'seg-green', icon: '🟢', action: 'MAINTAIN',   accentLight: '#f0fdf4' },
}

const ACTIONS = {
  'High Risk':   ['Convert to annual contracts (10–15% discount)', 'Proactive outreach within 48 hours', 'Free tech support trial', 'Dedicated account specialist assignment'],
  'Medium Risk': ['Value-add service offerings & quarterly reviews', 'Satisfaction improvement program', 'Loyalty rewards & incentives', 'Targeted upgrade campaigns'],
  'Low Risk':    ['VIP loyalty program enrollment', 'Upsell & expansion opportunities', 'Referral & advocacy programs', 'Premium support tier access'],
}

export default function Segments({ data }) {
  const { risk, contract } = data
  const [selected, setSelected] = useState(null)

  const totalCustomers = risk.reduce((s, r) => s + r.Count, 0)

  /* ── Doughnut ── */
  const doughnutData = {
    labels: risk.map(r => r.Segment),
    datasets: [{
      data: risk.map(r => r.Count),
      backgroundColor: ['rgba(220,38,38,0.85)', 'rgba(245,158,11,0.85)', 'rgba(22,163,74,0.85)'],
      borderColor: ['#b91c1c', '#d97706', '#15803d'],
      borderWidth: 2, hoverOffset: 10,
    }]
  }
  const doughnutOpts = {
    responsive: true, maintainAspectRatio: false, cutout: '62%',
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 12, weight: 'bold' }, padding: 16 } },
      tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString()} customers` } }
    }
  }

  /* ── Grouped bar: count + churn per segment ── */
  const groupedBar = {
    labels: risk.map(r => r.Segment),
    datasets: [
      {
        label: 'Total',
        data: risk.map(r => r.Count),
        backgroundColor: 'rgba(37,99,168,0.7)',
        borderRadius: 5,
      },
      {
        label: 'Churned',
        data: risk.map(r => r.Churned),
        backgroundColor: ['rgba(220,38,38,0.8)', 'rgba(245,158,11,0.8)', 'rgba(22,163,74,0.8)'],
        borderRadius: 5,
      }
    ]
  }
  const groupedOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
    scales: {
      y: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false } }
    }
  }

  return (
    <div className="segments-tab fade-up">
      {/* ── Segment cards ── */}
      <div className="seg-cards">
        {risk.map((seg, i) => {
          const meta = RISK[seg.Segment] || {}
          const pct = ((seg.Count / totalCustomers) * 100).toFixed(1)
          const revRisk = (seg.Count * seg.AvgCharges * seg.ChurnRate / 100 * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })
          return (
            <div
              key={i}
              className={`seg-card ${meta.cls} ${selected === seg.Segment ? 'selected' : ''}`}
              onClick={() => setSelected(selected === seg.Segment ? null : seg.Segment)}
            >
              <div className="seg-header">
                <span className="seg-icon">{meta.icon}</span>
                <div>
                  <h3>{seg.Segment}</h3>
                  <span className="seg-action-badge" style={{ background: meta.bg, color: meta.color }}>
                    {meta.action}
                  </span>
                </div>
              </div>

              <div className="seg-metrics">
                <div className="seg-metric">
                  <span className="sm-label">Customers</span>
                  <span className="sm-value">{seg.Count.toLocaleString()}</span>
                  <span className="sm-sub">{pct}% of base</span>
                </div>
                <div className="seg-metric">
                  <span className="sm-label">Churn Rate</span>
                  <span className="sm-value" style={{ color: meta.color }}>{seg.ChurnRate}%</span>
                  <span className="sm-sub">{seg.Churned.toLocaleString()} churned</span>
                </div>
                <div className="seg-metric">
                  <span className="sm-label">Satisfaction</span>
                  <span className="sm-value">{seg.AvgSatisfaction}/5</span>
                  <span className="sm-sub">avg score</span>
                </div>
                <div className="seg-metric">
                  <span className="sm-label">Rev at Risk</span>
                  <span className="sm-value">${revRisk}</span>
                  <span className="sm-sub">annually</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="seg-progress-label">Churn Risk Level</div>
              <div className="seg-progress">
                <div className="seg-progress-fill" style={{ width: `${seg.ChurnRate}%`, background: meta.color }} />
              </div>

              {/* Expand: action plan */}
              {selected === seg.Segment && (
                <div className="seg-actions">
                  <div className="seg-actions-title">Recommended Actions</div>
                  <ul>
                    {ACTIONS[seg.Segment]?.map((a, j) => (
                      <li key={j}><span className="action-check">✓</span>{a}</li>
                    ))}
                  </ul>
                  <p className="seg-hint">Avg monthly charges: <strong>${seg.AvgCharges}</strong></p>
                </div>
              )}
              <div className="seg-expand-hint">{selected === seg.Segment ? '▲ Hide actions' : '▼ Show action plan'}</div>
            </div>
          )
        })}
      </div>

      {/* ── Charts ── */}
      <div className="seg-charts">
        <div className="chart-box">
          <div className="chart-box-title">Risk Segment Distribution</div>
          <div className="chart-box-sub">Customer count across the 3 risk tiers</div>
          <div style={{ height: 300 }}>
            <Doughnut data={doughnutData} options={doughnutOpts} />
          </div>
        </div>
        <div className="chart-box">
          <div className="chart-box-title">Total vs Churned per Segment</div>
          <div className="chart-box-sub">Side-by-side comparison of segment size and churn</div>
          <div style={{ height: 300 }}>
            <Bar data={groupedBar} options={groupedOpts} />
          </div>
        </div>
      </div>

      {/* ── Summary table ── */}
      <div className="chart-box">
        <div className="chart-box-title">Segment Comparison Table</div>
        <div className="chart-box-sub">Key metrics across all risk segments</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr>
              <th>Segment</th><th>Customers</th><th>% of Base</th>
              <th>Churned</th><th>Churn Rate</th><th>Avg Satisfaction</th>
              <th>Avg Charges</th><th>Annual Rev Risk</th><th>Priority</th>
            </tr></thead>
            <tbody>
              {risk.map((seg, i) => {
                const meta = RISK[seg.Segment] || {}
                const pct = ((seg.Count / totalCustomers) * 100).toFixed(1)
                const revRisk = (seg.Count * seg.AvgCharges * seg.ChurnRate / 100 * 12)
                return (
                  <tr key={i}>
                    <td><strong style={{ color: meta.color }}>{meta.icon} {seg.Segment}</strong></td>
                    <td>{seg.Count.toLocaleString()}</td>
                    <td>{pct}%</td>
                    <td style={{ color: meta.color }}>{seg.Churned.toLocaleString()}</td>
                    <td><strong style={{ color: meta.color }}>{seg.ChurnRate}%</strong></td>
                    <td>{seg.AvgSatisfaction}/5.0</td>
                    <td>${seg.AvgCharges}</td>
                    <td>${revRisk.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td>
                      <span className={`badge ${i === 0 ? 'badge-high' : i === 1 ? 'badge-medium' : 'badge-low'}`}>
                        {meta.action}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
