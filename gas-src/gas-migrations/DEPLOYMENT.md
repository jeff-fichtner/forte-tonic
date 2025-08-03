# Google Apps Script Deployment Guide

This guide walks you through setting up and deploying the Tonic database migrations as Google Apps Script functions.

## Prerequisites

- Google account with access to Google Sheets and Apps Script
- The Google Sheets document you want to migrate
- Administrative access to the spreadsheet

## Step-by-Step Setup

### 1. Access Google Apps Script

1. Open your Google Sheets document
2. In the menu bar, click **Extensions** > **Apps Script**
3. This will open the Google Apps Script editor in a new tab

### 2. Set Up the Project

1. **Rename the project** (optional but recommended):
   - Click on "Untitled project" at the top
   - Rename to something like "Tonic Database Migrations"

2. **Delete the default Code.gs file** if you want a clean start:
   - Right-click on "Code.gs" in the file list
   - Select "Delete"

### 3. Add Migration Files

For each migration file in this folder:

1. **Create a new script file:**
   - Click the **+** (plus) button next to "Files"
   - Select "Script" 
   - Name it exactly as shown in the migration filename (e.g., "Migration001_StructuralImprovements")

2. **Copy the migration content:**
   - Open the `.gs` file from this folder
   - Select all content (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)
   - Paste into the new Apps Script file (Ctrl+V / Cmd+V)

3. **Save the file:**
   - Click **Ctrl+S** or **Cmd+S** to save
   - Or click the disk icon in the toolbar

### 4. Test the Setup

1. **Select a migration function:**
   - In the function dropdown (next to the play button), select a preview function
   - For example: `previewStructuralImprovements`

2. **Run the preview:**
   - Click the **Play** button (▶️)
   - You may be prompted to authorize the script

3. **Check the logs:**
   - Click **View** > **Logs** to see the output
   - Or use **Ctrl+Enter** / **Cmd+Enter**

### 5. Authorization Setup

The first time you run a script, Google will ask for permissions:

1. **Click "Review permissions"**
2. **Select your Google account**
3. **Click "Advanced" if you see a warning**
4. **Click "Go to [Project Name] (unsafe)"**
5. **Click "Allow"**

The script needs these permissions:
- **View and manage spreadsheets** - To read and modify sheet data
- **Display and run third-party web content** - For logging and UI features

### 6. Running Migrations

#### Safe Migration Process

1. **Always start with preview:**
   ```javascript
   // Example: Preview what will change
   previewStructuralImprovements();
   ```

2. **Review the preview output** in the logs

3. **Make a backup** of your spreadsheet:
   - File > Make a copy
   - Name it with the date: "Tonic_Backup_2025-08-02"

4. **Run the migration:**
   ```javascript
   // Execute the migration
   runStructuralImprovements();
   ```

5. **Verify the results** in your spreadsheet

6. **If something goes wrong, rollback:**
   ```javascript
   // Undo the migration
   rollbackStructuralImprovements();
   ```

## Available Functions

### Migration 001: Structural Improvements

**Preview Function:**
```javascript
previewStructuralImprovements()
```
- Shows what changes will be made
- Lists affected sheets and columns
- Identifies potential issues

**Execute Function:**
```javascript
runStructuralImprovements()
```
- Applies all structural improvements
- Standardizes headers
- Adds data validation
- Applies formatting

**Rollback Function:**
```javascript
rollbackStructuralImprovements()
```
- Restores original headers
- Notes manual cleanup needed for advanced features

## Monitoring and Debugging

### Viewing Logs

1. **Execution Transcript:**
   - View > Execution transcript
   - Shows detailed execution logs
   - Includes timestamps and function calls

2. **Console Logs:**
   - View > Logs
   - Shows console.log() output
   - Best for debugging and progress monitoring

### Common Error Messages

**"SpreadsheetApp is not defined"**
- This means you're not in Google Apps Script environment
- Make sure you're running from Extensions > Apps Script

**"Cannot read property 'getSheetByName'"**
- The spreadsheet might not be properly linked
- Try refreshing and re-authorizing

**"Sheet 'name' not found"**
- Check that your sheet names match exactly
- Sheet names are case-sensitive

### Debugging Tips

1. **Test with small changes first**
2. **Use console.log() to add debugging output**
3. **Run preview functions before executing**
4. **Keep backups of your data**

## Advanced Features

### Creating a Migration Log Sheet

Add a "Migration Log" sheet to track migration history:

1. **Create a new sheet** named "Migration Log"
2. **Add headers:** Date, Migration, Status, Notes
3. **The migrations will automatically log** to this sheet

### Scheduling Migrations

You can set up triggers to run migrations automatically:

1. **Go to Triggers** (clock icon in left sidebar)
2. **Add Trigger**
3. **Choose function** and **event type**
4. **Set timing** (time-driven, on form submit, etc.)

⚠️ **Warning:** Be very careful with automated migrations

### Custom Notifications

Add email notifications when migrations complete:

```javascript
function sendMigrationNotification(migrationName, success) {
  const email = Session.getActiveUser().getEmail();
  const subject = `Migration ${migrationName} ${success ? 'Completed' : 'Failed'}`;
  const body = `The migration ${migrationName} has ${success ? 'completed successfully' : 'failed'}. Please check the logs for details.`;
  
  GmailApp.sendEmail(email, subject, body);
}
```

## Troubleshooting

### Permission Issues

**Script needs additional permissions:**
1. Run the script that needs permissions
2. Click "Review permissions" when prompted
3. Follow the authorization flow
4. Try running the script again

### Performance Issues

**Script timeout errors:**
- Google Apps Script has execution time limits
- For large datasets, consider breaking migrations into smaller chunks
- Use `Utilities.sleep()` to add delays if needed

### Data Validation Conflicts

**Existing data doesn't match validation rules:**
1. Run the preview to identify conflicts
2. Clean up data manually first
3. Or modify the validation rules to be less strict
4. Re-run the migration

## Best Practices

### Development Workflow

1. **Test in development spreadsheet first**
2. **Use version control** for your Apps Script projects
3. **Document changes** in the Migration Log sheet
4. **Keep backups** before and after migrations

### Production Deployment

1. **Schedule migrations during low-usage times**
2. **Notify users** of pending changes
3. **Have rollback plan ready**
4. **Monitor for issues** after deployment

### Maintenance

1. **Regularly review migration logs**
2. **Clean up old migration files** when no longer needed
3. **Update documentation** when adding new migrations
4. **Test rollback procedures** periodically

## Support and Resources

### Google Apps Script Documentation
- [Apps Script Overview](https://developers.google.com/apps-script)
- [SpreadsheetApp Class](https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app)
- [Data Validation](https://developers.google.com/apps-script/reference/spreadsheet/data-validation-builder)

### Tonic Project Resources
- Main project README
- Migration documentation
- Development team contacts

### Getting Help

1. **Check the console logs** first
2. **Review this documentation**
3. **Contact the development team**
4. **Create an issue** in the project repository
