class UserRepository {

    constructor(dbClient) {
        this.dbClient = dbClient;
    }

    getAdmins() {
        return RepositoryHelper.getAndSetData(
            () => this.admins,
            () => this.admins =
                this.dbClient.getAllRecords(
                    Keys.ADMINS,
                    x => new Admin(...x)),
            Keys.ADMINS);
    }

    getAdminById(id) {
        return this.getAdmins().find(x => x.id === id);
    }

    isAdmin(id) {
        return id && this.getAdminById(id);
    }

    getInstructors() {
        return RepositoryHelper.getAndSetData(
            () => this.instructors,
            () => this.instructors =
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
                    }),
            Keys.INSTRUCTORS,
            () => this.getRooms_());
    }

    getInstructorById(id) {
        return this.getInstructors().find(x => x.id === id);
    }

    getStudents() {
        return RepositoryHelper.getAndSetData(
            () => this.students,
            () => this.students =
                this.dbClient.getAllRecords(
                    Keys.STUDENTS,
                    x => new Student(...x)),
            Keys.STUDENTS);
    }

    getStudentById(id) {
        return this.getStudents().find(x => x.id === id);
    }

    getParents() {
        return RepositoryHelper.getAndSetData(
            () => this.parents,
            () => this.parents =
                this.dbClient.getAllRecords(
                    Keys.PARENTS,
                    record => {
                        const parent = new Parent(...record);
                        parent.students = this.getStudents().filter(x => x.parent1Id === parent.id || x.parent2Id === parent.id);
                        return parent;
                    }),
            Keys.PARENTS,
            () => this.getStudents());
    }

    getParentById(id) {
        return this.getParents().find(x => x.id === id);
    }

    getRooms_() {
        return RepositoryHelper.getAndSetData(
            () => this.rooms,
            () => this.rooms =
                this.dbClient.getAllRecords(
                    Keys.ROOMS,
                    x => new Room(...x)),
            Keys.ROOMS);
    }

    getRoomById_(id) {
        return this.getRooms_().find(x => x.id === id);
    }
}
