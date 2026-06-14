import { useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import './Analysis.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler)

const COLORS = {
  red:    { bg: 'rgba(220,38,38,0.85)',   border: '#b91c1c' },
  amber:  { bg: 'rgba(245,158,11,0.85)',  border: '#d97706' },
  green:  { bg: 'rgba(22,163,74,0.85)',   border: '#15803d' },
  blue:   { bg: 'rgba(37,99,168,0.85)',   border: '#1e40af' },
  purple: { bg: 'rgba(139,92,246,0.85)',  border: '#7c3aed' },
  teal:   { bg: 'rgba(20,184,166,0.85)',  border: '#0f766e' },
}

const yPercent = {
  y: {
    beginAtZero: true, max: 80,
    ticks: { callback: v => v + '%', font: { size: 11 } },
    grid: { color: '#f3f4f6' }
  },
  x: { grid: { display: false }, ticks: { font: { size: 11 } } }
}

export default function Analysis({ data }) {
  const { contract, satisfaction, support, tenure, internet, features } = data
  const [activeView, setActiveView] = useState('charts')

  /* ── Contract bar ── */
  const contractBar = {
    labels: contract.map(c => c.ContractType),
    datasets: [
      {
        label: 'Churn Rate (%)',
        data: contract.map(c => c.ChurnRate),
        backgroundColor: [COLORS.red.bg, COLORS.amber.bg, COLORS.green.bg],
        borderColor:     [COLORS.red.border, COLORS.amber.border, COLORS.green.border],
        borderWidth: 2, borderRadius: 6, borderSkipped: false,
      },
      {
        label: 'Retained (%)',
        data: contract.map(c => (100 - c.ChurnRate).toFixed(1)),
        backgroundColor: 'rgba(37,99,168,0.15)',
        borderColor: 'rgba(37,99,168,0.4)',
        borderWidth: 1, borderRadius: 6, borderSkipped: false,
      }
    ]
  }

  /* ── Satisfaction line ── */
  const satLine = {
    labels: satisfaction.map(s => `Score ${s.SatisfactionScore}`),
    datasets: [{
      label: 'Churn Rate (%)',
      data: satisfaction.map(s => s.ChurnRate),
      borderColor: '#1F4E78', borderWidth: 3,
      backgroundColor: 'rgba(31,78,120,0.08)',
      fill: true, tension: 0.45,
      pointBackgroundColor: satisfaction.map(s => s.ChurnRate > 50 ? '#dc2626' : s.ChurnRate > 35 ? '#f59e0b' : '#16a34a'),
      pointRadius: 6, pointHoverRadius: 9,
    }]
  }

  /* ── Support doughnut ── */
  const supportDoughnut = {
    labels: support.map(s => s.TechSupport === 'Yes' ? '✅ With Support' : '❌ No Support'),
    datasets: [{
      data: support.map(s => s.ChurnRate),
      backgroundColor: ['#16a34a', '#dc2626'],
      borderColor: ['#15803d', '#b91c1c'],
      borderWidth: 2,
    }]
  }
  const doughnutOptions = {
    responsive: true, maintainAspectRatio: false,
    cutout: '65%',
    plugins: { legend: { position: 'bottom', labels: { font: { size: 11, weight: 'bold' }, padding: 12 } } }
  }

  /* ── Internet bar ── */
  const internetBar = {
    labels: internet.map(i => i.InternetService),
    datasets: [{
      label: 'Churn Rate (%)',
      data: internet.map(i => i.ChurnRate),
      backgroundColor: [COLORS.red.bg, COLORS.blue.bg, COLORS.green.bg],
      borderRadius: 6, borderSkipped: false,
    }]
  }

  /* ── Feature importance horizontal bar ── */
  const featureSorted = [...features].sort((a, b) => b.importance - a.importance).slice(0, 10)
  const featureBar = {
    labels: featureSorted.map(f => f.feature),
    datasets: [{
      label: 'Importance (%)',
      data: featureSorted.map(f => f.importance),
      backgroundColor: featureSorted.map((_, i) => `hsl(${220 - i * 18}, 70%, ${55 + i * 2}%)`),
      borderRadius: 4,
    }]
  }
  const featureOpts = {
    indexAxis: 'y',
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x}%` } } },
    scales: {
      x: { beginAtZero: true, ticks: { callback: v => v + '%', font: { size: 10 } }, grid: { color: '#f3f4f6' } },
      y: { grid: { display: false }, ticks: { font: { size: 11 } } }
    }
  }

  return (
    <div className="analysis-tab fade-up">
      {/* ── View Toggle ── */}
      <div className="view-toggle">
        <button className={activeView === 'charts' ? 'active' : ''} onClick={() => setActiveView('charts')}>📊 Charts</button>
        <button className={activeView === 'tables' ? 'active' : ''} onClick={() => setActiveView('tables')}>📋 Data Tables</button>
        <button className={activeView === 'features' ? 'active' : ''} onClick={() => setActiveView('features')}>🤖 Feature Importance</button>
      </div>

      {activeView === 'charts' && (
        <div className="charts-view">
          {/* row 1 */}
          <div className="an-row-wide">
            <div className="chart-box">
              <div className="chart-box-title">Churn & Retention by Contract Type</div>
              <div className="chart-box-sub">Month-to-month contracts are 2.1× riskier than 2-year contracts</div>
              <div style={{ height: 280 }}>
                <Bar data={contractBar} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } }, scales: yPercent }} />
              </div>
            </div>
          </div>

          {/* row 2 */}
          <div className="an-row-two">
            <div className="chart-box">
              <div className="chart-box-title">Churn Rate by Satisfaction Score</div>
              <div className="chart-box-sub">Score 1–2 customers churn at 65% — biggest risk driver</div>
              <div style={{ height: 260 }}>
                <Line data={satLine} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: yPercent }} />
              </div>
            </div>
            <div className="chart-box">
              <div className="chart-box-title">Tech Support Impact on Churn</div>
              <div className="chart-box-sub">Support reduces churn by 11.8 percentage points</div>
              <div style={{ height: 260 }}>
                <Doughnut data={supportDoughnut} options={doughnutOptions} />
              </div>
            </div>
            <div className="chart-box">
              <div className="chart-box-title">Churn by Internet Service</div>
              <div className="chart-box-sub">Service type correlates with churn behavior</div>
              <div style={{ height: 260 }}>
                <Bar data={internetBar} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: yPercent }} />
              </div>
            </div>
          </div>

          {/* Key insights strip */}
          <div className="insights-strip">
            {[
              { icon: '📋', text: 'Month-to-month', sub: '54.4% churn rate', color: 'red' },
              { icon: '⭐', text: 'Score 1–2 customers', sub: '65% churn rate', color: 'red' },
              { icon: '🛠️', text: 'Tech support saves', sub: '−11.8 pp churn', color: 'green' },
              { icon: '📅', text: '2-year contracts', sub: 'Only 26% churn', color: 'green' },
            ].map((ins, i) => (
              <div key={i} className={`ins-chip ins-${ins.color}`}>
                <span>{ins.icon}</span>
                <div><strong>{ins.text}</strong><span>{ins.sub}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'tables' && (
        <div className="tables-view">
          {/* Contract table */}
          <div className="chart-box">
            <div className="chart-box-title">📋 Contract Type Analysis</div>
            <div className="chart-box-sub">Breakdown of churn behavior across contract types</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>Contract Type</th><th>Customers</th><th>Churned</th><th>Retained</th>
                  <th>Churn Rate</th><th>Avg Monthly $</th><th>Risk</th>
                </tr></thead>
                <tbody>
                  {contract.map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.ContractType}</strong></td>
                      <td>{r.Count.toLocaleString()}</td>
                      <td className="text-red">{r.Churned.toLocaleString()}</td>
                      <td className="text-green">{r.Retained?.toLocaleString() ?? (r.Count - r.Churned).toLocaleString()}</td>
                      <td><strong>{r.ChurnRate}%</strong></td>
                      <td>${r.AvgMonthlyCharges}</td>
                      <td>
                        <span className={`badge ${r.ChurnRate > 50 ? 'badge-high' : r.ChurnRate > 30 ? 'badge-medium' : 'badge-low'}`}>
                          {r.ChurnRate > 50 ? 'HIGH' : r.ChurnRate > 30 ? 'MEDIUM' : 'LOW'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Satisfaction table */}
          <div className="chart-box">
            <div className="chart-box-title">⭐ Satisfaction Score Analysis</div>
            <div className="chart-box-sub">Satisfaction is the #1 predictor of churn</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>Score</th><th>Customers</th><th>Churned</th><th>Churn Rate</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {satisfaction.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <div className="score-stars">
                          {'★'.repeat(r.SatisfactionScore)}{'☆'.repeat(5 - r.SatisfactionScore)}
                          <span className="score-num"> {r.SatisfactionScore}</span>
                        </div>
                      </td>
                      <td>{r.Count.toLocaleString()}</td>
                      <td className={r.ChurnRate > 50 ? 'text-red' : ''}>{r.Churned.toLocaleString()}</td>
                      <td><strong style={{ color: r.ChurnRate > 50 ? '#dc2626' : r.ChurnRate > 35 ? '#d97706' : '#16a34a' }}>{r.ChurnRate}%</strong></td>
                      <td>
                        <span className={`badge ${r.ChurnRate > 50 ? 'badge-high' : r.ChurnRate > 35 ? 'badge-medium' : 'badge-low'}`}>
                          {r.ChurnRate > 50 ? 'CRITICAL' : r.ChurnRate > 35 ? 'AT RISK' : 'HEALTHY'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tech support table */}
          <div className="chart-box">
            <div className="chart-box-title">🛠️ Tech Support Impact</div>
            <div className="chart-box-sub">Clear evidence of support reducing churn</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>Tech Support</th><th>Customers</th><th>Churned</th><th>Churn Rate</th><th>Avg Satisfaction</th><th>Avg Charges</th>
                </tr></thead>
                <tbody>
                  {support.map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.TechSupport === 'Yes' ? '✅ With Support' : '❌ No Support'}</strong></td>
                      <td>{r.Count.toLocaleString()}</td>
                      <td>{r.Churned.toLocaleString()}</td>
                      <td><strong style={{ color: r.ChurnRate > 40 ? '#dc2626' : '#16a34a' }}>{r.ChurnRate}%</strong></td>
                      <td>{r.AvgSatisfaction}/5.0</td>
                      <td>${r.AvgCharges}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeView === 'features' && (
        <div className="features-view">
          <div className="chart-box">
            <div className="chart-box-title">🤖 Feature Importance — Random Forest Model</div>
            <div className="chart-box-sub">Which factors drive churn the most (top 10 features)</div>
            <div style={{ height: 400 }}>
              <Bar data={featureBar} options={featureOpts} />
            </div>
          </div>
          <div className="feature-cards">
            {featureSorted.map((f, i) => (
              <div key={i} className="feat-card">
                <div className="feat-rank">#{i + 1}</div>
                <div className="feat-info">
                  <div className="feat-name">{f.feature}</div>
                  <div className="feat-bar-wrap">
                    <div className="feat-bar-fill" style={{ width: `${(f.importance / featureSorted[0].importance) * 100}%` }} />
                  </div>
                </div>
                <div className="feat-pct">{f.importance}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
