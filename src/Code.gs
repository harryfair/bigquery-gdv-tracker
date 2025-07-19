/**
 * BigQuery GDV Tracker - Main Functions
 */

/**
 * Fetches data from BigQuery for the specified client
 * @return {Array} Array of campaign data
 */
function fetchBigQueryData() {
  try {
    // Enable BigQuery service if not already enabled
    // Go to Resources > Advanced Google Services and enable BigQuery API
    
    const projectId = CONFIG.BIGQUERY.PROJECT_ID;
    const datasetId = CONFIG.BIGQUERY.DATASET_ID;
    
    // Query using cost-based date definitions and status
    const query = `
      WITH campaign_costs AS (
        SELECT 
          short_url,
          MAX(dm) as dm,
          MAX(content) as content,
          MAX(isu) as isu,
          MAX(visual) as visual,
          MAX(ngo) as ngo,
          SUM(gdv_ads) as total_gdv_ads,
          SUM(cost) as total_cost,
          MIN(CASE WHEN cost > 0 THEN date END) as first_cost_date,
          MAX(CASE WHEN cost > 0 THEN date END) as last_cost_date,
          MAX(date) as latest_data_date
        FROM \`${projectId}.${datasetId}.gdv-daily\`
        WHERE LOWER(COALESCE(ngo, '')) LIKE LOWER('%${CONFIG.CLIENT_NAME}%')
           OR LOWER(COALESCE(dm, '')) LIKE LOWER('%${CONFIG.CLIENT_NAME}%')
           OR LOWER(COALESCE(content, '')) LIKE LOWER('%${CONFIG.CLIENT_NAME}%')
           OR LOWER(COALESCE(isu, '')) LIKE LOWER('%${CONFIG.CLIENT_NAME}%')
           OR LOWER(COALESCE(visual, '')) LIKE LOWER('%${CONFIG.CLIENT_NAME}%')
        GROUP BY short_url
      )
      SELECT 
        cc.short_url,
        COALESCE(cc.content, 'N/A') as content,
        COALESCE(cc.dm, 'N/A') as dm,
        COALESCE(cc.isu, 'N/A') as isu,
        COALESCE(cc.visual, 'N/A') as visual,
        FORMAT_DATE('%Y-%m-%d', cc.first_cost_date) as start_date,
        FORMAT_DATE('%Y-%m-%d', cc.last_cost_date) as end_date,
        CASE 
          WHEN cc.last_cost_date = CURRENT_DATE() THEN 'Active'
          WHEN cc.last_cost_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY) THEN 'Active'
          WHEN cc.last_cost_date IS NOT NULL THEN 'Paused'
          ELSE 'No Cost Data'
        END as status,
        CASE 
          WHEN cc.last_cost_date IS NOT NULL THEN DATE_DIFF(CURRENT_DATE(), cc.last_cost_date, DAY)
          ELSE NULL
        END as inactive_days,
        COALESCE(cc.total_gdv_ads, 0) as gdv_ads,
        COALESCE(cc.total_cost, 0) as cost,
        CASE 
          WHEN cc.total_cost > 0 THEN ROUND(SAFE_DIVIDE(cc.total_gdv_ads, cc.total_cost), 2)
          ELSE NULL
        END as roas
      FROM campaign_costs cc
      WHERE cc.short_url IS NOT NULL
        AND cc.first_cost_date IS NOT NULL  -- Only campaigns that have had costs
      ORDER BY cc.last_cost_date DESC
    `;
    
    const request = {
      query: query,
      useLegacySql: false
    };
    
    console.log('Executing BigQuery query for client:', CONFIG.CLIENT_NAME);
    
    const queryResults = BigQuery.Jobs.query(request, projectId);
    const jobId = queryResults.jobReference.jobId;
    
    // Check if query is complete
    const queryComplete = queryResults.jobComplete;
    
    if (!queryComplete) {
      // Wait for query to complete
      const job = BigQuery.Jobs.get(projectId, jobId);
      if (job.status.state !== 'DONE') {
        throw new Error('Query is still running. Please try again.');
      }
    }
    
    const rows = queryResults.rows || [];
    const processedData = [];
    
    // Process each row
    rows.forEach(row => {
      const values = row.f;
      processedData.push([
        values[0].v || '',  // short_url
        values[1].v || '',  // content
        values[2].v || '',  // dm
        values[3].v || '',  // isu
        values[4].v || '',  // visual
        values[5].v || '',  // start_date
        values[6].v || '',  // end_date
        values[7].v || '',  // status
        parseInt(values[8].v) || null,  // inactive_days
        parseInt(values[9].v) || 0,  // gdv_ads
        parseInt(values[10].v) || 0,  // cost
        parseFloat(values[11].v) || 0  // roas
      ]);
    });
    
    console.log(`Retrieved ${processedData.length} rows from BigQuery`);
    return processedData;
    
  } catch (error) {
    console.error('Error fetching BigQuery data:', error);
    throw new Error('Failed to fetch data from BigQuery: ' + error.toString());
  }
}

/**
 * Fetches ad-level data from BigQuery
 * @return {Array} Array of ad data
 */
function fetchAdData() {
  try {
    const projectId = CONFIG.BIGQUERY.PROJECT_ID;
    const datasetId = CONFIG.BIGQUERY.DATASET_ID;
    
    // Query for ad-level data with permalinks and dates
    const query = `
      WITH client_campaigns AS (
        SELECT DISTINCT short_url
        FROM \`${projectId}.${datasetId}.gdv-daily\`
        WHERE LOWER(COALESCE(ngo, '')) LIKE LOWER('%${CONFIG.CLIENT_NAME}%')
           OR LOWER(COALESCE(dm, '')) LIKE LOWER('%${CONFIG.CLIENT_NAME}%')
           OR LOWER(COALESCE(content, '')) LIKE LOWER('%${CONFIG.CLIENT_NAME}%')
           OR LOWER(COALESCE(isu, '')) LIKE LOWER('%${CONFIG.CLIENT_NAME}%')
           OR LOWER(COALESCE(visual, '')) LIKE LOWER('%${CONFIG.CLIENT_NAME}%')
      ),
      ad_details AS (
        SELECT 
          ad.short_url,
          ad.ad_id,
          ad.ad_name,
          ad.permalink,
          ad.date as published_date,
          ad.dm,
          ad.content,
          ad.isu,
          ad.visual,
          ad.ngo
        FROM \`${projectId}.${datasetId}.adname-detail\` ad
        INNER JOIN client_campaigns cc ON ad.short_url = cc.short_url
      ),
      ad_performance AS (
        SELECT 
          short_url,
          ad_name,
          MAX(date) as last_cost_date,
          SUM(cost) as total_cost
        FROM \`${projectId}.${datasetId}.ads_performance_yesterday\`
        GROUP BY short_url, ad_name
      )
      SELECT 
        ad.short_url,
        ad.ad_id,
        ad.ad_name,
        ad.permalink,
        FORMAT_DATE('%Y-%m-%d', ad.published_date) as date,
        CASE 
          WHEN ap.last_cost_date = CURRENT_DATE() THEN 'Active'
          WHEN ap.last_cost_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY) THEN 'Active'
          WHEN ap.last_cost_date IS NOT NULL THEN 'Paused'
          ELSE 'No Cost Data'
        END as status,
        CASE 
          WHEN ap.last_cost_date IS NOT NULL THEN DATE_DIFF(CURRENT_DATE(), ap.last_cost_date, DAY)
          ELSE NULL
        END as inactive_days,
        COALESCE(ad.dm, 'N/A') as dm,
        COALESCE(ad.content, 'N/A') as content,
        COALESCE(ad.isu, 'N/A') as isu,
        COALESCE(ad.visual, 'N/A') as visual
      FROM ad_details ad
      LEFT JOIN ad_performance ap ON ad.short_url = ap.short_url AND ad.ad_name = ap.ad_name
      ORDER BY ad.published_date DESC, ad.short_url, ad.ad_name
    `;
    
    const request = {
      query: query,
      useLegacySql: false
    };
    
    console.log('Executing BigQuery query for ad data, client:', CONFIG.CLIENT_NAME);
    
    const queryResults = BigQuery.Jobs.query(request, projectId);
    const jobId = queryResults.jobReference.jobId;
    
    // Check if query is complete
    const queryComplete = queryResults.jobComplete;
    
    if (!queryComplete) {
      // Wait for query to complete
      const job = BigQuery.Jobs.get(projectId, jobId);
      if (job.status.state !== 'DONE') {
        throw new Error('Query is still running. Please try again.');
      }
    }
    
    const rows = queryResults.rows || [];
    const processedData = [];
    
    // Process each row
    rows.forEach(row => {
      const values = row.f;
      processedData.push([
        values[0].v || '',  // short_url
        values[1].v || '',  // ad_id
        values[2].v || '',  // ad_name
        values[3].v || '',  // permalink
        values[4].v || '',  // date
        values[5].v || '',  // status
        parseInt(values[6].v) || null,  // inactive_days
        values[7].v || '',  // dm
        values[8].v || '',  // content
        values[9].v || '',  // isu
        values[10].v || ''  // visual
      ]);
    });
    
    console.log(`Retrieved ${processedData.length} ad rows from BigQuery`);
    return processedData;
    
  } catch (error) {
    console.error('Error fetching ad data:', error);
    throw new Error('Failed to fetch ad data from BigQuery: ' + error.toString());
  }
}

/**
 * Main function to export campaign data from BigQuery to Google Sheets
 */
function exportToSheet() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // Show progress
    ui.alert('Starting Export', 'Fetching campaign data from BigQuery...', ui.ButtonSet.OK);
    
    // Fetch data from BigQuery
    const data = fetchBigQueryData();
    
    if (data.length === 0) {
      ui.alert('No Data', 'No campaign data found for client: ' + CONFIG.CLIENT_NAME, ui.ButtonSet.OK);
      return;
    }
    
    // Create or update sheet
    const sheet = createOrUpdateSheet(data);
    
    // Show success message
    ui.alert(
      'Export Complete', 
      `Successfully exported ${data.length} campaign rows to sheet "${CONFIG.SHEET.NAME}"`, 
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    const ui = SpreadsheetApp.getUi();
    ui.alert('Error', 'Failed to export campaign data: ' + error.toString(), ui.ButtonSet.OK);
    console.error('Export error:', error);
  }
}

/**
 * Export ad-level data to a new worksheet (without Meta API data)
 */
function exportAdData() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // Show progress
    ui.alert('Starting Ad Export', 'Fetching ad-level data from BigQuery...', ui.ButtonSet.OK);
    
    // Fetch ad data from BigQuery
    const data = fetchAdData();
    
    if (data.length === 0) {
      ui.alert('No Ad Data', 'No ad data found for client: ' + CONFIG.CLIENT_NAME, ui.ButtonSet.OK);
      return;
    }
    
    // Add empty title and body columns to match new sheet format
    const paddedData = data.map(row => [
      row[0],  // short_url
      row[1],  // ad_id
      row[2],  // ad_name
      '',      // title (empty)
      '',      // body (empty)
      row[3],  // permalink
      row[4],  // date
      row[5],  // status
      row[6],  // inactive_days
      row[7],  // dm
      row[8],  // content
      row[9],  // isu
      row[10]  // visual
    ]);
    
    // Create or update ad sheet
    const sheet = createOrUpdateAdSheet(paddedData);
    
    // Show success message
    ui.alert(
      'Ad Export Complete', 
      `Successfully exported ${paddedData.length} ad rows to "Ad Details" sheet (title/body columns empty - use "Export Ads with Creatives" to fill them)`, 
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    const ui = SpreadsheetApp.getUi();
    ui.alert('Error', 'Failed to export ad data: ' + error.toString(), ui.ButtonSet.OK);
    console.error('Ad export error:', error);
  }
}

/**
 * Export ad-level data with smart incremental creative updates
 * @param {boolean} silent - If true, suppresses UI alerts (for when called from another function)
 */
function exportAdDataWithLiveCreatives(silent = false) {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // Check if Meta API is configured
    const accessToken = getMetaAPIToken();
    if (!accessToken) {
      if (!silent) {
        ui.alert(
          'Meta API Not Configured', 
          'Please set your Meta API access token using setMetaAPIToken(token) function in the Apps Script editor.', 
          ui.ButtonSet.OK
        );
      }
      return;
    }
    
    // Show progress only if not silent
    if (!silent) {
      ui.alert('Starting Smart Creative Export', 'Fetching ad-level data from BigQuery...', ui.ButtonSet.OK);
    }
    
    // Fetch fresh ad data from BigQuery
    const freshData = fetchAdData();
    
    if (freshData.length === 0) {
      if (!silent) {
        ui.alert('No Ad Data', 'No ad data found for client: ' + CONFIG.CLIENT_NAME, ui.ButtonSet.OK);
      }
      return;
    }
    
    // Check for existing sheet and find rows that need creative data
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const existingSheet = ss.getSheetByName('Ad Details');
    let adIdsToFetch = [];
    let adRowMap = {};
    let lastProcessedRow = getLastProcessedRow();
    
    if (existingSheet && existingSheet.getLastRow() > 1) {
      console.log('Found existing Ad Details sheet - checking for missing creative data...');
      console.log(`Last processed row from previous session: ${lastProcessedRow}`);
      
      // Create fresh sheet with BigQuery data first, preserving existing creative data
      const existingData = existingSheet.getRange(2, 1, existingSheet.getLastRow() - 1, existingSheet.getLastColumn()).getValues();
      const existingCreativeMap = {};
      
      // Extract existing creative data
      existingData.forEach(row => {
        const adId = row[1];
        const title = row[3] || '';
        const body = row[4] || '';
        if (title || body) {  // Consider it existing if either title OR body exists
          existingCreativeMap[adId] = { title, body };
        }
      });
      
      console.log(`Preserved creative data for ${Object.keys(existingCreativeMap).length} existing ads`);
      
      // Create updated data with fresh BigQuery info + existing creative data
      const updatedData = freshData.map((row, index) => {
        const adId = row[1];
        const existingCreative = existingCreativeMap[adId];
        const rowNumber = index + 2;
        
        adRowMap[adId] = rowNumber; // Build row map
        
        if (existingCreative) {
          // Use existing creative data
          return [
            row[0], row[1], row[2],           // BigQuery data
            existingCreative.title,           // Existing title
            existingCreative.body,            // Existing body
            row[3], row[4], row[5], row[6],   // More BigQuery data
            row[7], row[8], row[9], row[10]
          ];
        } else {
          // Missing creative data - only add to fetch list if we haven't processed this row yet
          if (rowNumber > lastProcessedRow) {
            adIdsToFetch.push(adId);
          }
          return [
            row[0], row[1], row[2],           // BigQuery data
            '', '',                           // Empty title/body
            row[3], row[4], row[5], row[6],   // More BigQuery data
            row[7], row[8], row[9], row[10]
          ];
        }
      });
      
      // Update sheet with merged data
      const sheet = createOrUpdateAdSheet(updatedData);
      
    } else {
      console.log('Creating new Ad Details sheet...');
      
      // Reset progress for new sheet
      resetProcessingProgress();
      
      // Create fresh sheet with empty creative data
      const paddedData = freshData.map((row, index) => {
        const adId = row[1];
        const rowNumber = index + 2;
        adRowMap[adId] = rowNumber;
        adIdsToFetch.push(adId);
        
        return [
          row[0], row[1], row[2],           // BigQuery data
          '', '',                           // Empty title/body
          row[3], row[4], row[5], row[6],   // More BigQuery data
          row[7], row[8], row[9], row[10]
        ];
      });
      
      const sheet = createOrUpdateAdSheet(paddedData);
    }
    
    // Remove duplicates and filter empty IDs
    adIdsToFetch = [...new Set(adIdsToFetch.filter(id => id && id !== ''))];
    
    console.log(`Need to fetch creative data for ${adIdsToFetch.length} ads (continuing from row ${lastProcessedRow + 1})`);
    
    if (adIdsToFetch.length === 0) {
      if (!silent) {
        ui.alert('All Complete!', 'All ads have been processed. No updates needed.', ui.ButtonSet.OK);
      }
      return;
    }
    
    // Show progress for Meta API only if not silent
    if (!silent) {
      ui.alert('Fetching Missing Creative Data', `Now fetching creative data for ${adIdsToFetch.length} ads that don't have title/body data yet. Watch the sheet update in real-time!`, ui.ButtonSet.OK);
    }
    
    // Get the sheet reference
    const sheet = ss.getSheetByName('Ad Details');
    
    // Fetch creative data with live sheet updates (only for missing ads)
    fetchAdCreativesBatchWithLiveUpdates(adIdsToFetch, sheet, adRowMap, 5, 500);
    
    // Show success message only if not silent
    if (!silent) {
      ui.alert(
        'Smart Creative Export Complete', 
        `Successfully fetched creative data for ${adIdsToFetch.length} ads! Blank cells remain blank if no data is available.`, 
        ui.ButtonSet.OK
      );
    }
    
  } catch (error) {
    const ui = SpreadsheetApp.getUi();
    if (!silent) {
      ui.alert('Error', 'Failed to export live creative data: ' + error.toString(), ui.ButtonSet.OK);
    }
    console.error('Live creative export error:', error);
  }
}


/**
 * Discover actual table schemas in BigQuery
 */
function discoverTableSchemas() {
  try {
    const projectId = CONFIG.BIGQUERY.PROJECT_ID;
    const datasetId = CONFIG.BIGQUERY.DATASET_ID;
    
    // Test basic connection
    const testQuery = `SELECT 1 as test`;
    const testRequest = {
      query: testQuery,
      useLegacySql: false
    };
    BigQuery.Jobs.query(testRequest, projectId);
    
    // Get all tables in the dataset
    const tablesQuery = `
      SELECT table_name
      FROM \`${projectId}.${datasetId}\`.INFORMATION_SCHEMA.TABLES
      WHERE table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    const tablesRequest = {
      query: tablesQuery,
      useLegacySql: false
    };
    
    const tablesResults = BigQuery.Jobs.query(tablesRequest, projectId);
    const tables = tablesResults.rows || [];
    
    // Create a new sheet for schema documentation
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let schemaSheet = ss.getSheetByName('Table Schemas');
    if (!schemaSheet) {
      schemaSheet = ss.insertSheet('Table Schemas');
    } else {
      schemaSheet.clear();
    }
    
    // Headers
    schemaSheet.getRange(1, 1, 1, 4).setValues([['Table Name', 'Column Name', 'Data Type', 'Description']]);
    schemaSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#4285F4').setFontColor('#FFFFFF');
    
    let currentRow = 2;
    
    // Get schema for each table
    for (let i = 0; i < tables.length; i++) {
      const tableName = tables[i].f[0].v;
      
      try {
        const schemaQuery = `
          SELECT column_name, data_type
          FROM \`${projectId}.${datasetId}\`.INFORMATION_SCHEMA.COLUMNS
          WHERE table_name = '${tableName}'
          ORDER BY ordinal_position
        `;
        
        const schemaRequest = {
          query: schemaQuery,
          useLegacySql: false
        };
        
        const schemaResults = BigQuery.Jobs.query(schemaRequest, projectId);
        const columns = schemaResults.rows || [];
        
        // Write table name in first column for first row of each table
        if (columns.length > 0) {
          schemaSheet.getRange(currentRow, 1).setValue(tableName);
          schemaSheet.getRange(currentRow, 1).setFontWeight('bold');
        }
        
        // Write column info
        columns.forEach(row => {
          schemaSheet.getRange(currentRow, 2).setValue(row.f[0].v); // column_name
          schemaSheet.getRange(currentRow, 3).setValue(row.f[1].v); // data_type
          currentRow++;
        });
        
        // Add empty row between tables
        currentRow++;
        
      } catch (tableError) {
        console.error(`Error getting schema for table ${tableName}:`, tableError);
        schemaSheet.getRange(currentRow, 1).setValue(tableName);
        schemaSheet.getRange(currentRow, 2).setValue('ERROR: ' + tableError.toString());
        currentRow += 2;
      }
    }
    
    // Auto-resize columns
    for (let i = 1; i <= 4; i++) {
      schemaSheet.autoResizeColumn(i);
    }
    
    SpreadsheetApp.getUi().alert(
      'Schema Discovery Complete', 
      `Found ${tables.length} tables. Check the 'Table Schemas' sheet for complete column information.`, 
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'Schema Discovery Failed', 
      'Failed to discover schemas: ' + error.toString(), 
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    console.error('Schema discovery error:', error);
  }
}

/**
 * Gets all data from both GDV Export and Ad Details sheets
 * @return {Object} Combined data object with campaign and ad level data
 */
function getAllData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const result = {
      campaigns: [],
      ads: [],
      summary: {
        totalCampaigns: 0,
        totalAds: 0,
        activeCampaigns: 0,
        pausedCampaigns: 0,
        adsWithCreatives: 0
      }
    };
    
    // Get GDV Export (Campaign) data
    const campaignSheet = ss.getSheetByName(CONFIG.SHEET.NAME);
    if (campaignSheet && campaignSheet.getLastRow() > 1) {
      const campaignHeaders = campaignSheet.getRange(1, 1, 1, campaignSheet.getLastColumn()).getValues()[0];
      const campaignData = campaignSheet.getRange(2, 1, campaignSheet.getLastRow() - 1, campaignSheet.getLastColumn()).getValues();
      
      result.campaigns = campaignData.map(row => {
        const campaign = {};
        campaignHeaders.forEach((header, index) => {
          campaign[header] = row[index];
        });
        return campaign;
      });
      
      result.summary.totalCampaigns = result.campaigns.length;
      result.summary.activeCampaigns = result.campaigns.filter(c => c.status === 'Active').length;
      result.summary.pausedCampaigns = result.campaigns.filter(c => c.status === 'Paused').length;
    }
    
    // Get Ad Details data
    const adSheet = ss.getSheetByName('Ad Details');
    if (adSheet && adSheet.getLastRow() > 1) {
      const adHeaders = adSheet.getRange(1, 1, 1, adSheet.getLastColumn()).getValues()[0];
      const adData = adSheet.getRange(2, 1, adSheet.getLastRow() - 1, adSheet.getLastColumn()).getValues();
      
      result.ads = adData.map(row => {
        const ad = {};
        adHeaders.forEach((header, index) => {
          ad[header] = row[index];
        });
        return ad;
      });
      
      result.summary.totalAds = result.ads.length;
      result.summary.adsWithCreatives = result.ads.filter(ad => ad.title && ad.body).length;
    }
    
    console.log(`Retrieved ${result.summary.totalCampaigns} campaigns and ${result.summary.totalAds} ads`);
    console.log(`Summary: ${result.summary.activeCampaigns} active campaigns, ${result.summary.adsWithCreatives} ads with creatives`);
    
    return result;
    
  } catch (error) {
    console.error('Error getting all data:', error);
    throw new Error('Failed to get all data: ' + error.toString());
  }
}

/**
 * Exports all data to a new combined sheet
 */
function exportAllDataToSheet() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // First, fetch fresh data from BigQuery
    ui.alert('Step 1/3', 'Fetching fresh data from BigQuery...', ui.ButtonSet.OK);
    
    // Export campaign data
    const campaignData = fetchBigQueryData();
    if (campaignData.length > 0) {
      createOrUpdateSheet(campaignData);
    }
    
    // Export ad data
    const adData = fetchAdData();
    if (adData.length > 0) {
      // Add empty title and body columns
      const paddedAdData = adData.map(row => [
        row[0], row[1], row[2], '', '', row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10]
      ]);
      createOrUpdateAdSheet(paddedAdData);
    }
    
    // Now run creative updates if Meta API is configured
    const accessToken = getMetaAPIToken();
    if (accessToken && adData.length > 0) {
      ui.alert('Step 2/3', 'Fetching ad creatives from Meta API...', ui.ButtonSet.OK);
      
      // Run the live creative updates (silent mode = true)
      exportAdDataWithLiveCreatives(true);
    }
    
    // Finally, combine all data
    ui.alert('Step 3/3', 'Combining all data into summary sheet...', ui.ButtonSet.OK);
    
    const allData = getAllData();
    
    if (allData.campaigns.length === 0 && allData.ads.length === 0) {
      ui.alert('No Data', 'No data found to combine', ui.ButtonSet.OK);
      return;
    }
    
    // Create combined sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = 'All Data Combined';
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    } else {
      sheet.clear();
    }
    
    let currentRow = 1;
    
    // Add summary section
    sheet.getRange(currentRow, 1, 1, 2).setValues([['DATA SUMMARY', '']]);
    sheet.getRange(currentRow, 1, 1, 2).setFontWeight('bold').setFontSize(14);
    currentRow += 2;
    
    const summaryData = [
      ['Total Campaigns:', allData.summary.totalCampaigns],
      ['Active Campaigns:', allData.summary.activeCampaigns],
      ['Paused Campaigns:', allData.summary.pausedCampaigns],
      ['Total Ads:', allData.summary.totalAds],
      ['Ads with Creatives:', allData.summary.adsWithCreatives]
    ];
    
    sheet.getRange(currentRow, 1, summaryData.length, 2).setValues(summaryData);
    sheet.getRange(currentRow, 1, summaryData.length, 1).setFontWeight('bold');
    currentRow += summaryData.length + 2;
    
    // Add campaign data section
    if (allData.campaigns.length > 0) {
      sheet.getRange(currentRow, 1).setValue('CAMPAIGN DATA');
      sheet.getRange(currentRow, 1).setFontWeight('bold').setFontSize(12);
      currentRow += 1;
      
      const campaignHeaders = Object.keys(allData.campaigns[0]);
      sheet.getRange(currentRow, 1, 1, campaignHeaders.length).setValues([campaignHeaders]);
      sheet.getRange(currentRow, 1, 1, campaignHeaders.length)
        .setBackground('#4285F4').setFontColor('#FFFFFF').setFontWeight('bold');
      currentRow += 1;
      
      const campaignRows = allData.campaigns.map(campaign => 
        campaignHeaders.map(header => campaign[header])
      );
      
      sheet.getRange(currentRow, 1, campaignRows.length, campaignHeaders.length).setValues(campaignRows);
      currentRow += campaignRows.length + 2;
    }
    
    // Add ad data section
    if (allData.ads.length > 0) {
      sheet.getRange(currentRow, 1).setValue('AD DETAILS DATA');
      sheet.getRange(currentRow, 1).setFontWeight('bold').setFontSize(12);
      currentRow += 1;
      
      const adHeaders = Object.keys(allData.ads[0]);
      sheet.getRange(currentRow, 1, 1, adHeaders.length).setValues([adHeaders]);
      sheet.getRange(currentRow, 1, 1, adHeaders.length)
        .setBackground('#34A853').setFontColor('#FFFFFF').setFontWeight('bold');
      currentRow += 1;
      
      const adRows = allData.ads.map(ad => 
        adHeaders.map(header => ad[header])
      );
      
      sheet.getRange(currentRow, 1, adRows.length, adHeaders.length).setValues(adRows);
    }
    
    // Auto-resize all columns
    for (let i = 1; i <= sheet.getLastColumn(); i++) {
      sheet.autoResizeColumn(i);
    }
    
    // Show success message
    const creativeStatus = accessToken ? 
      `• ${allData.summary.adsWithCreatives} ads with creative data` : 
      '• Meta API not configured - run Settings > Set Meta API Token to enable creative fetching';
      
    ui.alert(
      'Export Complete', 
      `Successfully exported all data to "${sheetName}" sheet:\n` +
      `• ${allData.summary.totalCampaigns} campaigns\n` +
      `• ${allData.summary.totalAds} ads\n` +
      creativeStatus, 
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    const ui = SpreadsheetApp.getUi();
    ui.alert('Error', 'Failed to export all data: ' + error.toString(), ui.ButtonSet.OK);
    console.error('Export all data error:', error);
  }
}

/**
 * Simple connection test
 */
function testBigQueryConnection() {
  try {
    const projectId = CONFIG.BIGQUERY.PROJECT_ID;
    const testQuery = `SELECT 1 as test`;
    
    const request = {
      query: testQuery,
      useLegacySql: false
    };
    
    BigQuery.Jobs.query(request, projectId);
    
    SpreadsheetApp.getUi().alert(
      'Connection Test', 
      'Successfully connected to BigQuery project: ' + projectId, 
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'Connection Failed', 
      'Failed to connect to BigQuery: ' + error.toString(), 
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}