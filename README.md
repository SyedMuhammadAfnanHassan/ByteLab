# ByteLab Website

Public static website for ByteLab.

## Google Sheet registration/submission setup

The website is prepared to send registrations and project/daily-quest submissions to a Google Apps Script Web App. The final connection requires a Google account owned/controlled by the ByteLab owner.

### 1. Create the Google Sheet
Create a new Google Sheet, for example `ByteLab Responses`. Copy its spreadsheet ID from the URL:

`https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

### 2. Create the Apps Script
In the Sheet, open **Extensions -> Apps Script**. Replace the default code with the contents of `google_apps_script.gs`.

Replace:

`PASTE_YOUR_GOOGLE_SHEET_ID_HERE`

with your real spreadsheet ID.

### 3. Deploy the Web App
In Apps Script choose **Deploy -> New deployment** and select **Web app**.

Use:
- Execute as: **Me**
- Who has access: **Anyone**

Deploy and copy the generated **Web app URL**.

### 4. Connect the website
Open `index.html` and replace:

`PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE`

with the Web App URL.

Then commit/upload the updated `index.html` to GitHub Pages.

The public website will then send:
- registrations to the **Registrations** sheet
- project/Daily Quest submissions to the **Submissions** sheet

No public statistics are shown on the website.
