# Google Apps Script Deployment Guide

This guide walks you through setting up and deploying the Tonic database migrations as Google Apps Script functions using clasp CLI.

## Prerequisites

- Google account with access to Google Sheets and Apps Script
- Node.js and npm installed
- The Google Sheets document you want to migrate
- Administrative access to the spreadsheet

## Step-by-Step Setup

### 1. Install clasp CLI

```bash
npm install -g @google/clasp
```

### 2. Authenticate with Google

```bash
clasp login
```

### 3. Set Up Environment Variables

In the parent directory's `.env` file, add your Google Apps Script project ID:

```bash
GOOGLE_APPS_SCRIPT_ID=your-google-apps-script-project-id
```

### 4. Initial Deployment

From the `gas-src/` directory:

```bash
npm run deploy
```

This command will:
- Generate the `.clasp.json` configuration file
- Deploy all migration files to your Google Apps Script project

### 5. Subsequent Updates

After making changes to any migration files, deploy updates with:

```bash
clasp push
```

Or use the npm script:

```bash
npm run deploy
```

### 6. Open the Project

To open your Google Apps Script project in the browser:

```bash
npm run open
```

### 7. Running Migrations

Once deployed, you can run migrations directly in the Google Apps Script editor:
1. **Select a preview function** in the function dropdown
2. **Run the preview** to see what changes will be made
3. **Review the logs** to understand the impact
4. **Run the actual migration** if the preview looks correct
5. **Verify results** in your spreadsheet

#### Available Migration Functions

Each migration provides three main functions:

- `preview[MigrationName]()` - Shows what will change (safe, read-only)
- `run[MigrationName]()` - Executes the migration
- `rollback[MigrationName]()` - Reverts the migration (uses automatic backups)

#### Backup and Restore System

All migrations now include automatic backup functionality:

- **Automatic Backups**: Created before any migration runs
- **Restore from Backup**: `restore[MigrationName]FromBackup()` - Restores data and deletes backup
- **Delete Backup**: `delete[MigrationName]Backup()` - Removes backup without restoring

### 8. Best Practices

1. **Always run preview first** to understand what will change
2. **Backup your spreadsheet** manually before running destructive migrations
3. **Test in a copy** of your spreadsheet first
4. **Review logs** after each migration to ensure success
5. **Use rollback functions** if you need to undo changes

### 9. Troubleshooting

#### Common Issues

**"Spreadsheet ID not configured"**
- Ensure `GLOBAL_SPREADSHEET_ID` is set in `Config.js`
- Check that the ID matches your actual spreadsheet ID

**"Permission denied"**
- Make sure you have edit access to the spreadsheet
- Re-run the authorization process

**"Function not found"**
- Ensure all files were deployed with `clasp push`
- Check that function names match exactly

#### Getting Help

If you encounter issues:
1. Check the execution logs in Google Apps Script
2. Verify the spreadsheet ID is correct
3. Ensure you have the necessary permissions
4. Try running a preview function first to test connectivity

### 10. Development Workflow

For developers making changes to migrations:

1. **Edit files locally** in the `gas-src/` directory
2. **Deploy changes** with `clasp push`
3. **Test in Google Apps Script** editor
4. **Commit changes** to version control

This workflow ensures consistency between local development and the deployed Google Apps Script project.
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
