import pandas as pd
from google.cloud import bigquery
from google.oauth2 import service_account
import gspread
from gspread_dataframe import set_with_dataframe
from datetime import datetime
import os

# Configuration
PROJECT_ID = 'your-project-id'  # Replace with your BigQuery project ID
DATASET_ID = 'your-dataset-id'  # Replace with your dataset ID
TABLE_NAME = 'your-table-name'  # Replace with your table name
CLIENT_NAME = 'Yayasan Amartha Indotama Bakti Pertiwi'

# Google Sheets configuration
SPREADSHEET_NAME = 'BigQuery Export - Yayasan Amartha'  # Name for the Google Sheet
WORKSHEET_NAME = 'Data Export'

def setup_bigquery_client():
    """Set up BigQuery client with authentication."""
    # Option 1: Use service account key file
    # credentials = service_account.Credentials.from_service_account_file(
    #     'path/to/your/service-account-key.json'
    # )
    # client = bigquery.Client(project=PROJECT_ID, credentials=credentials)
    
    # Option 2: Use Application Default Credentials
    client = bigquery.Client(project=PROJECT_ID)
    
    return client

def get_data_from_bigquery(client):
    """Extract data from BigQuery with the specified fields."""
    query = f"""
    SELECT 
        short_url,
        content,
        dm,
        isu,
        visual,
        start_date,
        end_date,
        status,
        gdv_ads,
        cost,
        SAFE_DIVIDE(gdv_ads, cost) as roas
    FROM 
        `{PROJECT_ID}.{DATASET_ID}.{TABLE_NAME}`
    WHERE 
        client_name = @client_name
        OR LOWER(client_name) LIKE LOWER(@client_pattern)
    ORDER BY 
        start_date DESC
    """
    
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("client_name", "STRING", CLIENT_NAME),
            bigquery.ScalarQueryParameter("client_pattern", "STRING", f"%{CLIENT_NAME}%")
        ]
    )
    
    print(f"Querying BigQuery for {CLIENT_NAME} data...")
    query_job = client.query(query, job_config=job_config)
    
    # Convert to pandas DataFrame
    df = query_job.to_dataframe()
    
    # Format dates if they exist
    if 'start_date' in df.columns:
        df['start_date'] = pd.to_datetime(df['start_date']).dt.strftime('%Y-%m-%d')
    if 'end_date' in df.columns:
        df['end_date'] = pd.to_datetime(df['end_date']).dt.strftime('%Y-%m-%d')
    
    # Format ROAS to 2 decimal places
    if 'roas' in df.columns:
        df['roas'] = df['roas'].round(2)
    
    print(f"Retrieved {len(df)} rows of data")
    return df

def setup_google_sheets_client():
    """Set up Google Sheets client with authentication."""
    # Option 1: Use service account key file
    # gc = gspread.service_account(filename='path/to/your/service-account-key.json')
    
    # Option 2: Use default credentials
    gc = gspread.service_account()
    
    return gc

def export_to_google_sheets(df, gc):
    """Export DataFrame to Google Sheets."""
    try:
        # Try to open existing spreadsheet
        spreadsheet = gc.open(SPREADSHEET_NAME)
        print(f"Found existing spreadsheet: {SPREADSHEET_NAME}")
    except gspread.SpreadsheetNotFound:
        # Create new spreadsheet if it doesn't exist
        spreadsheet = gc.create(SPREADSHEET_NAME)
        print(f"Created new spreadsheet: {SPREADSHEET_NAME}")
        
        # Share with your email (optional)
        # spreadsheet.share('your-email@example.com', perm_type='user', role='writer')
    
    # Select or create worksheet
    try:
        worksheet = spreadsheet.worksheet(WORKSHEET_NAME)
        worksheet.clear()  # Clear existing data
    except gspread.WorksheetNotFound:
        worksheet = spreadsheet.add_worksheet(title=WORKSHEET_NAME, rows=1000, cols=20)
    
    # Write DataFrame to worksheet
    set_with_dataframe(worksheet, df, include_index=False, include_column_header=True)
    
    # Format headers
    worksheet.format('A1:K1', {
        'textFormat': {'bold': True},
        'backgroundColor': {'red': 0.9, 'green': 0.9, 'blue': 0.9}
    })
    
    print(f"Data exported to Google Sheets: {spreadsheet.url}")
    return spreadsheet.url

def main():
    """Main function to orchestrate the data export."""
    try:
        # Set up BigQuery client
        bq_client = setup_bigquery_client()
        
        # Get data from BigQuery
        df = get_data_from_bigquery(bq_client)
        
        # Display sample of the data
        print("\nSample of retrieved data:")
        print(df.head())
        
        # Set up Google Sheets client
        gc = setup_google_sheets_client()
        
        # Export to Google Sheets
        sheet_url = export_to_google_sheets(df, gc)
        
        print(f"\n✅ Export completed successfully!")
        print(f"📊 Google Sheet URL: {sheet_url}")
        
        # Save a local backup as CSV
        backup_filename = f"yayasan_amartha_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        df.to_csv(backup_filename, index=False)
        print(f"📁 Local backup saved as: {backup_filename}")
        
    except Exception as e:
        print(f"❌ Error occurred: {str(e)}")
        raise

if __name__ == "__main__":
    main()