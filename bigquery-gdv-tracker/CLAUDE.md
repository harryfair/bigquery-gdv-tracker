# Project Context for Claude

## 🚀 SESSION START CHECKLIST
**IMPORTANT: At the beginning of EVERY session, you MUST:**
1. Check `../TOOLS_INSTALLED.md` for tool installation status
2. Verify all required tools are installed and configured
3. If any tool shows as NOT_INSTALLED or CHECK_REQUIRED, ask the user to install it
4. Run verification commands for critical tools before proceeding

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

### 🔧 Tool Verification Commands
```bash
# At session start, run these verification commands:

# 1. Check Google Cloud SDK installation
if command -v ~/google-cloud-sdk/bin/gcloud &> /dev/null; then
    echo "✅ Google Cloud SDK is installed"
    ~/google-cloud-sdk/bin/gcloud version
else
    echo "❌ Google Cloud SDK NOT FOUND - Please install from https://cloud.google.com/sdk/docs/install"
fi

# 2. Check BigQuery CLI
if command -v ~/google-cloud-sdk/bin/bq &> /dev/null; then
    echo "✅ BigQuery CLI is installed"
    ~/google-cloud-sdk/bin/bq version
else
    echo "❌ BigQuery CLI NOT FOUND - Run: ~/google-cloud-sdk/bin/gcloud components install bq"
fi

# 3. Check authentication status
~/google-cloud-sdk/bin/gcloud auth list
if [ $? -ne 0 ]; then
    echo "⚠️  Not authenticated - Run: ~/google-cloud-sdk/bin/gcloud auth login --no-launch-browser"
fi

# 4. Check Python
if command -v python3 &> /dev/null; then
    echo "✅ Python is installed: $(python3 --version)"
else
    echo "❌ Python NOT FOUND - Required for automation scripts"
fi

# 5. Verify project is set
CURRENT_PROJECT=$(~/google-cloud-sdk/bin/gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" = "numeric-button-449507-v7" ]; then
    echo "✅ Correct project is set: $CURRENT_PROJECT"
else
    echo "⚠️  Wrong project or no project set. Run: ~/google-cloud-sdk/bin/gcloud config set project numeric-button-449507-v7"
fi
```

### 🤖 Automated Tool Setup
If any tools are missing, use these commands to prompt the user:

```bash
# Tool installation prompts
echo "🔧 TOOL INSTALLATION REQUIRED"
echo "============================"
echo ""
echo "The following tools need to be installed/configured:"
echo ""

# Check and prompt for each tool
[ ! -f ~/google-cloud-sdk/bin/gcloud ] && echo "1. Google Cloud SDK: curl https://sdk.cloud.google.com | bash"
[ ! -f ~/google-cloud-sdk/bin/bq ] && echo "2. BigQuery CLI: ~/google-cloud-sdk/bin/gcloud components install bq"
echo ""
echo "After installation, please run:"
echo "- ~/google-cloud-sdk/bin/gcloud auth login --no-launch-browser"
echo "- ~/google-cloud-sdk/bin/gcloud config set project numeric-button-449507-v7"
```

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
- **July 19, 2025**: Added automation for tool checking and installation prompts

## Important Files Reference
- **Tool Installation Status**: Check `../TOOLS_INSTALLED.md` for comprehensive tool installation details
- **This file contains**: Google Cloud SDK paths, authentication status, Python environment, and more

---
*Last Updated: July 19, 2025*