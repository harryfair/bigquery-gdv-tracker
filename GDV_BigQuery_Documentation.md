# GDV BigQuery Database Documentation

## Overview
This document provides comprehensive documentation for the GDV (Gross Donation Value) BigQuery database used for tracking digital advertising campaigns and their performance metrics.

**Project ID**: `numeric-button-449507-v7`  
**Dataset**: `gdv`  
**Owner**: vser17os@gmail.com

## Database Architecture

### Entity Relationship Diagram

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│ campaign_meta_staging│────►│    campaign_meta     │◄────│   gdv-target    │
└─────────────────────┘     └──────────────────────┘     └─────────────────┘
                                      │                             │
                                      ▼                             │
                            ┌──────────────────────┐               │
                            │   adname-detail      │               │
                            └──────────────────────┘               │
                                      │                             │
                                      ▼                             ▼
                            ┌──────────────────────┐     ┌─────────────────┐
                            │ads_performance_yesterday│──►│   gdv-daily     │
                            └──────────────────────┘     └─────────────────┘
                                                                   │
                                                                   ▼
                                                         ┌─────────────────┐
                                                         │gdv_daily_backup │
                                                         └─────────────────┘
```

## Table Specifications

### 1. campaign_meta_staging
**Purpose**: Staging area for new campaigns before they go live  
**Row Count**: 564  
**Update Frequency**: As needed  
**Last Schema Update**: July 18, 2025 (project_id converted to INTEGER)

| Column | Type | Description |
|--------|------|-------------|
| short_url | STRING | Primary campaign identifier |
| project_id | INTEGER | Secondary identifier (fixed from STRING)
| project_name | STRING | Human-readable campaign name |
| ngo | STRING | Partner NGO organization |
| issue | STRING | Campaign issue/topic |
| SQUAD | STRING | Team assignment (AREA 1, AREA 2, etc.) |
| dm | STRING | Digital Marketing team member |
| content | STRING | Content creator |
| visual | STRING | Visual designer |
| isu | STRING | Issue owner |
| priority | STRING | Campaign priority level |
| grade | STRING | Campaign grade/rating |
| status | STRING | Workflow status |
| tag | STRING | Campaign tags |
| create_date | DATETIME | Campaign creation timestamp |
| optimized_date | DATETIME | Optimization timestamp |

**Status Workflow**:
1. CONTENT CREATION
2. ADMIN VERIFIED
3. READY TO ADS
4. OPTIMIZED

### 2. campaign_meta
**Purpose**: Production campaign metadata and lifecycle management  
**Row Count**: 1,563  
**Update Frequency**: Daily  

| Column | Type | Description |
|--------|------|-------------|
| short_url | STRING | Primary campaign identifier |
| project_id | INTEGER | Secondary identifier |
| project_name | STRING | Human-readable campaign name |
| ngo | STRING | Partner NGO organization |
| issue | STRING | Campaign issue/topic |
| SQUAD | STRING | Team assignment |
| dm | STRING | Digital Marketing team member |
| content | STRING | Content creator |
| visual | STRING | Visual designer |
| isu | STRING | Issue owner |
| priority | STRING | Campaign priority level |
| grade | STRING | Campaign grade/rating |
| status | STRING | Campaign status (OPTIMIZED, END, etc.) |
| tag | STRING | Campaign tags |
| create_date | DATETIME | Campaign creation timestamp |
| optimized_date | DATETIME | Optimization timestamp |

### 3. adname-detail
**Purpose**: Detailed information about individual ads  
**Row Count**: 133,416  
**Update Frequency**: Daily  

| Column | Type | Description |
|--------|------|-------------|
| short_url | STRING | Campaign identifier |
| date | DATE | Ad creation/update date |
| project_id | INTEGER | Campaign project ID |
| project_name | STRING | Campaign name |
| dm | STRING | Digital Marketing team member |
| content | STRING | Content creator |
| visual | STRING | Visual designer |
| isu | STRING | Issue owner |
| adset | STRING | Facebook ad set name |
| adname | STRING | Facebook ad name |
| adname_extract | STRING | Extracted ad name components |
| headline | STRING | Ad headline text |
| caption | STRING | Ad caption/body text |
| link_description | STRING | Link preview description |
| cta | STRING | Call-to-action text |
| fb_permalink | STRING | Facebook ad permalink |

### 4. ads_performance_yesterday
**Purpose**: Daily snapshot of ad performance metrics  
**Row Count**: 402,811  
**Update Frequency**: Daily at 07:30 AM  
**Partitioning**: By date field  

| Column | Type | Description |
|--------|------|-------------|
| short_url | STRING | Campaign identifier |
| date | DATE | Performance date |
| project_id | STRING | Campaign project ID |
| project_name | STRING | Campaign name |
| dm | STRING | Digital Marketing team member |
| content | STRING | Content creator |
| visual | STRING | Visual designer |
| isu | STRING | Issue owner |
| adset | STRING | Facebook ad set name |
| adname | STRING | Facebook ad name |
| cost | INTEGER | Ad spend in local currency |
| impressions | INTEGER | Number of ad views |
| link_clicks | INTEGER | Number of clicks |
| website_purchases | INTEGER | Number of conversions |
| gdv | INTEGER | Total Gross Donation Value |
| gdv_ads | INTEGER | GDV attributed to ads |
| trx | INTEGER | Total transactions |
| trx_ads | INTEGER | Transactions from ads |

### 5. gdv-daily
**Purpose**: Core table for daily campaign performance and ROI analysis  
**Row Count**: 1,282,023  
**Update Frequency**: Daily at 07:37 AM  
**Partitioning**: By date field  
**Clustering**: dm, content, isu, short_url  

| Column | Type | Description |
|--------|------|-------------|
| short_url | STRING | Campaign identifier |
| date | DATE | Performance date |
| project_name | STRING | Campaign name |
| ngo | STRING | Partner NGO organization |
| SQUAD | STRING | Team assignment |
| dm | STRING | Digital Marketing team member |
| content | STRING | Content creator |
| visual | STRING | Visual designer |
| isu | STRING | Issue owner |
| cost | INTEGER | Daily ad spend |
| impressions | INTEGER | Daily impressions |
| link_clicks | INTEGER | Daily clicks |
| website_purchases | INTEGER | Daily conversions |
| trx | INTEGER | Total daily transactions |
| trx_ads | INTEGER | Daily transactions from ads |
| gdv | INTEGER | Total daily GDV |
| gdv_ads | INTEGER | Daily GDV from ads |
| ads_donasi | FLOAT | ROI metric (cost/gdv_ads) |
| % gdv ads | FLOAT | Percentage of GDV from ads |

### 6. gdv-target
**Purpose**: Monthly performance targets by team  
**Row Count**: 1,212  
**Update Frequency**: Monthly  

| Column | Type | Description |
|--------|------|-------------|
| PIC | STRING | Person in charge |
| team | STRING | Team name |
| SQUAD | STRING | Squad assignment |
| bulan | STRING | Month |
| tahun | INTEGER | Year |
| budget | INTEGER | Monthly budget target |
| gdv_ads | INTEGER | Monthly GDV target |
| ads_donasi | FLOAT | Target ROI |

### 7. campaign-cost (DEPRECATED)
**Purpose**: Historical campaign cost tracking  
**Row Count**: 57,544  
**Last Updated**: May 2024  
**Status**: No longer actively maintained  

### 8. gdv_daily_backup
**Purpose**: Backup of gdv-daily table  
**Row Count**: 1,278,870  
**Update Frequency**: Daily  
**Schema**: Identical to gdv-daily  

## Key Metrics and Calculations

### ROI Metrics
- **ads_donasi**: Cost efficiency metric calculated as `cost / gdv_ads`
  - Lower values indicate better ROI
  - Target values defined in gdv-target table

- **% gdv ads**: Attribution metric calculated as `(gdv_ads / gdv) * 100`
  - Shows percentage of total donations attributed to ads
  - Higher values indicate stronger ad performance

### Performance Indicators
- **CTR (Click-Through Rate)**: `link_clicks / impressions`
- **Conversion Rate**: `website_purchases / link_clicks`
- **Average Donation Value**: `gdv_ads / trx_ads`
- **Cost Per Click**: `cost / link_clicks`
- **Cost Per Conversion**: `cost / website_purchases`

## Data Quality Issues

### Critical Issues
1. **Data Type Inconsistency**: 
   - `project_id` is STRING in some tables, INTEGER in others
   - Causes join failures and data mismatches

2. **Missing Relationships**:
   - Many campaigns in gdv-daily lack corresponding campaign_meta records
   - Orphaned ad performance data without campaign context

3. **NULL Values**:
   - Significant NULL values in team assignment columns
   - Missing creative details in adname-detail

### Data Freshness
- ads_performance_yesterday: Updated daily at 07:30 AM
- gdv-daily: Updated daily at 07:37 AM
- campaign-cost: STALE (last updated May 2024)

## Recommended Improvements

### Immediate Actions (Week 1)
1. **Fix Data Type Inconsistencies**
   ```sql
   -- Standardize project_id to STRING across all tables
   ALTER TABLE campaign_meta 
   ALTER COLUMN project_id SET DATA TYPE STRING;
   ```

2. **Clean NULL Values**
   ```sql
   -- Update NULL team assignments with 'UNASSIGNED'
   UPDATE gdv.adname-detail
   SET dm = COALESCE(dm, 'UNASSIGNED'),
       content = COALESCE(content, 'UNASSIGNED'),
       visual = COALESCE(visual, 'UNASSIGNED'),
       isu = COALESCE(isu, 'UNASSIGNED')
   WHERE dm IS NULL OR content IS NULL OR visual IS NULL OR isu IS NULL;
   ```

3. **Add Missing Campaign Metadata**
   ```sql
   -- Identify campaigns in gdv-daily without metadata
   SELECT DISTINCT short_url
   FROM gdv.gdv-daily
   WHERE short_url NOT IN (SELECT short_url FROM gdv.campaign_meta);
   ```

### Short-term Improvements (Month 1)
1. **Implement Data Quality Monitoring**
   - Create scheduled queries to check for NULL values
   - Set up alerts for data freshness issues
   - Monitor referential integrity

2. **Optimize Table Performance**
   ```sql
   -- Add partitioning to frequently queried tables
   ALTER TABLE gdv.adname-detail
   ADD PARTITION BY date;
   
   -- Add clustering to improve join performance
   ALTER TABLE gdv.campaign_meta
   CLUSTER BY short_url;
   ```

3. **Create Documentation Views**
   ```sql
   -- Create a unified campaign view
   CREATE OR REPLACE VIEW gdv.v_campaign_summary AS
   SELECT 
     cm.short_url,
     cm.project_id,
     cm.project_name,
     cm.status,
     cm.SQUAD,
     COUNT(DISTINCT ad.adname) as total_ads,
     SUM(gd.cost) as total_cost,
     SUM(gd.gdv_ads) as total_gdv_ads,
     AVG(gd.ads_donasi) as avg_roi
   FROM gdv.campaign_meta cm
   LEFT JOIN gdv.adname-detail ad ON cm.short_url = ad.short_url
   LEFT JOIN gdv.gdv-daily gd ON cm.short_url = gd.short_url
   GROUP BY 1,2,3,4,5;
   ```

### Long-term Enhancements (Quarter 1)
1. **Schema Normalization**
   - Create separate team_assignments table
   - Implement proper foreign key relationships
   - Add data validation constraints

2. **Performance Optimization**
   - Implement materialized views for common queries
   - Create aggregate tables for reporting
   - Archive historical data older than 2 years

3. **Operational Excellence**
   - Implement CI/CD for schema changes
   - Add comprehensive logging and monitoring
   - Create data lineage documentation
   - Build automated data quality reports

## Monitoring Queries

### Daily Health Check
```sql
-- Check data freshness
SELECT 
  table_name,
  MAX(date) as latest_date,
  DATE_DIFF(CURRENT_DATE(), MAX(date), DAY) as days_behind
FROM (
  SELECT 'ads_performance_yesterday' as table_name, MAX(date) as date 
  FROM gdv.ads_performance_yesterday
  UNION ALL
  SELECT 'gdv-daily', MAX(date) FROM gdv.gdv-daily
)
GROUP BY table_name;
```

### Data Quality Check
```sql
-- Check for NULL values in critical fields
SELECT 
  'adname-detail' as table_name,
  COUNT(*) as total_rows,
  SUM(CASE WHEN dm IS NULL THEN 1 ELSE 0 END) as null_dm,
  SUM(CASE WHEN content IS NULL THEN 1 ELSE 0 END) as null_content,
  SUM(CASE WHEN short_url IS NULL THEN 1 ELSE 0 END) as null_short_url
FROM gdv.adname-detail
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY);
```

### Performance Dashboard Query
```sql
-- Weekly performance summary by SQUAD
SELECT 
  SQUAD,
  DATE_TRUNC(date, WEEK) as week,
  SUM(cost) as total_cost,
  SUM(gdv_ads) as total_gdv_ads,
  SAFE_DIVIDE(SUM(cost), SUM(gdv_ads)) as roi,
  COUNT(DISTINCT short_url) as active_campaigns
FROM gdv.gdv-daily
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY 1,2
ORDER BY 1,2 DESC;
```

## Contact and Support

**Database Owner**: vser17os@gmail.com  
**Project**: numeric-button-449507-v7  
**Dataset**: gdv  

Last Updated: July 18, 2025