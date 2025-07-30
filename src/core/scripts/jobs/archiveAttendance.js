function archiveAttendance() {
    // changes name on existing sheet to that week
    // creates new sheet

    this.settings = new Settings(false); // Assuming false for non-release mode
    this.dbClient = new GoogleDbClient(this.settings);

    this.dbClient.archiveSheet(Keys.ATTENDANCE);
}
