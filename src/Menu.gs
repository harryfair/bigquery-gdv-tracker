/**
 * Menu and UI functions
 */

/**
 * Creates custom menu when the spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('BigQuery Export')
    .addItem('📋 All Data', 'exportAllDataToSheet')
    .addItem('📊 Retrieve Data for GDV Export', 'exportToSheet')
    .addItem('📝 Retrieve Data for Ad Details', 'exportAdDataWithLiveCreatives')
    .addSeparator()
    .addItem('🔑 Settings', 'showSettingsMenu')
    .addToUi();
}

/**
 * Shows settings submenu
 */
function showSettingsMenu() {
  const ui = SpreadsheetApp.getUi();
  
  const result = ui.alert(
    'Settings Menu',
    'Choose an option:\n\n' +
    '1. Set Meta API Token\n' +
    '2. Test Meta API\n' +
    '3. Reset Creative Progress\n' +
    '4. Test BigQuery Connection\n' +
    '5. About\n\n' +
    'Enter option number:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (result === ui.Button.OK) {
    const choice = ui.prompt('Settings', 'Enter option number (1-5):', ui.ButtonSet.OK_CANCEL);
    
    if (choice.getSelectedButton() === ui.Button.OK) {
      const option = choice.getResponseText().trim();
      
      switch(option) {
        case '1':
          showSetTokenDialog();
          break;
        case '2':
          showMetaAPITestDialog();
          break;
        case '3':
          showResetProgressDialog();
          break;
        case '4':
          testBigQueryConnection();
          break;
        case '5':
          showAbout();
          break;
        default:
          ui.alert('Invalid Option', 'Please enter a number between 1 and 5', ui.ButtonSet.OK);
      }
    }
  }
}

/**
 * Shows about dialog
 */
function showAbout() {
  const ui = SpreadsheetApp.getUi();
  
  ui.alert(
    'About BigQuery GDV Tracker',
    `Client: ${CONFIG.CLIENT_NAME}\n` +
    `Project: ${CONFIG.BIGQUERY.PROJECT_ID}\n` +
    `Dataset: ${CONFIG.BIGQUERY.DATASET_ID}\n\n` +
    `Main Features:\n` +
    `• Export All Data - Combines campaign and ad data\n` +
    `• Update Ad Creatives - Fetches titles/bodies from Meta API\n\n` +
    `Version: 2.0`,
    ui.ButtonSet.OK
  );
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

/**
 * Shows dialog to set Meta API token
 */
function showSetTokenDialog() {
  const ui = SpreadsheetApp.getUi();
  
  const result = ui.prompt(
    'Set Meta API Token',
    'Enter your Meta API access token (it will be stored securely in Script Properties):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (result.getSelectedButton() === ui.Button.OK) {
    const token = result.getResponseText().trim();
    if (token) {
      setMetaAPIToken(token);
      ui.alert(
        'Token Saved',
        'Meta API token has been saved securely. You can now use Meta API functions.',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert('Error', 'Please enter a valid token', ui.ButtonSet.OK);
    }
  }
}

/**
 * Shows dialog to reset creative fetching progress
 */
function showResetProgressDialog() {
  const ui = SpreadsheetApp.getUi();
  
  const lastProcessedRow = getLastProcessedRow();
  
  const result = ui.alert(
    'Reset Creative Fetching Progress',
    `Current progress: Last processed row ${lastProcessedRow}\n\nDo you want to reset progress and start fetching creative data from the beginning?`,
    ui.ButtonSet.YES_NO
  );
  
  if (result === ui.Button.YES) {
    resetProcessingProgress();
    ui.alert(
      'Progress Reset',
      'Creative fetching progress has been reset. Next run will start from the beginning.',
      ui.ButtonSet.OK
    );
  }
}

/**
 * Shows Meta API test dialog
 */
function showMetaAPITestDialog() {
  const ui = SpreadsheetApp.getUi();
  
  const accessToken = getMetaAPIToken();
  if (!accessToken) {
    ui.alert(
      'Meta API Not Configured',
      'Please set your Meta API access token using setMetaAPIToken(token) function in the Apps Script editor first.',
      ui.ButtonSet.OK
    );
    return;
  }
  
  const result = ui.prompt(
    'Test Meta API',
    'Enter a Facebook Ad ID to test the Meta API connection:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (result.getSelectedButton() === ui.Button.OK) {
    const adId = result.getResponseText().trim();
    if (adId) {
      testMetaAPIConnection(adId);
    } else {
      ui.alert('Error', 'Please enter a valid Ad ID', ui.ButtonSet.OK);
    }
  }
}

