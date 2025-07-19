/**
 * Meta (Facebook) Marketing API integration
 * Functions to fetch ad creative data including title and body
 */

/**
 * Gets Meta API access token from Script Properties
 * @return {string} The access token or null if not set
 */
function getMetaAPIToken() {
  const scriptProperties = PropertiesService.getScriptProperties();
  return scriptProperties.getProperty('META_API_ACCESS_TOKEN');
}

/**
 * Sets Meta API access token in Script Properties
 * @param {string} token - The Meta API access token
 */
function setMetaAPIToken(token) {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('META_API_ACCESS_TOKEN', token);
  console.log('Meta API token saved to Script Properties');
}

/**
 * Gets the last processed row for creative data fetching
 * @return {number} The last processed row number (0 if starting fresh)
 */
function getLastProcessedRow() {
  const scriptProperties = PropertiesService.getScriptProperties();
  return parseInt(scriptProperties.getProperty('LAST_PROCESSED_ROW') || '0');
}

/**
 * Sets the last processed row for creative data fetching
 * @param {number} rowNumber - The row number that was last processed
 */
function setLastProcessedRow(rowNumber) {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('LAST_PROCESSED_ROW', rowNumber.toString());
  console.log(`Progress saved: Last processed row ${rowNumber}`);
}

/**
 * Resets the processing progress (start from beginning)
 */
function resetProcessingProgress() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.deleteProperty('LAST_PROCESSED_ROW');
  console.log('Processing progress reset - will start from beginning');
}

/**
 * Fetches ad creative data from Meta API for a single ad
 * @param {string} adId - The Facebook ad ID
 * @return {Object} Ad creative data or null if error
 */
function fetchAdCreative(adId) {
  const accessToken = getMetaAPIToken();
  if (!accessToken) {
    console.error('Meta API access token not configured in Script Properties');
    return null;
  }
  
  if (!adId || adId === '') {
    console.warn('Empty ad ID provided');
    return null;
  }
  
  try {
    // Use the correct endpoint: /adcreatives on the ad ID
    const creativesUrl = `${CONFIG.META_API.BASE_URL}/${adId}/adcreatives` +
                         `?fields=body,title,video_id,image_hash,object_id` +
                         `&access_token=${accessToken}`;
    
    console.log(`Fetching creatives for ad ${adId}`);
    
    const response = UrlFetchApp.fetch(creativesUrl, {
      method: 'GET',
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      console.error(`Meta API error for ad ${adId}: ${response.getContentText()}`);
      return {
        ad_id: adId,
        title: 'API Error',
        body: 'Failed to fetch creative data',
        image_url: '',
        call_to_action_type: '',
        link_url: ''
      };
    }
    
    const data = JSON.parse(response.getContentText());
    const creatives = data.data || [];
    
    if (creatives.length === 0) {
      console.warn(`No creatives found for ad ${adId}`);
      return {
        ad_id: adId,
        title: '',  // Leave blank
        body: '',   // Leave blank
        image_url: '',
        call_to_action_type: '',
        link_url: ''
      };
    }
    
    // Use the first creative (most ads have one creative)
    const creative = creatives[0];
    
    const result = {
      ad_id: adId,
      title: creative.title || '',  // Leave blank if no title
      body: creative.body || '',    // Leave blank if no body
      image_url: creative.image_hash || '',
      call_to_action_type: '',
      link_url: '',
      video_id: creative.video_id || '',
      object_id: creative.object_id || '',
      creative_id: creative.id || ''
    };
    
    // Print the creative result immediately
    console.log(`✅ Retrieved creative for ad ${adId}:`);
    console.log(`   Title: ${result.title.substring(0, 50)}${result.title.length > 50 ? '...' : ''}`);
    console.log(`   Body: ${result.body.substring(0, 100)}${result.body.length > 100 ? '...' : ''}`);
    
    return result;
    
  } catch (error) {
    console.error(`Error fetching ad creative for ${adId}:`, error);
    return {
      ad_id: adId,
      title: 'Error fetching',
      body: 'Error fetching',
      image_url: '',
      call_to_action_type: '',
      link_url: ''
    };
  }
}

/**
 * Fetches ad creative data for multiple ads with rate limiting and immediate sheet updates
 * @param {Array} adIds - Array of Facebook ad IDs
 * @param {Sheet} sheet - The sheet to update immediately 
 * @param {Object} adRowMap - Map of ad_id to row number in sheet
 * @param {number} batchSize - Number of ads to process per batch (default: 10)
 * @param {number} delayMs - Delay between batches in milliseconds (default: 1000)
 * @return {Array} Array of ad creative data objects
 */
function fetchAdCreativesBatchWithLiveUpdates(adIds, sheet, adRowMap, batchSize = 10, delayMs = 1000) {
  const accessToken = getMetaAPIToken();
  if (!accessToken) {
    throw new Error('Meta API access token not configured in Script Properties. Use setMetaAPIToken(token) to set it.');
  }
  
  const results = [];
  const totalBatches = Math.ceil(adIds.length / batchSize);
  
  console.log(`Fetching creative data for ${adIds.length} ads in ${totalBatches} batches with live updates`);
  
  for (let i = 0; i < adIds.length; i += batchSize) {
    const batch = adIds.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} ads)`);
    
    // Process batch
    for (const adId of batch) {
      const creative = fetchAdCreative(adId);
      
      let result;
      if (creative) {
        result = creative;
      } else {
        // Leave blank for failed requests instead of error messages
        result = {
          ad_id: adId,
          title: '',
          body: '',
          image_url: '',
          call_to_action_type: '',
          link_url: ''
        };
      }
      
      results.push(result);
      
      // Update sheet immediately with this creative data
      const rowNumber = adRowMap[adId];
      if (rowNumber && sheet) {
        try {
          // Update title (column 4) and body (column 5) - only if we have data
          if (result.title) {
            sheet.getRange(rowNumber, 4).setValue(result.title);
          }
          if (result.body) {
            sheet.getRange(rowNumber, 5).setValue(result.body);
          }
          
          console.log(`✅ Updated sheet row ${rowNumber} for ad ${adId}: "${result.title.substring(0, 30)}..." / "${result.body.substring(0, 30)}..."`);
          
          // Save progress - this row has been processed
          setLastProcessedRow(rowNumber);
          
          // Force sheet to refresh/flush changes
          SpreadsheetApp.flush();
          
        } catch (error) {
          console.error(`Failed to update sheet for ad ${adId}:`, error);
        }
      } else {
        console.warn(`Cannot update sheet for ad ${adId}: rowNumber=${rowNumber}, sheet=${sheet ? 'exists' : 'null'}`);
      }
      
      // Small delay between individual requests to avoid rate limiting
      if (batch.indexOf(adId) < batch.length - 1) {
        Utilities.sleep(200);
      }
    }
    
    // Delay between batches
    if (i + batchSize < adIds.length) {
      console.log(`Waiting ${delayMs}ms before next batch...`);
      Utilities.sleep(delayMs);
    }
  }
  
  console.log(`Completed fetching creative data with live updates. Got ${results.length} results.`);
  return results;
}



/**
 * Test function to verify Meta API connectivity
 * @param {string} testAdId - A sample ad ID to test with
 */
function testMetaAPIConnection(testAdId) {
  try {
    const accessToken = getMetaAPIToken();
    if (!accessToken) {
      SpreadsheetApp.getUi().alert('Error', 'Please configure your Meta API access token using setMetaAPIToken(token) function', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    if (!testAdId) {
      SpreadsheetApp.getUi().alert('Error', 'Please provide a test ad ID', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    const result = fetchAdCreative(testAdId);
    
    if (result) {
      SpreadsheetApp.getUi().alert(
        'Meta API Test Successful',
        `Successfully fetched data for ad ${testAdId}:\nTitle: ${result.title}\nBody: ${result.body.substring(0, 100)}...`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } else {
      SpreadsheetApp.getUi().alert(
        'Meta API Test Failed',
        'Could not fetch ad creative data. Check console logs for details.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error', 'Meta API test failed: ' + error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
    console.error('Meta API test error:', error);
  }
}


