function setWeek() {
    this.settings = new Settings(false); // true for prod
    this.dbClient = new GoogleDbClient(this.settings);

    this.dbClient.archiveSheet(Keys.ATTENDANCE);
}
