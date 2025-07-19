/**
 * Sheet management functions
 */

/**
 * Creates or updates the export sheet with data
 * @param {Array} data - The data to write to the sheet
 * @return {Sheet} The updated sheet
 */
function createOrUpdateSheet(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET.NAME);
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET.NAME);
  } else {
    // Clear existing content
    sheet.clear();
  }
  
  // Set headers
  const headers = CONFIG.SHEET.HEADERS;
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Apply header formatting
  formatHeaders(sheet);
  
  // Write data if available
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
    
    // Format data
    formatData(sheet, data.length);
  }
  
  // Auto-resize columns
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  return sheet;
}

/**
 * Formats the header row
 * @param {Sheet} sheet - The sheet to format
 */
function formatHeaders(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, CONFIG.SHEET.HEADERS.length);
  
  headerRange
    .setBackground('#4285F4')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true);
}

/**
 * Formats the data in the sheet
 * @param {Sheet} sheet - The sheet to format
 * @param {number} rowCount - Number of data rows
 */
function formatData(sheet, rowCount) {
  if (rowCount === 0) return;
  
  // Format numbers (GDV Ads and Cost)
  const gdvColumn = CONFIG.COLUMNS.GDV_ADS + 1;
  const costColumn = CONFIG.COLUMNS.COST + 1;
  
  sheet.getRange(2, gdvColumn, rowCount, 1)
    .setNumberFormat('#,##0');
  
  sheet.getRange(2, costColumn, rowCount, 1)
    .setNumberFormat('#,##0');
  
  // Format inactive_days column as integer
  const inactiveDaysColumn = CONFIG.COLUMNS.INACTIVE_DAYS + 1;
  sheet.getRange(2, inactiveDaysColumn, rowCount, 1)
    .setNumberFormat('0');
  
  // Format ROAS column
  const roasColumn = CONFIG.COLUMNS.ROAS + 1;
  sheet.getRange(2, roasColumn, rowCount, 1)
    .setNumberFormat('0.00');
  
  // Format dates
  const startDateColumn = CONFIG.COLUMNS.START_DATE + 1;
  const endDateColumn = CONFIG.COLUMNS.END_DATE + 1;
  
  sheet.getRange(2, startDateColumn, rowCount, 1)
    .setNumberFormat('yyyy-mm-dd');
  
  sheet.getRange(2, endDateColumn, rowCount, 1)
    .setNumberFormat('yyyy-mm-dd');
  
  // Apply conditional formatting for status
  const statusColumn = CONFIG.COLUMNS.STATUS + 1;
  const statusRange = sheet.getRange(2, statusColumn, rowCount, 1);
  
  // Clear existing rules
  const rules = sheet.getConditionalFormatRules();
  sheet.clearConditionalFormatRules();
  
  // Active status - green
  const activeRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Active')
    .setBackground('#C6EFCE')
    .setFontColor('#006100')
    .setRanges([statusRange])
    .build();
  
  // Paused status - red
  const pausedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Paused')
    .setBackground('#FFC7CE')
    .setFontColor('#9C0006')
    .setRanges([statusRange])
    .build();
  
  sheet.setConditionalFormatRules([activeRule, pausedRule]);
  
  // Apply alternating row colors
  const dataRange = sheet.getRange(2, 1, rowCount, CONFIG.SHEET.HEADERS.length);
  dataRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
  
  // Add borders
  dataRange.setBorder(true, true, true, true, true, true);
}

/**
 * Creates or updates the ad details sheet with ad-level data
 * @param {Array} data - The ad data to write to the sheet
 * @return {Sheet} The updated sheet
 */
function createOrUpdateAdSheet(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = 'Ad Details';
  let sheet = ss.getSheetByName(sheetName);
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    // Clear existing content
    sheet.clear();
  }
  
  // Set headers for ad data - using exact BigQuery column names
  const headers = [
    'short_url',
    'ad_name', 
    'permalink',
    'date',
    'status',
    'inactive_days',
    'dm',
    'content',
    'isu',
    'visual'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Apply header formatting
  formatAdHeaders(sheet, headers.length);
  
  // Write data if available
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
    
    // Format data
    formatAdData(sheet, data.length, headers.length);
  }
  
  // Auto-resize columns
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  return sheet;
}

/**
 * Formats the ad sheet header row
 * @param {Sheet} sheet - The sheet to format
 * @param {number} columnCount - Number of columns
 */
function formatAdHeaders(sheet, columnCount) {
  const headerRange = sheet.getRange(1, 1, 1, columnCount);
  
  headerRange
    .setBackground('#34A853')  // Green for ad data
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true);
}

/**
 * Formats the ad data in the sheet
 * @param {Sheet} sheet - The sheet to format
 * @param {number} rowCount - Number of data rows
 * @param {number} columnCount - Number of columns
 */
function formatAdData(sheet, rowCount, columnCount) {
  if (rowCount === 0) return;
  
  // Format date column (column 4)
  sheet.getRange(2, 4, rowCount, 1)
    .setNumberFormat('yyyy-mm-dd');
  
  // Format inactive_days column (column 6) as integer
  sheet.getRange(2, 6, rowCount, 1)
    .setNumberFormat('0');
  
  // Apply conditional formatting for status (column 5)
  const statusRange = sheet.getRange(2, 5, rowCount, 1);
  
  // Clear existing rules
  const rules = sheet.getConditionalFormatRules();
  sheet.clearConditionalFormatRules();
  
  // Active status - green
  const activeRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Active')
    .setBackground('#C6EFCE')
    .setFontColor('#006100')
    .setRanges([statusRange])
    .build();
  
  // Paused status - red
  const pausedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Paused')
    .setBackground('#FFC7CE')
    .setFontColor('#9C0006')
    .setRanges([statusRange])
    .build();
  
  // No Cost Data - yellow
  const noCostRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('No Cost Data')
    .setBackground('#FFEB9C')
    .setFontColor('#9C6500')
    .setRanges([statusRange])
    .build();
  
  sheet.setConditionalFormatRules([activeRule, pausedRule, noCostRule]);
  
  // Make permalinks clickable (column 3)
  const permalinkRange = sheet.getRange(2, 3, rowCount, 1);
  const permalinkValues = permalinkRange.getValues();
  
  permalinkValues.forEach((row, index) => {
    if (row[0] && row[0].toString().startsWith('http')) {
      const cell = sheet.getRange(index + 2, 3);
      cell.setFormula(`=HYPERLINK("${row[0]}", "View Ad")`);
    }
  });
  
  // Apply alternating row colors
  const dataRange = sheet.getRange(2, 1, rowCount, columnCount);
  dataRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREEN);
  
  // Add borders
  dataRange.setBorder(true, true, true, true, true, true);
}

/**
 * Creates a summary sheet with aggregated data
 */
function createSummarySheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataSheet = ss.getSheetByName(CONFIG.SHEET.NAME);
  
  if (!dataSheet) {
    SpreadsheetApp.getUi().alert('No data sheet found. Please run export first.');
    return;
  }
  
  let summarySheet = ss.getSheetByName('Summary');
  if (!summarySheet) {
    summarySheet = ss.insertSheet('Summary');
  } else {
    summarySheet.clear();
  }
  
  // Create summary headers
  const summaryHeaders = [
    ['Summary Statistics for ' + CONFIG.CLIENT_NAME],
    [''],
    ['Metric', 'Value'],
    ['Total Campaigns', ''],
    ['Active Campaigns', ''],
    ['Paused Campaigns', ''],
    ['Total GDV Ads', ''],
    ['Total Cost', ''],
    ['Average ROAS', ''],
    [''],
    ['Top 5 Campaigns by gdv_ads'],
    ['short_url', 'gdv_ads', 'cost', 'roas']
  ];
  
  summarySheet.getRange(1, 1, summaryHeaders.length, 4).setValues(summaryHeaders);
  
  // Format title
  summarySheet.getRange(1, 1, 1, 4).merge()
    .setFontSize(16)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  
  // Add formulas for summary statistics
  const dataSheetName = CONFIG.SHEET.NAME;
  const lastRow = dataSheet.getLastRow();
  
  // Total campaigns (short_url column)
  summarySheet.getRange(4, 2).setFormula(`=COUNTA('${dataSheetName}'!A2:A${lastRow})`);
  
  // Active campaigns (status column)
  summarySheet.getRange(5, 2).setFormula(`=COUNTIF('${dataSheetName}'!H2:H${lastRow},"Active")`);
  
  // Paused campaigns (status column)
  summarySheet.getRange(6, 2).setFormula(`=COUNTIF('${dataSheetName}'!H2:H${lastRow},"Paused")`);
  
  // Total GDV Ads (gdv_ads column)
  summarySheet.getRange(7, 2).setFormula(`=SUM('${dataSheetName}'!I2:I${lastRow})`);
  
  // Total Cost (cost column)
  summarySheet.getRange(8, 2).setFormula(`=SUM('${dataSheetName}'!J2:J${lastRow})`);
  
  // Average ROAS (roas column)
  summarySheet.getRange(9, 2).setFormula(`=AVERAGE('${dataSheetName}'!K2:K${lastRow})`);
  
  // Format numbers
  summarySheet.getRange(7, 2, 2, 1).setNumberFormat('#,##0');
  summarySheet.getRange(9, 2).setNumberFormat('0.00');
  
  // Style the summary section
  summarySheet.getRange(3, 1, 7, 2).setBorder(true, true, true, true, true, true);
  summarySheet.getRange(3, 1, 1, 2).setBackground('#E8E8E8').setFontWeight('bold');
}