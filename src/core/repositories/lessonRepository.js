class LessonRepository {

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
          record => {
            const mappedClass = new Class(...record);

            mappedClass.instructor = this.getInstructorById_(mappedClass.instructorId);

            return mappedClass;
          }),
      Keys.CLASSES,
      () => this.getInstructors_());
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

  /*
  
    calculateRegistrationOptions(studentId, instrument, length) {
    }
      
    register(studentId, lessonId) {
    }
  
    unregister(studentId, lessonId) {
    }
  
   */

  getInstructors_() {
    if (!this.instructors) {
      const rooms = this.getRooms_(); // ensure rooms are loaded
      this.instructors =
        this.dbClient.getAllRecords(
          Keys.INSTRUCTORS,
          record => {
            const instructor = new Instructor(...record);

            instructor.mondayRoom = this.getRoomById_(instructor.mondayRoomId);
            instructor.tuesdayRoom = this.getRoomById_(instructor.tuesdayRoomId);
            instructor.wednesdayRoom = this.getRoomById_(instructor.wednesdayRoomId);
            instructor.thursdayRoom = this.getRoomById_(instructor.thursdayRoomId);
            instructor.fridayRoom = this.getRoomById_(instructor.fridayRoomId);

            return instructor;
          });
    }

    ErrorHandling.throwIfNo(this.instructors, `No instructors found`);
    return this.instructors;
  }

  getInstructorById_(id) {
    return this.getInstructors_().find(x => x.id === id);
  }

  getRooms_() {
    if (!this.rooms) {
      this.rooms =
        this.dbClient.getAllRecords(
          Keys.ROOMS,
          x => new Room(...x));
    }

    ErrorHandling.throwIfNo(this.rooms, `No rooms found`);
    return this.rooms;
  }

  getRoomById_(id) {
    return this.getRooms_().find(x => x.id === id);
  }
}
