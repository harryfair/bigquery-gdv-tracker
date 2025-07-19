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
        values[1].v || '',  // ad_name
        values[2].v || '',  // permalink
        values[3].v || '',  // date
        values[4].v || '',  // status
        parseInt(values[5].v) || null,  // inactive_days
        values[6].v || '',  // dm
        values[7].v || '',  // content
        values[8].v || '',  // isu
        values[9].v || ''   // visual
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
 * Export ad-level data to a new worksheet
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
    
    // Create or update ad sheet
    const sheet = createOrUpdateAdSheet(data);
    
    // Show success message
    ui.alert(
      'Ad Export Complete', 
      `Successfully exported ${data.length} ad rows to "Ad Details" sheet`, 
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    const ui = SpreadsheetApp.getUi();
    ui.alert('Error', 'Failed to export ad data: ' + error.toString(), ui.ButtonSet.OK);
    console.error('Ad export error:', error);
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