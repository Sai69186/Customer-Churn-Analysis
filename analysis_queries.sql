
-- Query 1: Churn Summary Statistics
SELECT 
    COUNT(*) as TotalCustomers,
    SUM(Churn) as ChurnedCount,
    ROUND(100.0 * SUM(Churn) / COUNT(*), 2) as ChurnRate,
    ROUND(AVG(TenureMonths), 2) as AvgTenure,
    ROUND(AVG(SatisfactionScore), 2) as AvgSatisfaction
FROM customers;



-- Query 2: Churn by Contract Type
SELECT 
    ContractType,
    COUNT(*) as CustomerCount,
    SUM(Churn) as ChurnedCount,
    ROUND(100.0 * SUM(Churn) / COUNT(*), 2) as ChurnRate,
    ROUND(AVG(MonthlyCharges), 2) as AvgMonthlyCharges,
    ROUND(AVG(TenureMonths), 2) as AvgTenure
FROM customers
GROUP BY ContractType
ORDER BY ChurnRate DESC;



-- Query 3: High-Risk Customers (likely to churn)
SELECT 
    COUNT(*) as HighRiskCount,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM customers), 2) as PercentageOfTotal,
    ROUND(AVG(TenureMonths), 2) as AvgTenure,
    ROUND(AVG(MonthlyCharges), 2) as AvgCharges,
    ROUND(AVG(SatisfactionScore), 2) as AvgSatisfaction,
    SUM(Churn) as ActualChurn,
    ROUND(100.0 * SUM(Churn) / COUNT(*), 2) as ActualChurnRate
FROM customers
WHERE ContractType = 'Month-to-month' 
    OR SatisfactionScore <= 2 
    OR SupportTickets > 5;



-- Query 4: Impact of Tech Support on Churn
SELECT 
    TechSupport,
    COUNT(*) as CustomerCount,
    SUM(Churn) as ChurnedCount,
    ROUND(100.0 * SUM(Churn) / COUNT(*), 2) as ChurnRate,
    ROUND(AVG(MonthlyCharges), 2) as AvgCharges,
    ROUND(AVG(SatisfactionScore), 2) as AvgSatisfaction
FROM customers
GROUP BY TechSupport
ORDER BY ChurnRate DESC;



-- Query 5: Churn by Satisfaction Score
SELECT 
    SatisfactionScore,
    COUNT(*) as CustomerCount,
    SUM(Churn) as ChurnedCount,
    ROUND(100.0 * SUM(Churn) / COUNT(*), 2) as ChurnRate,
    ROUND(AVG(TenureMonths), 2) as AvgTenure,
    ROUND(AVG(MonthlyCharges), 2) as AvgCharges
FROM customers
GROUP BY SatisfactionScore
ORDER BY SatisfactionScore;
