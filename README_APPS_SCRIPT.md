# BigQuery to Google Sheets Exporter (Apps Script)

## Overview
This Google Apps Script project connects to BigQuery and exports campaign data for "Yayasan Amartha Indotama Bakti Pertiwi" to Google Sheets.

## Setup Instructions

### 1. Open the Google Sheet
Open the sheet created by clasp:
https://drive.google.com/open?id=1H5-pa_HJcGxhosLWiT-ZPanlomiNhp7VrxYHtEtWkrY

### 2. Access the Script Editor
- In the Google Sheet, go to **Extensions > Apps Script**
- Or directly access: https://script.google.com/d/15Xkim1BYlTVQ68MEmhVXk_Wcv3ZKXkcz5BfQhDYY1gTaz-2hSN2wVTAf/edit

### 3. Enable BigQuery API
In the Apps Script editor:
1. Click on **Services** (+ icon on the left sidebar)
2. Search for "BigQuery API"
3. Click on it and click **Add**
4. Make sure the identifier is "BigQuery" and version is "v2"

### 4. First Run Authorization
1. In the Apps Script editor, select `testBigQueryConnection` function
2. Click **Run**
3. You'll be prompted to authorize the script
4. Review and accept the permissions:
   - View data in BigQuery
   - View and manage spreadsheets
   - Display UI elements

### 5. Using the Tool

Once authorized, return to your Google Sheet:

1. You'll see a new menu item: **BigQuery Export**
2. Click **BigQuery Export > Export Data** to fetch data
3. The script will:
   - Connect to BigQuery project `numeric-button-449507-v7`
   - Query data for "Yayasan Amartha Indotama Bakti Pertiwi"
   - Create/update a sheet named "GDV Export - Yayasan Amartha"
   - Calculate ROAS (gdv_ads/cost)
   - Format the data with proper styling

### 6. Additional Features

- **Create Summary**: Generates aggregate statistics
- **Test Connection**: Verifies BigQuery connectivity
- **About**: Shows configuration details

## Data Fields Exported

| Field | Description | Source |
|-------|-------------|--------|
| Short URL | Campaign identifier | campaign_meta.short_url |
| Content | Content creator | campaign_meta.content |
| DM | Digital Marketing member | campaign_meta.dm |
| Isu | Issue owner | campaign_meta.isu |
| Visual | Visual designer | campaign_meta.visual |
| Start Date | First date campaign had cost | MIN(date WHERE cost > 0) |
| End Date | Last date campaign had cost | MAX(date WHERE cost > 0) |
| Status | Active/Paused based on cost | Active if cost within 1 day, else Paused |
| GDV Ads | Total GDV from ads | SUM(gdv-daily.gdv_ads) |
| Cost | Total ad spend | SUM(gdv-daily.cost) |
| ROAS | Return on Ad Spend | gdv_ads / cost |

## Status Logic

- **Active**: Campaign has cost data for today or yesterday
- **Paused**: Campaign has cost data but not within the last day
- **No Cost Data**: Campaign exists but has never had any costs

## Troubleshooting

### "Failed to connect to BigQuery"
1. Ensure you have access to the BigQuery project
2. Check that the BigQuery API is enabled in your Google Cloud Console
3. Verify your Google account has BigQuery Data Viewer permissions

### "No data found"
1. Check if the client name exists in the database
2. The search looks for the client name in both `project_name` and `ngo` fields

### Authorization Issues
1. Re-run the authorization by selecting a function and clicking Run
2. Make sure to accept all requested permissions
3. Check that your Google account has access to the BigQuery project

## Local Development

To make changes locally and push to Apps Script:

```bash
# Make your changes to the .gs files
# Then push to Apps Script
clasp push

# Open in browser
clasp open
```

## Files Structure

- `Config.gs` - Configuration settings
- `Code.gs` - Main BigQuery connection logic
- `SheetManager.gs` - Sheet creation and formatting
- `Menu.gs` - UI menu and dialogs
- `appsscript.json` - Project manifest

## Security Notes

- The script only has read-only access to BigQuery
- No credentials are stored in the code
- Uses Google's OAuth for authentication
- Data stays within your Google account