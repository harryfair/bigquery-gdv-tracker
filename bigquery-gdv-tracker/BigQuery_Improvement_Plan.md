# BigQuery Database Improvement Plan

## Executive Summary
Your GDV BigQuery database effectively tracks digital advertising campaigns but has several opportunities for improvement. This plan provides specific, actionable recommendations organized by priority and timeline.

## Critical Issues to Fix

### 1. Data Type Inconsistency (HIGH PRIORITY) ✅ FIXED
**Problem**: `project_id` is INTEGER in some tables and STRING in others, causing join failures.
**Status**: FIXED on July 18, 2025
- All tables now use INTEGER for project_id
- Empty strings and 'Project' text converted to NULL
- All joins working correctly

**Solution**:
```sql
-- Step 1: Create backup tables
CREATE TABLE gdv.campaign_meta_backup AS SELECT * FROM gdv.campaign_meta;
CREATE TABLE gdv.adname_detail_backup AS SELECT * FROM gdv.adname-detail;

-- Step 2: Create new tables with consistent schema
CREATE TABLE gdv.campaign_meta_new AS
SELECT 
  short_url,
  CAST(project_id AS STRING) AS project_id,
  project_name,
  ngo,
  issue,
  SQUAD,
  dm,
  content,
  visual,
  isu,
  priority,
  grade,
  status,
  tag,
  create_date,
  optimized_date
FROM gdv.campaign_meta;

-- Step 3: Rename tables
DROP TABLE gdv.campaign_meta;
ALTER TABLE gdv.campaign_meta_new RENAME TO campaign_meta;
```

### 2. Missing Campaign Metadata (HIGH PRIORITY)
**Problem**: Many campaigns in gdv-daily don't have corresponding campaign_meta records.

**Detection Query**:
```sql
-- Find orphaned campaigns
WITH orphaned_campaigns AS (
  SELECT DISTINCT 
    gd.short_url,
    gd.project_name,
    MIN(gd.date) as first_seen,
    MAX(gd.date) as last_seen,
    COUNT(DISTINCT gd.date) as days_active,
    SUM(gd.cost) as total_cost,
    SUM(gd.gdv_ads) as total_gdv
  FROM `numeric-button-449507-v7.gdv.gdv-daily` gd
  LEFT JOIN `numeric-button-449507-v7.gdv.campaign_meta` cm
    ON gd.short_url = cm.short_url
  WHERE cm.short_url IS NULL
    AND gd.date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
  GROUP BY 1,2
  HAVING total_cost > 0
)
SELECT * FROM orphaned_campaigns
ORDER BY total_cost DESC;
```

**Fix**:
```sql
-- Insert missing campaigns into campaign_meta
INSERT INTO `numeric-button-449507-v7.gdv.campaign_meta` 
(short_url, project_name, SQUAD, dm, content, visual, isu, status, create_date)
SELECT DISTINCT
  gd.short_url,
  gd.project_name,
  gd.SQUAD,
  COALESCE(gd.dm, 'UNASSIGNED'),
  COALESCE(gd.content, 'UNASSIGNED'),
  COALESCE(gd.visual, 'UNASSIGNED'),
  COALESCE(gd.isu, 'UNASSIGNED'),
  'RETROACTIVE',
  MIN(gd.date) as create_date
FROM `numeric-button-449507-v7.gdv.gdv-daily` gd
LEFT JOIN `numeric-button-449507-v7.gdv.campaign_meta` cm
  ON gd.short_url = cm.short_url
WHERE cm.short_url IS NULL
  AND gd.cost > 0
GROUP BY 1,2,3,4,5,6,7,8;
```

### 3. NULL Values in Critical Fields (MEDIUM PRIORITY)
**Problem**: Many records have NULL values in team assignment fields.

**Analysis Query**:
```sql
-- Analyze NULL patterns
SELECT 
  COUNT(*) as total_records,
  SUM(CASE WHEN dm IS NULL THEN 1 ELSE 0 END) as null_dm,
  SUM(CASE WHEN content IS NULL THEN 1 ELSE 0 END) as null_content,
  SUM(CASE WHEN visual IS NULL THEN 1 ELSE 0 END) as null_visual,
  SUM(CASE WHEN isu IS NULL THEN 1 ELSE 0 END) as null_isu,
  SUM(CASE WHEN SQUAD IS NULL THEN 1 ELSE 0 END) as null_squad
FROM `numeric-button-449507-v7.gdv.gdv-daily`
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY);
```

**Fix**:
```sql
-- Create a data quality view
CREATE OR REPLACE VIEW `numeric-button-449507-v7.gdv.v_gdv_daily_clean` AS
SELECT 
  short_url,
  date,
  project_name,
  COALESCE(ngo, 'UNSPECIFIED') as ngo,
  COALESCE(SQUAD, 'UNASSIGNED') as SQUAD,
  COALESCE(dm, 'UNASSIGNED') as dm,
  COALESCE(content, 'UNASSIGNED') as content,
  COALESCE(visual, 'UNASSIGNED') as visual,
  COALESCE(isu, 'UNASSIGNED') as isu,
  cost,
  impressions,
  link_clicks,
  website_purchases,
  trx,
  trx_ads,
  gdv,
  gdv_ads,
  ads_donasi,
  `% gdv ads`
FROM `numeric-button-449507-v7.gdv.gdv-daily`;
```

## Performance Optimizations

### 1. Add Partitioning to More Tables
```sql
-- Partition adname-detail by date
CREATE TABLE `numeric-button-449507-v7.gdv.adname_detail_partitioned`
PARTITION BY date
CLUSTER BY short_url, project_id AS
SELECT * FROM `numeric-button-449507-v7.gdv.adname-detail`;

-- Replace original table
DROP TABLE `numeric-button-449507-v7.gdv.adname-detail`;
ALTER TABLE `numeric-button-449507-v7.gdv.adname_detail_partitioned` 
RENAME TO `adname-detail`;
```

### 2. Create Materialized Views for Common Queries
```sql
-- Daily performance summary
CREATE MATERIALIZED VIEW `numeric-button-449507-v7.gdv.mv_daily_performance`
PARTITION BY date
CLUSTER BY SQUAD AS
SELECT 
  date,
  SQUAD,
  COUNT(DISTINCT short_url) as active_campaigns,
  SUM(cost) as total_cost,
  SUM(impressions) as total_impressions,
  SUM(link_clicks) as total_clicks,
  SUM(website_purchases) as total_conversions,
  SUM(gdv_ads) as total_gdv_ads,
  SAFE_DIVIDE(SUM(link_clicks), SUM(impressions)) as avg_ctr,
  SAFE_DIVIDE(SUM(website_purchases), SUM(link_clicks)) as avg_cvr,
  SAFE_DIVIDE(SUM(cost), SUM(gdv_ads)) as avg_roi
FROM `numeric-button-449507-v7.gdv.gdv-daily`
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 180 DAY)
GROUP BY 1,2;

-- Campaign performance summary
CREATE MATERIALIZED VIEW `numeric-button-449507-v7.gdv.mv_campaign_performance`
CLUSTER BY short_url AS
SELECT 
  cm.short_url,
  cm.project_name,
  cm.SQUAD,
  cm.status,
  cm.priority,
  cm.create_date,
  MIN(gd.date) as first_active_date,
  MAX(gd.date) as last_active_date,
  COUNT(DISTINCT gd.date) as days_active,
  SUM(gd.cost) as lifetime_cost,
  SUM(gd.gdv_ads) as lifetime_gdv,
  AVG(gd.ads_donasi) as avg_roi,
  SUM(gd.impressions) as lifetime_impressions,
  SUM(gd.link_clicks) as lifetime_clicks
FROM `numeric-button-449507-v7.gdv.campaign_meta` cm
LEFT JOIN `numeric-button-449507-v7.gdv.gdv-daily` gd
  ON cm.short_url = gd.short_url
GROUP BY 1,2,3,4,5,6;
```

## Data Quality Monitoring

### 1. Create Monitoring Tables
```sql
-- Data quality metrics table
CREATE TABLE `numeric-button-449507-v7.gdv.data_quality_metrics` (
  check_date DATE,
  table_name STRING,
  metric_name STRING,
  metric_value FLOAT64,
  threshold_value FLOAT64,
  is_alert BOOLEAN,
  details STRING
)
PARTITION BY check_date;

-- Create scheduled query for daily monitoring
CREATE OR REPLACE PROCEDURE `numeric-button-449507-v7.gdv.sp_daily_data_quality_check`()
BEGIN
  -- Check data freshness
  INSERT INTO `numeric-button-449507-v7.gdv.data_quality_metrics`
  SELECT 
    CURRENT_DATE() as check_date,
    'gdv-daily' as table_name,
    'data_freshness_days' as metric_name,
    DATE_DIFF(CURRENT_DATE(), MAX(date), DAY) as metric_value,
    1 as threshold_value,
    DATE_DIFF(CURRENT_DATE(), MAX(date), DAY) > 1 as is_alert,
    CONCAT('Latest date: ', CAST(MAX(date) AS STRING)) as details
  FROM `numeric-button-449507-v7.gdv.gdv-daily`;

  -- Check NULL values
  INSERT INTO `numeric-button-449507-v7.gdv.data_quality_metrics`
  SELECT 
    CURRENT_DATE() as check_date,
    'gdv-daily' as table_name,
    'null_percentage_critical_fields' as metric_name,
    ROUND(100.0 * SUM(CASE WHEN dm IS NULL OR content IS NULL OR SQUAD IS NULL THEN 1 ELSE 0 END) / COUNT(*), 2) as metric_value,
    10 as threshold_value,
    ROUND(100.0 * SUM(CASE WHEN dm IS NULL OR content IS NULL OR SQUAD IS NULL THEN 1 ELSE 0 END) / COUNT(*), 2) > 10 as is_alert,
    'Checking dm, content, SQUAD fields' as details
  FROM `numeric-button-449507-v7.gdv.gdv-daily`
  WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY);

  -- Check for duplicate records
  INSERT INTO `numeric-button-449507-v7.gdv.data_quality_metrics`
  WITH duplicates AS (
    SELECT 
      short_url, 
      date, 
      COUNT(*) as duplicate_count
    FROM `numeric-button-449507-v7.gdv.gdv-daily`
    WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    GROUP BY 1,2
    HAVING COUNT(*) > 1
  )
  SELECT 
    CURRENT_DATE() as check_date,
    'gdv-daily' as table_name,
    'duplicate_records' as metric_name,
    COUNT(*) as metric_value,
    0 as threshold_value,
    COUNT(*) > 0 as is_alert,
    CONCAT('Found ', CAST(COUNT(*) AS STRING), ' duplicate key combinations') as details
  FROM duplicates;
END;
```

### 2. Create Alert Views
```sql
-- Active alerts view
CREATE OR REPLACE VIEW `numeric-button-449507-v7.gdv.v_active_data_quality_alerts` AS
SELECT 
  check_date,
  table_name,
  metric_name,
  metric_value,
  threshold_value,
  details
FROM `numeric-button-449507-v7.gdv.data_quality_metrics`
WHERE is_alert = TRUE
  AND check_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
ORDER BY check_date DESC, table_name, metric_name;
```

## Operational Excellence

### 1. Create Documentation Tables
```sql
-- Table documentation
CREATE TABLE `numeric-button-449507-v7.gdv.table_documentation` (
  table_name STRING,
  column_name STRING,
  data_type STRING,
  is_nullable BOOLEAN,
  description STRING,
  business_rules STRING,
  example_values STRING,
  last_updated DATE
);

-- Insert documentation
INSERT INTO `numeric-button-449507-v7.gdv.table_documentation` VALUES
('campaign_meta', 'short_url', 'STRING', FALSE, 'Primary campaign identifier', 'Must be unique, format: xxx-xxx-xxx', 'abc-def-ghi', CURRENT_DATE()),
('campaign_meta', 'SQUAD', 'STRING', TRUE, 'Team assignment', 'Values: AREA 1, AREA 2, HOSPITAL, INBOUND', 'AREA 1', CURRENT_DATE()),
('gdv-daily', 'ads_donasi', 'FLOAT64', TRUE, 'ROI metric', 'Calculated as cost/gdv_ads, lower is better', '0.15', CURRENT_DATE());
```

### 2. Create Helper Functions
```sql
-- ROI calculation function
CREATE OR REPLACE FUNCTION `numeric-button-449507-v7.gdv.calculate_roi`(cost INT64, gdv_ads INT64)
RETURNS FLOAT64
AS (
  SAFE_DIVIDE(CAST(cost AS FLOAT64), CAST(gdv_ads AS FLOAT64))
);

-- Performance grade function
CREATE OR REPLACE FUNCTION `numeric-button-449507-v7.gdv.get_performance_grade`(roi FLOAT64)
RETURNS STRING
AS (
  CASE 
    WHEN roi IS NULL THEN 'NO_DATA'
    WHEN roi <= 0.10 THEN 'EXCELLENT'
    WHEN roi <= 0.15 THEN 'GOOD'
    WHEN roi <= 0.20 THEN 'AVERAGE'
    WHEN roi <= 0.30 THEN 'POOR'
    ELSE 'CRITICAL'
  END
);
```

## Implementation Timeline

### Week 1: Critical Fixes
- [ ] Fix project_id data type inconsistency
- [ ] Add missing campaign metadata
- [ ] Create backup of all tables

### Week 2-3: Data Quality
- [ ] Implement NULL value handling
- [ ] Create data quality monitoring procedures
- [ ] Set up scheduled queries for monitoring

### Week 4: Performance
- [ ] Add partitioning to remaining tables
- [ ] Create materialized views
- [ ] Optimize clustering keys

### Month 2: Documentation & Process
- [ ] Complete table documentation
- [ ] Create data dictionary
- [ ] Implement version control for schema changes
- [ ] Train team on best practices

## Success Metrics

1. **Data Quality Score**: >95% records without NULL in critical fields
2. **Query Performance**: 50% reduction in average query time
3. **Data Freshness**: <1 day lag for all active tables
4. **Documentation Coverage**: 100% of tables and columns documented

## Next Steps

1. Review this plan with your team
2. Prioritize based on business impact
3. Create JIRA tickets for each task
4. Schedule weekly review meetings
5. Monitor progress using the data quality dashboard

Remember: Always test changes in a development environment first!