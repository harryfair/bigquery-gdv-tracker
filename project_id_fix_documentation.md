# project_id Data Type Fix Documentation
**Date**: July 18, 2025  
**Engineer**: Senior Data Engineer  
**Critical Production Data Fix**

## Pre-Fix State Documentation

### Affected Tables and Current State

1. **campaign_meta** (STRING → INTEGER)
   - Total Records: 1,563
   - Non-null project_ids: 1,483
   - NULL project_ids: 80
   - Empty strings (''): 6
   - Data Type: STRING

2. **campaign_meta_staging** (STRING → INTEGER)
   - Total Records: 564
   - Non-null project_ids: 564
   - NULL project_ids: 0
   - Empty strings (''): 30
   - Data Type: STRING

3. **adname-detail** (STRING → INTEGER)
   - Total Records: 133,432
   - Non-null project_ids: 125,729
   - NULL project_ids: 7,703
   - Text 'Project' values: 62
   - Data Type: STRING

### Backups Created
✅ `campaign_meta_BACKUP_BEFORE_PROJECTID_FIX_20250718`
✅ `campaign_meta_staging_BACKUP_BEFORE_PROJECTID_FIX_20250718`
✅ `adname_detail_BACKUP_BEFORE_PROJECTID_FIX_20250718`

## Rollback Commands (EMERGENCY USE)

If anything goes wrong, execute these commands immediately:

```bash
# Rollback campaign_meta
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
~/google-cloud-sdk/bin/bq cp --force \
  gdv.campaign_meta_BACKUP_BEFORE_PROJECTID_FIX_20250718 \
  gdv.campaign_meta

# Rollback campaign_meta_staging  
~/google-cloud-sdk/bin/bq cp --force \
  gdv.campaign_meta_staging_BACKUP_BEFORE_PROJECTID_FIX_20250718 \
  gdv.campaign_meta_staging

# Rollback adname-detail
~/google-cloud-sdk/bin/bq cp --force \
  gdv.adname_detail_BACKUP_BEFORE_PROJECTID_FIX_20250718 \
  gdv.adname-detail
```

## Sample Data Being Changed

### campaign_meta - Empty Strings (6 records)
These project_id values will change from '' to NULL

### campaign_meta_staging - Empty Strings (30 records)
These project_id values will change from '' to NULL

### adname-detail - 'Project' Text (62 records)
These project_id values will change from 'Project' to NULL

## Conversion Logic
```sql
-- Safe conversion that handles edge cases
SAFE_CAST(
  CASE 
    WHEN project_id = 'Project' THEN NULL
    WHEN project_id = '' THEN NULL
    ELSE project_id
  END AS INT64
) AS project_id
```

## Success Criteria
1. All tables have project_id as INTEGER data type
2. Row counts remain the same
3. NULL counts increase only by expected amounts:
   - campaign_meta: +6 NULLs (from empty strings)
   - campaign_meta_staging: +30 NULLs (from empty strings)
   - adname-detail: +62 NULLs (from 'Project' text)
4. Joins between tables continue to work

## Fix Progress Log
- [x] Backups created
- [x] Test conversion on subset
- [x] Fix campaign_meta_staging
- [x] Fix campaign_meta
- [x] Fix adname-detail
- [x] Validate all changes
- [x] Update documentation
- [ ] Remove backups (after 30 days)

## Post-Fix Validation Results

### Data Type Verification
✅ All project_id columns successfully converted to INT64:
- campaign_meta: STRING → INT64
- campaign_meta_staging: STRING → INT64  
- adname-detail: STRING → INT64
- ads_performance_yesterday: Already INT64
- gdv-daily: Already INT64

### Record Count Verification
✅ All records preserved:
- campaign_meta: 1,563 records (unchanged)
- campaign_meta_staging: 564 records (unchanged)
- adname-detail: 133,432 records (unchanged)

### NULL Value Changes (As Expected)
✅ campaign_meta: 86 NULLs (80 original + 6 empty strings)
✅ campaign_meta_staging: 30 NULLs (0 original + 30 empty strings)
✅ adname-detail: 7,765 NULLs (7,703 original + 62 'Project' text)

### Join Test Results
✅ Successfully joined gdv-daily with campaign_meta
- 11,719 matching records in last 30 days
- 1,004 unique campaigns matched

## Fix Completed Successfully
**Date**: July 18, 2025
**Time**: 08:35 AM
**Status**: SUCCESS - All tables converted without data loss