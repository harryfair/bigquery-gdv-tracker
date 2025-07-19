# BigQuery GDV Campaign Performance Tracker

A BigQuery-based data warehouse for tracking digital advertising campaigns and their performance metrics, specifically focused on Gross Donation Value (GDV) tracking.

## Overview

This project provides a comprehensive data infrastructure for monitoring and analyzing digital marketing campaign performance across multiple teams and channels.

## Project Details

- **Google Cloud Project**: `numeric-button-449507-v7` (gdv-harry)
- **Dataset**: `gdv`
- **Primary Identifier**: `short_url` (campaign identifier)
- **Update Schedule**: 
  - Daily at 07:30 AM (ads_performance_yesterday)
  - Daily at 07:37 AM (gdv-daily)

## Database Structure

### Core Tables

1. **gdv-daily** - Core performance metrics table (1.28M+ rows)
   - Partitioned by date
   - Clustered for optimal query performance
   
2. **campaign_meta** - Campaign metadata (1,563 rows)
   - Campaign details and team assignments
   
3. **ads_performance_yesterday** - Daily performance snapshot (402K+ rows)
   - Partitioned for efficient querying
   
4. **gdv-target** - Monthly team targets (1,212 rows)
   - Reference data for performance benchmarking

5. **adname-detail** - Ad creative details (133K+ rows)
   - Creative-level performance data

## Key Metrics

- **ads_donasi**: ROI metric (cost/gdv_ads) - lower is better
- **% gdv ads**: Attribution percentage (gdv_ads/gdv * 100)
- **Target ROI**: Typically 0.10-0.20 range

## Team Structure

Campaign teams are categorized into SQUAD values:
- AREA 1
- AREA 2
- HOSPITAL
- INBOUND
- UNASSIGNED (for unassigned campaigns)

## Documentation

- `CLAUDE.md` - Project context and instructions
- `GDV_BigQuery_Documentation.md` - Complete database documentation
- `BigQuery_Improvement_Plan.md` - Database optimization roadmap
- `BigQuery_Activity_Log.md` - Change history and activity log

## Setup

1. Install Google Cloud SDK
2. Authenticate: `gcloud auth login --no-launch-browser`
3. Set project: `gcloud config set project numeric-button-449507-v7`

## Usage

Common BigQuery commands:

```bash
# List all tables
bq ls gdv

# Check latest data
bq query --use_legacy_sql=false 'SELECT MAX(date) FROM \`numeric-button-449507-v7.gdv.gdv-daily\`'

# Show table schema
bq show --schema --format=prettyjson numeric-button-449507-v7:gdv.TABLE_NAME
```

## License

This project is proprietary and confidential.

## Contact

For questions or access requests, contact the data team.