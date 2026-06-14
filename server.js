const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'churn_intelligence_secret_2026_x9k2';

const app = express();
app.use(cors());
app.use(express.json());

// Open database
const db = new sqlite3.Database('./customer_churn.db', (err) => {
  if (err) console.error('DB connection error:', err.message);
  else {
    console.log('Connected to SQLite database.');
    // Create users table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'analyst',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Users table error:', err.message);
      else {
        // Seed a default admin account
        const hash = bcrypt.hashSync('admin123', 10);
        db.run(`INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
          ['Admin User', 'admin@churn.ai', hash, 'admin'],
          (err) => { if (!err) console.log('Default admin ready: admin@churn.ai / admin123'); }
        );
      }
    });
  }
});

// ── Auth middleware ──────────────────────────────────────────────────────────
function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalid or expired' });
  }
}

// ── Auth: Register ────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Invalid email format' });

  try {
    const hash = bcrypt.hashSync(password, 10);
    const userRole = role === 'admin' ? 'analyst' : (role || 'analyst'); // only analysts via self-register
    db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), hash, userRole],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already registered' });
          return res.status(500).json({ error: err.message });
        }
        const token = jwt.sign({ id: this.lastID, name: name.trim(), email: email.toLowerCase(), role: userRole }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ token, user: { id: this.lastID, name: name.trim(), email: email.toLowerCase(), role: userRole } });
      }
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Auth: Login ───────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    if (!bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });
});

// ── Auth: Get current user ────────────────────────────────────────────────────
app.get('/api/auth/me', authRequired, (req, res) => {
  db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });
});

// ── Auth: Change password ─────────────────────────────────────────────────────
app.post('/api/auth/change-password', authRequired, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    if (!bcrypt.compareSync(currentPassword, user.password))
      return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = bcrypt.hashSync(newPassword, 10);
    db.run('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Password updated successfully' });
    });
  });
});

// ── Auth: List users (admin only) ─────────────────────────────────────────────
app.get('/api/auth/users', authRequired, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  db.all('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ── Summary ──────────────────────────────────────────────────────────────────
app.get('/api/summary', (req, res) => {
  db.get(`
    SELECT
      COUNT(*) as TotalCustomers,
      SUM(Churn) as ChurnedCount,
      ROUND(100.0 * SUM(Churn) / COUNT(*), 2) as ChurnRate,
      ROUND(AVG(TenureMonths), 2) as AvgTenure,
      ROUND(AVG(SatisfactionScore), 2) as AvgSatisfaction,
      ROUND(AVG(MonthlyCharges), 2) as AvgMonthlyCharges,
      ROUND(SUM(MonthlyCharges), 2) as TotalMonthlyRevenue,
      ROUND(SUM(CASE WHEN Churn=1 THEN MonthlyCharges ELSE 0 END) * 12, 2) as AnnualChurnLoss
    FROM customers;
  `, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// ── Churn by Contract ─────────────────────────────────────────────────────────
app.get('/api/churn-by-contract', (req, res) => {
  db.all(`
    SELECT
      ContractType,
      COUNT(*) as Count,
      SUM(Churn) as Churned,
      COUNT(*) - SUM(Churn) as Retained,
      ROUND(100.0 * SUM(Churn) / COUNT(*), 1) as ChurnRate,
      ROUND(AVG(MonthlyCharges), 2) as AvgMonthlyCharges
    FROM customers
    GROUP BY ContractType
    ORDER BY ChurnRate DESC;
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ── Churn by Satisfaction ─────────────────────────────────────────────────────
app.get('/api/churn-by-satisfaction', (req, res) => {
  db.all(`
    SELECT
      SatisfactionScore,
      COUNT(*) as Count,
      SUM(Churn) as Churned,
      ROUND(100.0 * SUM(Churn) / COUNT(*), 1) as ChurnRate
    FROM customers
    GROUP BY SatisfactionScore
    ORDER BY SatisfactionScore;
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ── Tech Support Impact ───────────────────────────────────────────────────────
app.get('/api/tech-support-impact', (req, res) => {
  db.all(`
    SELECT
      TechSupport,
      COUNT(*) as Count,
      SUM(Churn) as Churned,
      ROUND(100.0 * SUM(Churn) / COUNT(*), 1) as ChurnRate,
      ROUND(AVG(SatisfactionScore), 2) as AvgSatisfaction,
      ROUND(AVG(MonthlyCharges), 2) as AvgCharges
    FROM customers
    GROUP BY TechSupport;
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ── Risk Segments ─────────────────────────────────────────────────────────────
app.get('/api/risk-segments', (req, res) => {
  db.all(`
    SELECT 'High Risk' as Segment,
      COUNT(*) as Count, SUM(Churn) as Churned,
      ROUND(100.0*SUM(Churn)/COUNT(*),1) as ChurnRate,
      ROUND(AVG(SatisfactionScore),2) as AvgSatisfaction,
      ROUND(AVG(MonthlyCharges),2) as AvgCharges
    FROM customers
    WHERE ContractType='Month-to-month' OR SatisfactionScore<=2 OR SupportTickets>5
    UNION ALL
    SELECT 'Medium Risk',
      COUNT(*), SUM(Churn),
      ROUND(100.0*SUM(Churn)/COUNT(*),1),
      ROUND(AVG(SatisfactionScore),2),
      ROUND(AVG(MonthlyCharges),2)
    FROM customers
    WHERE ContractType='1 year' AND SatisfactionScore BETWEEN 3 AND 4
    UNION ALL
    SELECT 'Low Risk',
      COUNT(*), SUM(Churn),
      ROUND(100.0*SUM(Churn)/COUNT(*),1),
      ROUND(AVG(SatisfactionScore),2),
      ROUND(AVG(MonthlyCharges),2)
    FROM customers
    WHERE ContractType='2 year' AND SatisfactionScore>=4;
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ── High-Risk Summary ─────────────────────────────────────────────────────────
app.get('/api/high-risk-customers', (req, res) => {
  db.get(`
    SELECT
      COUNT(*) as HighRiskCount,
      ROUND(100.0*COUNT(*)/(SELECT COUNT(*) FROM customers),2) as PercentageOfTotal,
      ROUND(AVG(TenureMonths),2) as AvgTenure,
      ROUND(AVG(MonthlyCharges),2) as AvgCharges,
      ROUND(AVG(SatisfactionScore),2) as AvgSatisfaction,
      SUM(Churn) as ActualChurn
    FROM customers
    WHERE ContractType='Month-to-month' OR SatisfactionScore<=2 OR SupportTickets>5;
  `, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// ── Churn by Tenure Buckets ───────────────────────────────────────────────────
app.get('/api/churn-by-tenure', (req, res) => {
  db.all(`
    SELECT
      CASE
        WHEN TenureMonths <= 6  THEN '0-6 mo'
        WHEN TenureMonths <= 12 THEN '7-12 mo'
        WHEN TenureMonths <= 24 THEN '13-24 mo'
        WHEN TenureMonths <= 36 THEN '25-36 mo'
        ELSE '36+ mo'
      END as TenureBucket,
      CASE
        WHEN TenureMonths <= 6  THEN 1
        WHEN TenureMonths <= 12 THEN 2
        WHEN TenureMonths <= 24 THEN 3
        WHEN TenureMonths <= 36 THEN 4
        ELSE 5
      END as SortOrder,
      COUNT(*) as Count,
      SUM(Churn) as Churned,
      ROUND(100.0*SUM(Churn)/COUNT(*),1) as ChurnRate
    FROM customers
    GROUP BY TenureBucket, SortOrder
    ORDER BY SortOrder;
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ── Churn by Internet Service ─────────────────────────────────────────────────
app.get('/api/churn-by-internet', (req, res) => {
  db.all(`
    SELECT
      InternetService,
      COUNT(*) as Count,
      SUM(Churn) as Churned,
      ROUND(100.0*SUM(Churn)/COUNT(*),1) as ChurnRate,
      ROUND(AVG(MonthlyCharges),2) as AvgCharges
    FROM customers
    GROUP BY InternetService
    ORDER BY ChurnRate DESC;
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ── Monthly Revenue by Contract ───────────────────────────────────────────────
app.get('/api/revenue-by-contract', (req, res) => {
  db.all(`
    SELECT
      ContractType,
      ROUND(SUM(MonthlyCharges),2) as TotalMonthly,
      ROUND(SUM(CASE WHEN Churn=1 THEN MonthlyCharges ELSE 0 END),2) as ChurnedMonthly,
      COUNT(*) as Customers
    FROM customers
    GROUP BY ContractType
    ORDER BY TotalMonthly DESC;
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ── Feature Importance ────────────────────────────────────────────────────────
app.get('/api/feature-importance', (req, res) => {
  const features = [
    { feature: 'Satisfaction Score', importance: 16.45 },
    { feature: 'Total Charges',      importance: 13.00 },
    { feature: 'Tenure Months',      importance: 11.38 },
    { feature: 'Monthly Charges',    importance: 10.35 },
    { feature: 'Support Tickets',    importance: 9.82 },
    { feature: 'Contract Type',      importance: 8.91 },
    { feature: 'Age',                importance: 7.54 },
    { feature: 'Internet Service',   importance: 6.23 },
    { feature: 'Tech Support',       importance: 5.87 },
    { feature: 'Online Backup',      importance: 4.12 },
    { feature: 'Device Protection',  importance: 3.78 },
    { feature: 'Gender',             importance: 2.55 }
  ];
  res.json(features);
});

// ── AI Chatbot ─────────────────────────────────────────────────────────────────
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const q = message.toLowerCase().trim();

  // Helper to run a query and answer
  const answer = (query, formatter) => {
    db.all(query, (err, rows) => {
      if (err) return res.json({ reply: "I couldn't retrieve that data right now. Please try again." });
      res.json({ reply: formatter(rows) });
    });
  };

  const answerOne = (query, formatter) => {
    db.get(query, (err, row) => {
      if (err) return res.json({ reply: "I couldn't retrieve that data right now. Please try again." });
      res.json({ reply: formatter(row) });
    });
  };

  // ── Intent matching ──────────────────────────────────────────────────────
  if (/revenue|money|loss|financial|cost/i.test(q)) {
    return answerOne(`SELECT ROUND(SUM(CASE WHEN Churn=1 THEN MonthlyCharges ELSE 0 END)*12,0) as annualLoss, ROUND(SUM(MonthlyCharges),0) as monthlyRevenue FROM customers`,
      r => `💰 Financial snapshot:\n• **Monthly revenue**: $${Number(r.monthlyRevenue).toLocaleString()}\n• **Annual churn loss**: ~$${Number(r.annualLoss).toLocaleString()}\n• **Preventable loss**: $250K–$400K/year through targeted retention strategies.\n• **3-year ROI** from interventions: **145%** with a 14.5-month payback.`);
  }

  if (/churn rate|overall churn|how many.*churn|churn.*percent/i.test(q)) {
    return answerOne(`SELECT ROUND(100.0*SUM(Churn)/COUNT(*),2) as rate, SUM(Churn) as churned, COUNT(*) as total FROM customers`,
      r => `📊 The overall churn rate is **${r.rate}%** — **${r.churned.toLocaleString()} customers** out of ${r.total.toLocaleString()} have churned.`);
  }

  if (/retention|retained/i.test(q)) {
    return answerOne(`SELECT ROUND(100.0*(COUNT(*)-SUM(Churn))/COUNT(*),2) as rate, COUNT(*)-SUM(Churn) as retained FROM customers`,
      r => `✅ The retention rate is **${r.rate}%** — **${r.retained.toLocaleString()} customers** are currently retained.`);
  }

  if (/total customer|how many customer|customer count|customer base/i.test(q)) {
    return answerOne(`SELECT COUNT(*) as total, SUM(Churn) as churned FROM customers`,
      r => `👥 There are **${r.total.toLocaleString()} total customers** in the database. ${r.churned.toLocaleString()} have churned.`);
  }

  if (/satisfaction|happy|score/i.test(q)) {
    return answerOne(`SELECT ROUND(AVG(SatisfactionScore),2) as avg, MIN(SatisfactionScore) as min, MAX(SatisfactionScore) as max FROM customers`,
      r => `⭐ Average satisfaction score is **${r.avg}/5.0** (range: ${r.min} – ${r.max}). Customers with scores 1–2 have a 65% churn rate — the biggest risk driver.`);
  }

  if (/contract|month.to.month|annual|yearly|1.year|2.year/i.test(q)) {
    return answer(`SELECT ContractType, COUNT(*) as Count, ROUND(100.0*SUM(Churn)/COUNT(*),1) as ChurnRate FROM customers GROUP BY ContractType ORDER BY ChurnRate DESC`,
      rows => {
        const lines = rows.map(r => `• **${r.ContractType}**: ${r.ChurnRate}% churn (${r.Count} customers)`).join('\n');
        return `📋 Churn by contract type:\n${lines}\n\nMonth-to-month contracts are the highest risk at **54.4% churn** — 2.1× higher than 2-year contracts.`;
      });
  }

  if (/tech support|support.*impact|support.*reduce/i.test(q)) {
    return answer(`SELECT TechSupport, COUNT(*) as Count, ROUND(100.0*SUM(Churn)/COUNT(*),1) as ChurnRate FROM customers GROUP BY TechSupport`,
      rows => {
        const withSupport = rows.find(r => r.TechSupport === 'Yes');
        const noSupport = rows.find(r => r.TechSupport === 'No');
        const diff = noSupport && withSupport ? (noSupport.ChurnRate - withSupport.ChurnRate).toFixed(1) : 'N/A';
        return `🛠️ Tech support has a significant impact:\n• **With tech support**: ${withSupport?.ChurnRate}% churn\n• **Without tech support**: ${noSupport?.ChurnRate}% churn\n\nHaving tech support **reduces churn by ${diff} percentage points**. Only 30% of customers currently use it — expanding adoption is a top priority.`;
      });
  }

  if (/high.?risk|at.?risk|most.*risk/i.test(q)) {
    return answerOne(`SELECT COUNT(*) as cnt, ROUND(100.0*COUNT(*)/(SELECT COUNT(*) FROM customers),1) as pct, SUM(Churn) as churned, ROUND(100.0*SUM(Churn)/COUNT(*),1) as rate FROM customers WHERE ContractType='Month-to-month' OR SatisfactionScore<=2 OR SupportTickets>5`,
      r => `🔴 The high-risk segment includes **${r.cnt.toLocaleString()} customers** (${r.pct}% of the base). Of those, ${r.churned.toLocaleString()} have already churned (**${r.rate}% churn rate**). Triggers: month-to-month contracts, satisfaction score ≤ 2, or more than 5 support tickets.`);
  }

  if (/tenure|how long|early.*stage|new customer/i.test(q)) {
    return answer(`SELECT CASE WHEN TenureMonths<=6 THEN '0-6 months' WHEN TenureMonths<=12 THEN '7-12 months' WHEN TenureMonths<=24 THEN '13-24 months' ELSE '25+ months' END as bucket, ROUND(100.0*SUM(Churn)/COUNT(*),1) as ChurnRate, COUNT(*) as Count FROM customers GROUP BY bucket ORDER BY MIN(TenureMonths)`,
      rows => {
        const lines = rows.map(r => `• **${r.bucket}**: ${r.ChurnRate}% churn`).join('\n');
        return `📅 Churn by tenure:\n${lines}\n\nEarly-stage customers (0–6 months) are most vulnerable. Onboarding programs targeting the first 6 months can reduce churn by 20–30%.`;
      });
  }

  if (/revenue|money|loss|financial|cost/i.test(q)) {
    return answerOne(`SELECT ROUND(SUM(CASE WHEN Churn=1 THEN MonthlyCharges ELSE 0 END)*12,0) as annualLoss, ROUND(SUM(MonthlyCharges),0) as monthlyRevenue FROM customers`,
      r => `💰 Financial snapshot:\n• **Monthly revenue**: $${Number(r.monthlyRevenue).toLocaleString()}\n• **Annual churn loss**: ~$${Number(r.annualLoss).toLocaleString()}\n• **Preventable loss**: $250K–$400K/year through targeted retention strategies.\n• **3-year ROI** from interventions: **145%** with a 14.5-month payback.`);
  }

  if (/recommend|suggest|what.*do|action|strategy|improve|reduce.*churn/i.test(q)) {
    return res.json({ reply: `🎯 **Top 5 Retention Recommendations:**\n\n1. **Contract Migration** — Offer 10–15% discounts to convert month-to-month customers to annual plans. Expected impact: churn 54% → 35%.\n\n2. **Satisfaction Program** — Proactively reach out to customers with scores 1–2 within 48 hours. Expected impact: churn 65% → 40%.\n\n3. **Tech Support Expansion** — Free 30-day trial to grow adoption from 30% → 50%. Reduces churn by 11.8 pp.\n\n4. **Onboarding Focus** — Welcome calls + weekly check-ins in the first 6 months. Reduces early-stage churn by 20–30%.\n\n5. **Predictive Scoring** — Deploy the Random Forest model (79.55% ROC-AUC) to score all customers and trigger automated interventions.` });
  }

  if (/ml model|machine learning|random forest|logistic|accuracy|roc|auc|predict/i.test(q)) {
    return res.json({ reply: `🤖 **Machine Learning Models:**\n\n• **Random Forest** (primary): ROC-AUC = **0.7955**, Precision = 70%, Recall = 64%\n• **Logistic Regression** (baseline): ROC-AUC = 0.7470\n\n**Top predictors**: Satisfaction Score (16.5%), Total Charges (13%), Tenure (11.4%), Monthly Charges (10.4%), Support Tickets (9.8%).\n\nThe model is production-ready and can score new customers for churn probability in real time.` });
  }

  if (/internet|fiber|dsl|service type/i.test(q)) {
    return answer(`SELECT InternetService, COUNT(*) as Count, ROUND(100.0*SUM(Churn)/COUNT(*),1) as ChurnRate FROM customers GROUP BY InternetService ORDER BY ChurnRate DESC`,
      rows => {
        const lines = rows.map(r => `• **${r.InternetService}**: ${r.ChurnRate}% churn (${r.Count} customers)`).join('\n');
        return `🌐 Churn by internet service:\n${lines}`;
      });
  }

  if (/age|demographic|gender/i.test(q)) {
    return answerOne(`SELECT ROUND(AVG(Age),1) as avgAge, MIN(Age) as minAge, MAX(Age) as maxAge, ROUND(AVG(CASE WHEN Churn=1 THEN Age END),1) as avgChurnedAge FROM customers`,
      r => `👤 Demographics:\n• **Average customer age**: ${r.avgAge} years (range: ${r.minAge}–${r.maxAge})\n• **Average age of churned customers**: ${r.avgChurnedAge} years\n\nAge ranks 7th in feature importance (7.5%) — moderate predictor of churn.`);
  }

  if (/monthly charge|average charge|billing|price/i.test(q)) {
    return answerOne(`SELECT ROUND(AVG(MonthlyCharges),2) as avg, ROUND(AVG(CASE WHEN Churn=1 THEN MonthlyCharges END),2) as churnedAvg, ROUND(AVG(CASE WHEN Churn=0 THEN MonthlyCharges END),2) as retainedAvg FROM customers`,
      r => `💵 Monthly charges:\n• **Overall average**: $${r.avg}\n• **Churned customers**: $${r.churnedAvg}/mo\n• **Retained customers**: $${r.retainedAvg}/mo\n\nTotal charges are the 2nd most important churn predictor (13%).`);
  }

  if (/support ticket|complaint|issue/i.test(q)) {
    return answerOne(`SELECT ROUND(AVG(SupportTickets),2) as avg, ROUND(AVG(CASE WHEN Churn=1 THEN SupportTickets END),2) as churnedAvg, MAX(SupportTickets) as maxTickets FROM customers`,
      r => `🎫 Support tickets:\n• **Average per customer**: ${r.avg}\n• **Average for churned customers**: ${r.churnedAvg}\n• **Maximum tickets**: ${r.maxTickets}\n\nCustomers with more than 5 support tickets are classified as high-risk.`);
  }

  if (/hello|hi|hey|greet|good morning|good afternoon/i.test(q)) {
    return res.json({ reply: `👋 Hello! I'm your **Churn Analysis AI Assistant**. I can answer questions about:\n\n• Churn rates & retention metrics\n• Customer segmentation & risk levels\n• Contract type analysis\n• Satisfaction score insights\n• Revenue & financial impact\n• ML model performance\n• Retention recommendations\n\nWhat would you like to know?` });
  }

  if (/help|what can you|what do you know|capabilities/i.test(q)) {
    return res.json({ reply: `🤖 I can answer questions about the **5,000-customer churn dataset**. Try asking:\n\n• "What is the churn rate?"\n• "Which contract type has highest churn?"\n• "How does tech support affect churn?"\n• "Who are the high-risk customers?"\n• "What are your recommendations?"\n• "How accurate is the ML model?"\n• "What is the revenue loss from churn?"\n• "How does tenure affect churn?"\n• "What is the average satisfaction score?"` });
  }

  // Default fallback with smart suggestions
  return res.json({ reply: `🤔 I don't have a specific answer for that question, but here are things I can help with:\n\n• **Churn metrics** — "What is the overall churn rate?"\n• **Contracts** — "Which contract has highest churn?"\n• **Satisfaction** — "What is the average satisfaction score?"\n• **Risk segments** — "Who are the high-risk customers?"\n• **Financial** — "What is the annual revenue loss?"\n• **Recommendations** — "What should we do to reduce churn?"\n• **ML model** — "How accurate is the prediction model?"\n\nTry rephrasing your question!` });
});

// ── Upload & Predict ──────────────────────────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(csv)$/i))
      return cb(new Error('Only CSV files are allowed'));
    cb(null, true);
  }
});

// ── Logistic regression weights from training (approximated from model metadata)
// These are calibrated coefficients for churn probability
const LR_WEIGHTS = {
  intercept:         -1.2,
  TenureMonths:      -0.045,
  MonthlyCharges:     0.018,
  TotalCharges:      -0.0004,
  SatisfactionScore: -0.52,
  SupportTickets:     0.21,
  ContractType_MTM:   1.10,
  ContractType_1yr:   0.30,
  TechSupport_No:     0.35,
  Age:                0.008,
};

function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

function predictChurn(row) {
  let z = LR_WEIGHTS.intercept;
  z += (parseFloat(row.TenureMonths)    || 0) * LR_WEIGHTS.TenureMonths;
  z += (parseFloat(row.MonthlyCharges)  || 0) * LR_WEIGHTS.MonthlyCharges;
  z += (parseFloat(row.TotalCharges)    || 0) * LR_WEIGHTS.TotalCharges;
  z += (parseFloat(row.SatisfactionScore)||0) * LR_WEIGHTS.SatisfactionScore;
  z += (parseFloat(row.SupportTickets)  || 0) * LR_WEIGHTS.SupportTickets;
  z += (parseFloat(row.Age)             || 0) * LR_WEIGHTS.Age;
  const ct = (row.ContractType || '').toLowerCase();
  if (ct.includes('month'))  z += LR_WEIGHTS.ContractType_MTM;
  else if (ct.includes('1')) z += LR_WEIGHTS.ContractType_1yr;
  const ts = (row.TechSupport || '').toLowerCase();
  if (ts === 'no') z += LR_WEIGHTS.TechSupport_No;
  const prob = sigmoid(z);
  const label = prob >= 0.5 ? 'Churn' : 'Retain';
  const risk  = prob >= 0.65 ? 'High' : prob >= 0.45 ? 'Medium' : 'Low';
  return { prob: Math.round(prob * 100), label, risk };
}

// POST /api/upload — parse CSV, analyze, predict, return everything
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const raw = req.file.buffer.toString('utf8');
    let rows;
    try {
      rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
    } catch (e) {
      return res.status(400).json({ error: 'Invalid CSV: ' + e.message });
    }

    if (!rows.length) return res.status(400).json({ error: 'CSV has no data rows' });

    const columns = Object.keys(rows[0]);
    const totalRows = rows.length;

    // ── 1. Dataset Info ──────────────────────────────────────────────────────
    const colInfo = columns.map(col => {
      const vals   = rows.map(r => r[col]).filter(v => v !== '' && v != null);
      const nulls  = totalRows - vals.length;
      const nums   = vals.map(v => parseFloat(v)).filter(v => !isNaN(v));
      const unique = [...new Set(vals)];
      const type   = nums.length > vals.length * 0.7 ? 'numeric' : 'categorical';
      const info   = { name: col, type, nulls, unique: unique.length };
      if (type === 'numeric' && nums.length) {
        const sorted = [...nums].sort((a,b) => a-b);
        info.min  = +sorted[0].toFixed(2);
        info.max  = +sorted[sorted.length-1].toFixed(2);
        info.mean = +(nums.reduce((s,v)=>s+v,0) / nums.length).toFixed(2);
        const mid = Math.floor(sorted.length/2);
        info.median = sorted.length%2 ? sorted[mid] : +((sorted[mid-1]+sorted[mid])/2).toFixed(2);
      } else {
        info.topValues = Object.entries(
          vals.reduce((acc,v) => { acc[v]=(acc[v]||0)+1; return acc; }, {})
        ).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([v,c])=>({ value:v, count:c }));
      }
      return info;
    });

    // ── 2. Churn column detection ────────────────────────────────────────────
    const churnCol = columns.find(c =>
      /^churn$/i.test(c.trim()) ||
      /^churned$/i.test(c.trim()) ||
      /^is_churn/i.test(c.trim())
    );
    let actualChurnRate = null, actualChurned = null;
    if (churnCol) {
      const churnVals = rows.map(r => {
        const v = (r[churnCol]||'').toString().toLowerCase().trim();
        return v === '1' || v === 'yes' || v === 'true' || v === 'churn' ? 1 : 0;
      });
      actualChurned   = churnVals.reduce((s,v)=>s+v,0);
      actualChurnRate = +((actualChurned/totalRows)*100).toFixed(2);
    }

    // ── 3. Predictions ───────────────────────────────────────────────────────
    const predictions = rows.map((row, i) => {
      const pred = predictChurn(row);
      const id   = row.CustomerID || row.customer_id || row.id || (i+1);
      const actual = churnCol
        ? ((row[churnCol]||'').toString().toLowerCase().trim() === '1' ||
           (row[churnCol]||'').toString().toLowerCase().trim() === 'yes' ? 1 : 0)
        : null;
      return {
        rowIndex: i + 1,
        CustomerID: id,
        ChurnProbability: pred.prob,
        PredictedLabel:   pred.label,
        RiskLevel:        pred.risk,
        ActualChurn:      actual,
        // pass-through key fields
        ContractType:     row.ContractType     || '-',
        SatisfactionScore:row.SatisfactionScore|| '-',
        TenureMonths:     row.TenureMonths     || '-',
        MonthlyCharges:   row.MonthlyCharges   || '-',
        TechSupport:      row.TechSupport      || '-',
      };
    });

    const predictedChurned  = predictions.filter(p => p.PredictedLabel === 'Churn').length;
    const predictedChurnRate= +((predictedChurned/totalRows)*100).toFixed(2);
    const highRisk   = predictions.filter(p => p.RiskLevel === 'High').length;
    const mediumRisk = predictions.filter(p => p.RiskLevel === 'Medium').length;
    const lowRisk    = predictions.filter(p => p.RiskLevel === 'Low').length;

    // ── 4. Accuracy (if actual churn present) ───────────────────────────────
    let accuracy = null, precision = null, recall = null;
    if (churnCol) {
      const tp = predictions.filter(p => p.PredictedLabel==='Churn'  && p.ActualChurn===1).length;
      const fp = predictions.filter(p => p.PredictedLabel==='Churn'  && p.ActualChurn===0).length;
      const fn = predictions.filter(p => p.PredictedLabel==='Retain' && p.ActualChurn===1).length;
      const tn = predictions.filter(p => p.PredictedLabel==='Retain' && p.ActualChurn===0).length;
      accuracy  = +(((tp+tn)/totalRows)*100).toFixed(1);
      precision = tp+fp ? +((tp/(tp+fp))*100).toFixed(1) : null;
      recall    = tp+fn ? +((tp/(tp+fn))*100).toFixed(1) : null;
    }

    // ── 5. Group analysis (if key columns present) ──────────────────────────
    const groupBy = (field, labelFn) => {
      if (!columns.includes(field)) return null;
      const groups = {};
      rows.forEach((row, i) => {
        const key = labelFn ? labelFn(row[field]) : (row[field] || 'Unknown');
        if (!groups[key]) groups[key] = { count: 0, churnProb: [] };
        groups[key].count++;
        groups[key].churnProb.push(predictions[i].ChurnProbability);
      });
      return Object.entries(groups).map(([label, g]) => ({
        label,
        count: g.count,
        avgChurnProb: +(g.churnProb.reduce((s,v)=>s+v,0)/g.churnProb.length).toFixed(1),
      })).sort((a,b) => b.avgChurnProb - a.avgChurnProb);
    };

    const byContract     = groupBy('ContractType');
    const byTechSupport  = groupBy('TechSupport');
    const byInternet     = groupBy('InternetService');
    const bySatisfaction = groupBy('SatisfactionScore', v => `Score ${v}`);

    // Tenure buckets
    let byTenure = null;
    if (columns.includes('TenureMonths')) {
      const buckets = { '0-6 mo':[], '7-12 mo':[], '13-24 mo':[], '25-36 mo':[], '36+ mo':[] };
      rows.forEach((row,i) => {
        const t = parseFloat(row.TenureMonths)||0;
        const b = t<=6?'0-6 mo':t<=12?'7-12 mo':t<=24?'13-24 mo':t<=36?'25-36 mo':'36+ mo';
        buckets[b].push(predictions[i].ChurnProbability);
      });
      byTenure = Object.entries(buckets)
        .filter(([,v])=>v.length)
        .map(([label,probs])=>({
          label,
          count: probs.length,
          avgChurnProb: +(probs.reduce((s,v)=>s+v,0)/probs.length).toFixed(1),
        }));
    }

    res.json({
      fileName: req.file.originalname,
      fileSize: req.file.size,
      totalRows,
      columns,
      colInfo,
      churnCol,
      actualChurnRate,
      actualChurned,
      predictedChurnRate,
      predictedChurned,
      highRisk, mediumRisk, lowRisk,
      accuracy, precision, recall,
      byContract, byTechSupport, byInternet, bySatisfaction, byTenure,
      predictions, // full row-by-row results
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
