# Project Context for Claude

## Project Overview
This is a BigQuery database for tracking digital advertising campaigns and their performance metrics (GDV - Gross Donation Value).

## Key Information
- **Google Cloud Account**: vser17os@gmail.com
- **Project ID**: `numeric-button-449507-v7` (gdv-harry)
- **Dataset**: `gdv`
- **Primary Key**: `short_url` (campaign identifier)
- **Update Schedule**: Daily at 07:30 AM (ads_performance_yesterday) and 07:37 AM (gdv-daily)

## Environment Setup
- **Google Cloud SDK Path**: `~/google-cloud-sdk/bin/`
- **Authentication**: Use `~/google-cloud-sdk/bin/gcloud auth login --no-launch-browser`
- **Python**: System Python 3.12.3 (no pip installed due to system restrictions)

## Database Structure
### Active Tables (7 total after cleanup):
1. **gdv-daily** - Core performance table (1.28M rows, partitioned by date, clustered)
2. **campaign_meta** - Campaign metadata (1,563 rows)
3. **campaign_meta_staging** - Staging for new campaigns (564 rows)
4. **adname-detail** - Ad creative details (133K rows)
5. **ads_performance_yesterday** - Daily performance snapshot (402K rows, partitioned)
6. **gdv-target** - Monthly team targets (1,212 rows)
7. **gdv_daily_backup** - Backup of gdv-daily

### Deleted Tables:
- **campaign-cost** - Deleted on July 18, 2025 (was 77 days outdated)

## Known Issues
1. **Data Type Inconsistency**: `project_id` is INTEGER in some tables, STRING in others
2. **Missing Relationships**: Many campaigns in gdv-daily lack campaign_meta records
3. **NULL Values**: Significant NULLs in team assignment columns (dm, content, visual, isu)

## Common Commands
```bash
# Set PATH for BigQuery CLI
export PATH="$HOME/google-cloud-sdk/bin:$PATH"

# List all tables
~/google-cloud-sdk/bin/bq ls gdv

# Check data freshness
~/google-cloud-sdk/bin/bq query --use_legacy_sql=false 'SELECT MAX(date) as latest_date FROM `numeric-button-449507-v7.gdv.gdv-daily`'

# Show table schema
~/google-cloud-sdk/bin/bq show --schema --format=prettyjson numeric-button-449507-v7:gdv.TABLE_NAME

# Get table info
~/google-cloud-sdk/bin/bq show --format=prettyjson numeric-button-449507-v7:gdv.TABLE_NAME

# Create table backup
~/google-cloud-sdk/bin/bq cp gdv.TABLE_NAME gdv.TABLE_NAME_backup_$(date +%Y%m%d)

# Drop table (use with caution)
~/google-cloud-sdk/bin/bq rm -f -t gdv.TABLE_NAME
```

## Business Rules
1. **Always backup tables before deletion or major changes**
2. **Never modify production data without explicit approval**
3. **Run data quality checks after any schema changes**
4. **Document all database modifications in BigQuery_Activity_Log.md**
5. **Preserve gdv-target table (reference data, infrequent updates are normal)**
6. **IMPORTANT: Update BigQuery_Activity_Log.md for EVERY session - record all activities, commands, and changes made**
7. **CRITICAL: Update ALL related documentation after each session:**
   - BigQuery_Activity_Log.md - Record session activities
   - GDV_BigQuery_Documentation.md - Update if schema/structure changes
   - BigQuery_Improvement_Plan.md - Update progress on improvements
   - CLAUDE.md - Update with new learnings or changes

## Key Metrics
- **ads_donasi**: ROI metric (cost/gdv_ads) - lower is better
- **% gdv ads**: Attribution percentage (gdv_ads/gdv * 100)
- **Target ROI**: Typically 0.10-0.20 range

## Team Structure (SQUAD values)
- AREA 1
- AREA 2  
- HOSPITAL
- INBOUND
- UNASSIGNED (for NULL values)

## Documentation Files
1. **GDV_BigQuery_Documentation.md** - Complete database documentation
2. **BigQuery_Improvement_Plan.md** - Action plan with SQL fixes
3. **BigQuery_Activity_Log.md** - Session activity record

## Next Priorities
1. Fix project_id data type inconsistency across tables
2. Add missing campaign metadata records
3. Implement data quality monitoring procedures
4. Create materialized views for common queries

## Session Documentation Checklist
At the end of EVERY session, ensure these are updated:
- [ ] BigQuery_Activity_Log.md - Add new session entry with all activities
- [ ] GDV_BigQuery_Documentation.md - Update if any schema changes
- [ ] BigQuery_Improvement_Plan.md - Mark completed tasks, add new findings
- [ ] CLAUDE.md - Update with new commands, issues, or learnings

## Session History
- **July 18, 2025**: Initial setup, database analysis, documentation created, campaign-cost table deleted

---
*Last Updated: July 18, 2025*