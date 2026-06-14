import { useState, useRef, useCallback } from 'react'
import axios from 'axios'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Pie, Line } from 'react-chartjs-2'
import './Upload.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const API = 'http://localhost:3000'

const RISK_COLOR = { High: '#dc2626', Medium: '#f59e0b', Low: '#16a34a' }
const RISK_BG    = { High: '#fee2e2', Medium: '#fef3c7', Low: '#dcfce7' }

/* ── Helper: generate CSV download ── */
function downloadCSV(predictions, fileName) {
  const headers = ['Row','CustomerID','ChurnProbability(%)','PredictedLabel','RiskLevel','ActualChurn','ContractType','SatisfactionScore','TenureMonths','MonthlyCharges','TechSupport']
  const rows = predictions.map(p => [
    p.rowIndex, p.CustomerID, p.ChurnProbability, p.PredictedLabel,
    p.RiskLevel, p.ActualChurn ?? 'N/A', p.ContractType,
    p.SatisfactionScore, p.TenureMonths, p.MonthlyCharges, p.TechSupport
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `predictions_${fileName}`
  a.click()
  URL.revokeObjectURL(url)
}

/* ── Tiny sparkle bar ── */
function MiniBar({ value, max, color }) {
  const pct = max ? (value / max) * 100 : 0
  return (
    <div className="mini-bar-wrap">
      <div className="mini-bar-fill" style={{ width: `${pct}%`, background: color || '#2563a8' }} />
    </div>
  )
}

/* ── Column info card ── */
function ColCard({ col }) {
  return (
    <div className={`col-card col-${col.type}`}>
      <div className="col-header">
        <span className="col-type-badge">{col.type === 'numeric' ? '🔢' : '🏷️'} {col.type}</span>
        <span className="col-nulls">{col.nulls > 0 ? `⚠️ ${col.nulls} null` : '✅ Complete'}</span>
      </div>
      <div className="col-name">{col.name}</div>
      {col.type === 'numeric' ? (
        <div className="col-stats">
          <div className="cs"><span>Min</span><strong>{col.min}</strong></div>
          <div className="cs"><span>Mean</span><strong>{col.mean}</strong></div>
          <div className="cs"><span>Median</span><strong>{col.median}</strong></div>
          <div className="cs"><span>Max</span><strong>{col.max}</strong></div>
        </div>
      ) : (
        <div className="col-cats">
          <div className="col-unique">{col.unique} unique values</div>
          {col.topValues?.slice(0, 3).map((tv, i) => (
            <div key={i} className="col-top-val">
              <span>{tv.value}</span>
              <MiniBar value={tv.count} max={col.topValues[0].count} />
              <span className="ctv-count">{tv.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main component ── */
export default function Upload() {
  const [dragOver, setDragOver]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState(null)
  const [activeSection, setActiveSection] = useState('overview')
  const [predPage, setPredPage]   = useState(0)
  const [filterRisk, setFilterRisk] = useState('All')
  const [searchId, setSearchId]   = useState('')
  const fileRef = useRef()

  const ROWS_PER_PAGE = 20

  const handleFile = useCallback(async (file) => {
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file.')
      return
    }
    setError(null)
    setResult(null)
    setUploading(true)
    setPredPage(0)
    setFilterRisk('All')
    setSearchId('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await axios.post(`${API}/api/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
      setActiveSection('overview')
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [])

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onDragOver  = e => { e.preventDefault(); setDragOver(true)  }
  const onDragLeave = ()  => setDragOver(false)
  const onFileInput = e   => handleFile(e.target.files[0])
  const reset       = ()  => { setResult(null); setError(null) }

  /* ── Filtered predictions ── */
  const allPreds = result?.predictions || []
  const filtered = allPreds.filter(p => {
    const riskOk = filterRisk === 'All' || p.RiskLevel === filterRisk
    const idOk   = !searchId || String(p.CustomerID).toLowerCase().includes(searchId.toLowerCase())
    return riskOk && idOk
  })
  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE)
  const pagePreds  = filtered.slice(predPage * ROWS_PER_PAGE, (predPage + 1) * ROWS_PER_PAGE)

  /* ── Charts ── */
  const makeBar = (data, colorFn, label) => data ? ({
    labels: data.map(d => d.label),
    datasets: [{
      label,
      data: data.map(d => d.avgChurnProb),
      backgroundColor: data.map((d, i) => colorFn ? colorFn(d, i) : `hsl(${210 + i*25},65%,55%)`),
      borderRadius: 6, borderSkipped: false,
    }]
  }) : null

  const barOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y}% avg churn probability` } } },
    scales: {
      y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%', font: { size: 10 } }, grid: { color: '#f3f4f6' } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  }

  const riskPie = result ? {
    labels: ['High Risk', 'Medium Risk', 'Low Risk'],
    datasets: [{
      data: [result.highRisk, result.mediumRisk, result.lowRisk],
      backgroundColor: ['#dc2626', '#f59e0b', '#16a34a'],
      borderColor: ['#b91c1c', '#d97706', '#15803d'],
      borderWidth: 2, hoverOffset: 8,
    }]
  } : null

  const probDistData = result ? (() => {
    const buckets = Array(10).fill(0)
    result.predictions.forEach(p => { buckets[Math.min(9, Math.floor(p.ChurnProbability / 10))]++ })
    return {
      labels: buckets.map((_, i) => `${i*10}–${i*10+10}%`),
      datasets: [{
        label: 'Customers',
        data: buckets,
        backgroundColor: buckets.map((_, i) => i >= 5 ? `rgba(220,38,38,${0.4 + i*0.06})` : `rgba(22,163,74,${0.3 + i*0.05})`),
        borderRadius: 4,
      }]
    }
  })() : null

  const sections = [
    { id: 'overview',  label: '📊 Overview'    },
    { id: 'dataset',   label: '🗂️ Dataset Info'  },
    { id: 'analysis',  label: '📈 Analysis'     },
    { id: 'predictions', label: '🎯 Predictions' },
  ]

  return (
    <div className="upload-page fade-up">

      {/* ── Drop Zone (shown when no result) ── */}
      {!result && (
        <div className="upload-hero">
          <div className="upload-hero-text">
            <h2>Upload Your Customer Dataset</h2>
            <p>Upload any CSV with customer data — we'll analyze it instantly, run churn predictions on every row, and give you a full breakdown.</p>
          </div>

          <div
            className={`drop-zone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
            onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
            onClick={() => !uploading && fileRef.current.click()}
          >
            <input ref={fileRef} type="file" accept=".csv" onChange={onFileInput} hidden />
            {uploading ? (
              <div className="dz-uploading">
                <div className="dz-spinner" />
                <p>Analyzing your dataset...</p>
                <span>Running predictions on every row</span>
              </div>
            ) : (
              <div className="dz-content">
                <div className="dz-icon">📂</div>
                <h3>Drag & Drop your CSV file here</h3>
                <p>or click to browse</p>
                <div className="dz-specs">
                  <span>✅ Any CSV format</span>
                  <span>✅ Up to 20 MB</span>
                  <span>✅ Any number of rows</span>
                  <span>✅ Instant analysis</span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="upload-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="upload-hint-box">
            <div className="uhb-title">💡 Works best with columns like:</div>
            <div className="uhb-cols">
              {['CustomerID','Age','Gender','TenureMonths','MonthlyCharges','TotalCharges',
                'ContractType','InternetService','TechSupport','SatisfactionScore','SupportTickets','Churn']
                .map(c => <span key={c} className="uhb-col">{c}</span>)}
            </div>
            <p className="uhb-note">A <code>Churn</code> column (0/1 or Yes/No) enables accuracy scoring. Without it, predictions still work on all numeric/categorical fields.</p>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div className="results-area">
          {/* ── Results Header ── */}
          <div className="results-header">
            <div className="rh-left">
              <div className="rh-file">
                <span className="rh-icon">📄</span>
                <div>
                  <div className="rh-filename">{result.fileName}</div>
                  <div className="rh-meta">
                    {result.totalRows.toLocaleString()} rows · {result.columns.length} columns ·{' '}
                    {(result.fileSize / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>
            </div>
            <div className="rh-right">
              <button className="btn-download" onClick={() => downloadCSV(result.predictions, result.fileName)}>
                ⬇️ Download Predictions
              </button>
              <button className="btn-reset" onClick={reset}>↩ Upload New File</button>
            </div>
          </div>

          {/* ── Summary KPIs ── */}
          <div className="result-kpis">
            <div className="rkpi blue">
              <div className="rkpi-icon">👥</div>
              <div className="rkpi-val">{result.totalRows.toLocaleString()}</div>
              <div className="rkpi-label">Total Rows</div>
            </div>
            <div className="rkpi red">
              <div className="rkpi-icon">⚠️</div>
              <div className="rkpi-val">{result.predictedChurnRate}%</div>
              <div className="rkpi-label">Predicted Churn Rate</div>
              <div className="rkpi-sub">{result.predictedChurned} customers</div>
            </div>
            {result.actualChurnRate !== null && (
              <div className="rkpi green">
                <div className="rkpi-icon">📊</div>
                <div className="rkpi-val">{result.actualChurnRate}%</div>
                <div className="rkpi-label">Actual Churn Rate</div>
                <div className="rkpi-sub">{result.actualChurned} churned</div>
              </div>
            )}
            <div className="rkpi danger">
              <div className="rkpi-icon">🔴</div>
              <div className="rkpi-val">{result.highRisk.toLocaleString()}</div>
              <div className="rkpi-label">High Risk</div>
              <div className="rkpi-sub">{((result.highRisk/result.totalRows)*100).toFixed(1)}% of base</div>
            </div>
            <div className="rkpi amber">
              <div className="rkpi-icon">🟡</div>
              <div className="rkpi-val">{result.mediumRisk.toLocaleString()}</div>
              <div className="rkpi-label">Medium Risk</div>
            </div>
            <div className="rkpi success">
              <div className="rkpi-icon">🟢</div>
              <div className="rkpi-val">{result.lowRisk.toLocaleString()}</div>
              <div className="rkpi-label">Low Risk</div>
            </div>
            {result.accuracy !== null && (
              <div className="rkpi purple">
                <div className="rkpi-icon">🤖</div>
                <div className="rkpi-val">{result.accuracy}%</div>
                <div className="rkpi-label">Model Accuracy</div>
                {result.precision && <div className="rkpi-sub">Precision {result.precision}% · Recall {result.recall}%</div>}
              </div>
            )}
          </div>

          {/* ── Section nav ── */}
          <div className="section-nav">
            {sections.map(s => (
              <button key={s.id}
                className={`snav-btn ${activeSection === s.id ? 'active' : ''}`}
                onClick={() => setActiveSection(s.id)}
              >{s.label}</button>
            ))}
          </div>

          {/* ════ OVERVIEW ════ */}
          {activeSection === 'overview' && (
            <div className="section-content">
              <div className="ov-charts-grid">
                {riskPie && (
                  <div className="chart-box">
                    <div className="chart-box-title">Risk Distribution</div>
                    <div className="chart-box-sub">Predicted risk level of all uploaded customers</div>
                    <div style={{ height: 260 }}>
                      <Pie data={riskPie} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11, weight: 'bold' }, padding: 12 } } } }} />
                    </div>
                  </div>
                )}
                {probDistData && (
                  <div className="chart-box">
                    <div className="chart-box-title">Churn Probability Distribution</div>
                    <div className="chart-box-sub">How many customers fall in each probability bucket</div>
                    <div style={{ height: 260 }}>
                      <Bar data={probDistData} options={{ ...barOpts, scales: { ...barOpts.scales, y: { ...barOpts.scales.y, ticks: { font: { size: 10 } }, title: { display: true, text: 'Customers' } } } }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Accuracy panel (when actual churn exists) */}
              {result.accuracy !== null && (
                <div className="accuracy-panel">
                  <div className="ap-title">🎯 Model Performance on Your Dataset</div>
                  <div className="ap-metrics">
                    <div className="apm">
                      <div className="apm-val" style={{ color: result.accuracy >= 70 ? '#16a34a' : '#d97706' }}>{result.accuracy}%</div>
                      <div className="apm-label">Accuracy</div>
                    </div>
                    {result.precision && <>
                      <div className="apm">
                        <div className="apm-val">{result.precision}%</div>
                        <div className="apm-label">Precision</div>
                      </div>
                      <div className="apm">
                        <div className="apm-val">{result.recall}%</div>
                        <div className="apm-label">Recall</div>
                      </div>
                    </>}
                    <div className="apm">
                      <div className="apm-val">{result.actualChurnRate}%</div>
                      <div className="apm-label">Actual Churn</div>
                    </div>
                    <div className="apm">
                      <div className="apm-val">{result.predictedChurnRate}%</div>
                      <div className="apm-label">Predicted Churn</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Auto-generated insight cards */}
              <div className="insight-cards-grid">
                <div className="ic ic-red">
                  <span>🔴</span>
                  <div>
                    <strong>{result.predictedChurnRate}% predicted churn rate</strong>
                    <p>{result.predictedChurned} out of {result.totalRows} customers are predicted to churn based on their profile.</p>
                  </div>
                </div>
                <div className="ic ic-amber">
                  <span>⚠️</span>
                  <div>
                    <strong>{((result.highRisk/result.totalRows)*100).toFixed(1)}% in high-risk tier</strong>
                    <p>{result.highRisk} customers show multiple churn risk factors and need immediate attention.</p>
                  </div>
                </div>
                <div className="ic ic-blue">
                  <span>📋</span>
                  <div>
                    <strong>{result.columns.length} columns analysed</strong>
                    <p>Dataset contains {result.colInfo?.filter(c=>c.type==='numeric').length} numeric and {result.colInfo?.filter(c=>c.type==='categorical').length} categorical features.</p>
                  </div>
                </div>
                {result.byContract && (() => {
                  const worst = result.byContract[0]
                  return (
                    <div className="ic ic-purple">
                      <span>📝</span>
                      <div>
                        <strong>"{worst.label}" contracts are riskiest</strong>
                        <p>{worst.avgChurnProb}% avg churn probability — {worst.count} customers in this group.</p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* ════ DATASET INFO ════ */}
          {activeSection === 'dataset' && (
            <div className="section-content">
              <div className="dataset-meta">
                <div className="dm-item"><span>📄 File</span><strong>{result.fileName}</strong></div>
                <div className="dm-item"><span>📏 Size</span><strong>{(result.fileSize/1024).toFixed(1)} KB</strong></div>
                <div className="dm-item"><span>📋 Rows</span><strong>{result.totalRows.toLocaleString()}</strong></div>
                <div className="dm-item"><span>🗂️ Columns</span><strong>{result.columns.length}</strong></div>
                <div className="dm-item"><span>🔢 Numeric</span><strong>{result.colInfo?.filter(c=>c.type==='numeric').length}</strong></div>
                <div className="dm-item"><span>🏷️ Categorical</span><strong>{result.colInfo?.filter(c=>c.type==='categorical').length}</strong></div>
                {result.churnCol && <div className="dm-item"><span>🎯 Churn Col</span><strong>"{result.churnCol}"</strong></div>}
                <div className="dm-item"><span>⚠️ Cols w/ Nulls</span><strong>{result.colInfo?.filter(c=>c.nulls>0).length}</strong></div>
              </div>

              <div className="col-grid">
                {result.colInfo?.map((col, i) => <ColCard key={i} col={col} />)}
              </div>
            </div>
          )}

          {/* ════ ANALYSIS ════ */}
          {activeSection === 'analysis' && (
            <div className="section-content">
              <div className="analysis-grid-2">
                {result.byContract && (
                  <div className="chart-box">
                    <div className="chart-box-title">Avg Churn Probability by Contract Type</div>
                    <div className="chart-box-sub">Higher bar = higher predicted churn risk for that group</div>
                    <div style={{ height: 240 }}>
                      <Bar data={makeBar(result.byContract, (d) => d.avgChurnProb > 60 ? '#dc2626' : d.avgChurnProb > 40 ? '#f59e0b' : '#16a34a', 'Avg Churn %')} options={barOpts} />
                    </div>
                  </div>
                )}
                {result.byTechSupport && (
                  <div className="chart-box">
                    <div className="chart-box-title">Tech Support vs Churn Probability</div>
                    <div className="chart-box-sub">Impact of tech support on predicted churn risk</div>
                    <div style={{ height: 240 }}>
                      <Bar data={makeBar(result.byTechSupport, (d) => d.label.toLowerCase().includes('no') ? '#dc2626' : '#16a34a', 'Avg Churn %')} options={barOpts} />
                    </div>
                  </div>
                )}
                {result.bySatisfaction && (
                  <div className="chart-box">
                    <div className="chart-box-title">Churn Probability by Satisfaction Score</div>
                    <div className="chart-box-sub">Lower satisfaction = higher predicted churn</div>
                    <div style={{ height: 240 }}>
                      <Bar
                        data={{
                          labels: result.bySatisfaction.sort((a,b)=>a.label.localeCompare(b.label)).map(d=>d.label),
                          datasets: [{
                            label: 'Avg Churn %',
                            data: result.bySatisfaction.sort((a,b)=>a.label.localeCompare(b.label)).map(d=>d.avgChurnProb),
                            backgroundColor: result.bySatisfaction.sort((a,b)=>a.label.localeCompare(b.label)).map(d =>
                              d.avgChurnProb > 60 ? '#dc2626' : d.avgChurnProb > 40 ? '#f59e0b' : '#16a34a'
                            ),
                            borderRadius: 6,
                          }]
                        }}
                        options={barOpts}
                      />
                    </div>
                  </div>
                )}
                {result.byTenure && (
                  <div className="chart-box">
                    <div className="chart-box-title">Churn Probability by Tenure</div>
                    <div className="chart-box-sub">New customers (0–6 mo) tend to be highest risk</div>
                    <div style={{ height: 240 }}>
                      <Bar data={makeBar(result.byTenure, (d) => d.avgChurnProb > 55 ? '#dc2626' : d.avgChurnProb > 40 ? '#f59e0b' : '#16a34a', 'Avg Churn %')} options={barOpts} />
                    </div>
                  </div>
                )}
                {result.byInternet && (
                  <div className="chart-box">
                    <div className="chart-box-title">Churn Probability by Internet Service</div>
                    <div className="chart-box-sub">Service type correlation with churn risk</div>
                    <div style={{ height: 240 }}>
                      <Bar data={makeBar(result.byInternet, null, 'Avg Churn %')} options={barOpts} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════ PREDICTIONS TABLE ════ */}
          {activeSection === 'predictions' && (
            <div className="section-content">
              <div className="pred-toolbar">
                <div className="pred-filters">
                  <input
                    className="pred-search"
                    placeholder="🔍 Search Customer ID..."
                    value={searchId}
                    onChange={e => { setSearchId(e.target.value); setPredPage(0) }}
                  />
                  <div className="risk-filters">
                    {['All','High','Medium','Low'].map(r => (
                      <button
                        key={r}
                        className={`rf-btn ${filterRisk === r ? 'active' : ''} ${r !== 'All' ? `rf-${r.toLowerCase()}` : ''}`}
                        onClick={() => { setFilterRisk(r); setPredPage(0) }}
                      >{r}</button>
                    ))}
                  </div>
                </div>
                <div className="pred-count">
                  Showing {filtered.length.toLocaleString()} of {allPreds.length.toLocaleString()} predictions
                </div>
              </div>

              <div className="pred-table-wrap">
                <table className="pred-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Customer ID</th>
                      <th>Churn Prob</th>
                      <th>Prediction</th>
                      <th>Risk</th>
                      {result.churnCol && <th>Actual</th>}
                      <th>Contract</th>
                      <th>Satisfaction</th>
                      <th>Tenure</th>
                      <th>Monthly $</th>
                      <th>Tech Support</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagePreds.map((p, i) => (
                      <tr key={i} className={`pred-row risk-row-${p.RiskLevel.toLowerCase()}`}>
                        <td className="pred-idx">{p.rowIndex}</td>
                        <td><strong>{p.CustomerID}</strong></td>
                        <td>
                          <div className="prob-cell">
                            <div className="prob-bar-wrap">
                              <div className="prob-bar" style={{ width: `${p.ChurnProbability}%`, background: RISK_COLOR[p.RiskLevel] }} />
                            </div>
                            <span className="prob-num" style={{ color: RISK_COLOR[p.RiskLevel] }}>{p.ChurnProbability}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`pred-label ${p.PredictedLabel === 'Churn' ? 'pred-churn' : 'pred-retain'}`}>
                            {p.PredictedLabel === 'Churn' ? '⚠️ Churn' : '✅ Retain'}
                          </span>
                        </td>
                        <td>
                          <span className="risk-pill" style={{ background: RISK_BG[p.RiskLevel], color: RISK_COLOR[p.RiskLevel] }}>
                            {p.RiskLevel}
                          </span>
                        </td>
                        {result.churnCol && (
                          <td>
                            {p.ActualChurn !== null
                              ? <span className={p.ActualChurn === 1 ? 'act-churn' : 'act-retain'}>
                                  {p.ActualChurn === 1 ? '❌ Yes' : '✅ No'}
                                </span>
                              : '–'}
                          </td>
                        )}
                        <td>{p.ContractType}</td>
                        <td>{p.SatisfactionScore}</td>
                        <td>{p.TenureMonths}</td>
                        <td>${p.MonthlyCharges}</td>
                        <td>{p.TechSupport}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button disabled={predPage === 0} onClick={() => setPredPage(0)}>«</button>
                  <button disabled={predPage === 0} onClick={() => setPredPage(p => p-1)}>‹</button>
                  <span>Page {predPage+1} of {totalPages}</span>
                  <button disabled={predPage >= totalPages-1} onClick={() => setPredPage(p => p+1)}>›</button>
                  <button disabled={predPage >= totalPages-1} onClick={() => setPredPage(totalPages-1)}>»</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
