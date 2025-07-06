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
                    x => new Instructor(...x)),
            Keys.INSTRUCTORS);
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

    searchStudentsByName(name) {
        return this.dbClient.getFilteredRecords(
            Keys.STUDENTS,
            x => new Student(...x),
            x => x.firstName.toLowerCase().includes(name.toLowerCase()) || x.lastName.toLowerCase().includes(name.toLowerCase()));
    }

    getParents() {
        return RepositoryHelper.getAndSetData(
            () => this.parents,
            () => this.parents =
                this.dbClient.getAllRecords(
                    Keys.PARENTS,
                    x => new Parent(...x)),
            Keys.PARENTS);
    }

    getParentById(id) {
        return this.getParents().find(x => x.id === id);
    }

    getRooms() {
        return RepositoryHelper.getAndSetData(
            () => this.rooms,
            () => this.rooms =
                this.dbClient.getAllRecords(
                    Keys.ROOMS,
                    x => new Room(...x)),
            Keys.ROOMS);
    }

    getRoomById(id) {
        return this.getRooms().find(x => x.id === id);
    }
}
