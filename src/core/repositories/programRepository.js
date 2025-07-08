class ProgramRepository {

  constructor(dbClient) {
    this.dbClient = dbClient;
  }

  initialize() {
    const classes = this.getClasses();
    ErrorHandling.throwIfNo(classes, `No classes found`);

    const registrations = this.getRegistrations();
    ErrorHandling.throwIfNo(registrations, `No registrations found`);
  }

  getClasses() {
    return RepositoryHelper.getAndSetData(
      () => this.classes,
      () => this.classes =
        this.dbClient.getAllRecords(
          Keys.CLASSES,
          x => new Class(...x)),
      Keys.CLASSES);
  }

  getClassById(id) {
    return this.getClasses().find(x => x.Id === id);
  }

  getRegistrations() {
    return RepositoryHelper.getAndSetData(
      () => this.registrations,
      () => this.registrations =
        this.dbClient.getAllRecords(
          Keys.REGISTRATIONS,
          x => new Registration(...x)),
      Keys.REGISTRATIONS);
  }

  getRegistrationById(id) {
    return this.getRegistrations().find(x => x.id === id);
  }

  register(studentId, registration) {
    ErrorHandling.throwIfNo(studentId, `Student ID is required`);
    ErrorHandling.throwIfNo(registration, `Registration data is required`);

    const registrations = this.getRegistrations();
    const newRegistration = new Registration(studentId, registration);
    
    registrations.push(newRegistration);
    this.dbClient.saveRecord(Keys.REGISTRATIONS, newRegistration);

    return newRegistration;
  }
  /*
  
    calculateRegistrationOptions(studentId, instrument, length) {
    }
      
  
    unregister(studentId, lessonId) {
    }
  
   */
}
