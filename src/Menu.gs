/**
 * Menu and UI functions
 */

/**
 * Creates custom menu when the spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('BigQuery Export')
    .addItem('📊 Export Campaign Data', 'exportToSheet')
    .addItem('📝 Export Ad Details', 'exportAdData')
    .addItem('📈 Create Summary', 'createSummarySheet')
    .addSeparator()
    .addItem('🔍 Discover Table Schemas', 'discoverTableSchemas')
    .addItem('🔌 Test Connection', 'testBigQueryConnection')
    .addItem('ℹ️ About', 'showAbout')
    .addToUi();
}

/**
 * Shows about dialog
 */
function showAbout() {
  const ui = SpreadsheetApp.getUi();
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>BigQuery GDV Tracker</h2>
      <p><strong>Client:</strong> ${CONFIG.CLIENT_NAME}</p>
      <p><strong>Project:</strong> ${CONFIG.BIGQUERY.PROJECT_ID}</p>
      <p><strong>Dataset:</strong> ${CONFIG.BIGQUERY.DATASET_ID}</p>
      <br>
      <h3>Features:</h3>
      <ul>
        <li>Export campaign data from BigQuery</li>
        <li>Calculate ROAS (Return on Ad Spend)</li>
        <li>Track campaign status (Active/Paused)</li>
        <li>Generate summary statistics</li>
      </ul>
      <br>
      <p><strong>How to use:</strong></p>
      <ol>
        <li>Click "BigQuery Export" in the menu</li>
        <li>Select "Export Data" to fetch latest data</li>
        <li>Use "Create Summary" for aggregated statistics</li>
      </ol>
    </div>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(htmlContent)
    .setWidth(400)
    .setHeight(450);
  
  ui.showModalDialog(htmlOutput, 'About BigQuery GDV Tracker');
}

/**
 * Creates a sidebar for advanced options
 */
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Export Options')
    .setWidth(300);
  
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Gets current configuration for display
 * @return {Object} Current configuration
 */
function getConfiguration() {
  return {
    clientName: CONFIG.CLIENT_NAME,
    projectId: CONFIG.BIGQUERY.PROJECT_ID,
    datasetId: CONFIG.BIGQUERY.DATASET_ID,
    sheetName: CONFIG.SHEET.NAME
  };
}

/**
 * Updates client name for filtering
 * @param {string} newClientName - New client name to filter by
 */
function updateClientName(newClientName) {
  if (!newClientName || newClientName.trim() === '') {
    throw new Error('Client name cannot be empty');
  }
  
  // This would need to be stored in Script Properties for persistence
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('CLIENT_NAME', newClientName);
  
  // Update CONFIG
  CONFIG.CLIENT_NAME = newClientName;
  
  return 'Client name updated to: ' + newClientName;
}