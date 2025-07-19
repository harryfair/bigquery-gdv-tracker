/**
 * Configuration for BigQuery GDV Tracker
 */

const CONFIG = {
  // BigQuery settings
  BIGQUERY: {
    PROJECT_ID: 'numeric-button-449507-v7',
    DATASET_ID: 'gdv',
    LOCATION: 'US' // or your BigQuery dataset location
  },
  
  // Client filter
  CLIENT_NAME: 'Yayasan Amartha Indotama Bakti Pertiwi',
  
  // Meta (Facebook) API settings
  META_API: {
    BASE_URL: 'https://graph.facebook.com/v22.0',
    ACCESS_TOKEN: '', // This will be loaded from Script Properties
    FIELDS: 'body,title,video_id,image_hash,object_id'
  },
  
  // Sheet settings
  SHEET: {
    NAME: 'GDV Export - Yayasan Amartha',
    HEADERS: [
      'short_url',
      'content',
      'dm',
      'isu',
      'visual',
      'start_date',
      'end_date',
      'status',
      'inactive_days',
      'gdv_ads',
      'cost',
      'roas'
    ]
  },
  
  // Column mappings
  COLUMNS: {
    SHORT_URL: 0,
    CONTENT: 1,
    DM: 2,
    ISU: 3,
    VISUAL: 4,
    START_DATE: 5,
    END_DATE: 6,
    STATUS: 7,
    INACTIVE_DAYS: 8,
    GDV_ADS: 9,
    COST: 10,
    ROAS: 11
  }
};