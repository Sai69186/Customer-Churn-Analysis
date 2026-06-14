import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'
import './Overview.css'

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend)

const fmt = (n) => Number(n).toLocaleString()
const fmtCurrency = (n) => '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })

export default function Overview({ data }) {
  const { summary, highRisk, tenure } = data
  const churnRate    = summary.ChurnRate
  const retainRate   = (100 - churnRate).toFixed(1)
  const annualLoss   = summary.AnnualChurnLoss || (summary.ChurnedCount * summary.AvgMonthlyCharges * 12)

  /* ── Pie chart ── */
  const pieData = {
    labels: ['Retained', 'Churned'],
    datasets: [{
      data: [retainRate, churnRate],
      backgroundColor: ['#16a34a', '#dc2626'],
      borderColor: ['#15803d', '#b91c1c'],
      borderWidth: 2,
      hoverOffset: 8,
    }]
  }
  const pieOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 12, weight: 'bold' }, padding: 16 } },
      tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed.toFixed(1)}%` } }
    }
  }

  /* ── Tenure bar chart ── */
  const tenureLabels = tenure.map(t => t.TenureBucket)
  const tenureBar = {
    labels: tenureLabels,
    datasets: [{
      label: 'Churn Rate (%)',
      data: tenure.map(t => t.ChurnRate),
      backgroundColor: tenure.map(t =>
        t.ChurnRate > 50 ? '#dc2626' : t.ChurnRate > 35 ? '#f59e0b' : '#16a34a'
      ),
      borderRadius: 6, borderSkipped: false,
    }]
  }
  const tenureOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y}% churn` } } },
    scales: {
      y: { beginAtZero: true, max: 80, ticks: { callback: v => v + '%' }, grid: { color: '#f3f4f6' } },
      x: { grid: { display: false } }
    }
  }

  /* ── KPI cards ── */
  const kpis = [
    {
      label: 'Total Customers', value: fmt(summary.TotalCustomers),
      sub: 'Active base', icon: '👥', color: 'blue'
    },
    {
      label: 'Churned', value: fmt(summary.ChurnedCount),
      sub: `${churnRate}% churn rate`, icon: '⚠️', color: 'red'
    },
    {
      label: 'Retained', value: fmt(summary.TotalCustomers - summary.ChurnedCount),
      sub: `${retainRate}% retention`, icon: '✅', color: 'green'
    },
    {
      label: 'Avg Satisfaction', value: `${summary.AvgSatisfaction}/5`,
      sub: 'Below 3.8 target', icon: '⭐', color: 'amber'
    },
    {
      label: 'Avg Tenure', value: `${summary.AvgTenure} mo`,
      sub: 'Customer lifespan', icon: '📅', color: 'purple'
    },
    {
      label: 'Avg Monthly Charges', value: fmtCurrency(summary.AvgMonthlyCharges),
      sub: 'Per customer', icon: '💵', color: 'teal'
    },
    {
      label: 'Annual Churn Loss', value: fmtCurrency(annualLoss),
      sub: 'Revenue at risk', icon: '📉', color: 'red'
    },
    {
      label: 'High-Risk Customers', value: fmt(highRisk.HighRiskCount),
      sub: `${highRisk.PercentageOfTotal}% of base`, icon: '🔴', color: 'amber'
    },
  ]

  return (
    <div className="overview-tab fade-up">
      {/* ── KPI Grid ── */}
      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div key={i} className={`kpi-card kpi-${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-body">
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-sub">{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="ov-charts">
        <div className="chart-box">
          <div className="chart-box-title">Churn vs Retention</div>
          <div className="chart-box-sub">Overall distribution of 5,000 customers</div>
          <div style={{ height: 260 }}>
            <Pie data={pieData} options={pieOptions} />
          </div>
        </div>

        <div className="chart-box">
          <div className="chart-box-title">Churn Rate by Tenure</div>
          <div className="chart-box-sub">Early-stage customers are most at risk</div>
          <div style={{ height: 260 }}>
            <Bar data={tenureBar} options={tenureOptions} />
          </div>
        </div>

        <div className="chart-box high-risk-box">
          <div className="chart-box-title">🔴 High-Risk Snapshot</div>
          <div className="chart-box-sub">Customers requiring immediate attention</div>
          <div className="hr-stats">
            <div className="hr-row">
              <span>At-risk customers</span>
              <strong className="text-red">{fmt(highRisk.HighRiskCount)}</strong>
            </div>
            <div className="hr-row">
              <span>% of total base</span>
              <strong>{highRisk.PercentageOfTotal}%</strong>
            </div>
            <div className="hr-row">
              <span>Actual churn within group</span>
              <strong className="text-red">{((highRisk.ActualChurn / highRisk.HighRiskCount) * 100).toFixed(1)}%</strong>
            </div>
            <div className="hr-row">
              <span>Avg monthly charges</span>
              <strong>{fmtCurrency(highRisk.AvgCharges)}</strong>
            </div>
            <div className="hr-row">
              <span>Avg satisfaction score</span>
              <strong>{highRisk.AvgSatisfaction}/5.0</strong>
            </div>
            <div className="hr-row">
              <span>Avg tenure</span>
              <strong>{highRisk.AvgTenure} months</strong>
            </div>
          </div>
          <div className="hr-triggers">
            <span className="trigger-badge">Month-to-month contract</span>
            <span className="trigger-badge">Satisfaction ≤ 2</span>
            <span className="trigger-badge">Support tickets &gt; 5</span>
          </div>
        </div>
      </div>

      {/* ── Insight Banner ── */}
      <div className="insight-banner">
        <div className="ib-item danger">
          <span className="ib-icon">📉</span>
          <div>
            <strong>41.8% Churn Rate</strong>
            <p>2,088 customers lost — significantly above the 20% industry benchmark</p>
          </div>
        </div>
        <div className="ib-item warning">
          <span className="ib-icon">⭐</span>
          <div>
            <strong>Satisfaction at 2.98/5</strong>
            <p>Below the 3.8 target. Lowest-scoring customers churn at 65%</p>
          </div>
        </div>
        <div className="ib-item success">
          <span className="ib-icon">💡</span>
          <div>
            <strong>$250K–$400K Recoverable</strong>
            <p>Targeted interventions can protect 30–35% of churning revenue</p>
          </div>
        </div>
        <div className="ib-item info">
          <span className="ib-icon">🤖</span>
          <div>
            <strong>79.55% ROC-AUC Model</strong>
            <p>Random Forest ready to score new customers in real time</p>
          </div>
        </div>
      </div>
    </div>
  )
}
