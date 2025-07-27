class UserRepository {

    constructor(dbClient) {
        this.dbClient = dbClient;
    }

    getAdmins(forceRefresh = false) {
        return RepositoryHelper.getAndSetData(
            () => this.admins,
            () => this.admins =
                this.dbClient.getAllRecords(
                    Keys.ADMINS,
                    x => new Admin(...x)),
            Keys.ADMINS,
            forceRefresh);
    }

    getAdminByEmail(email) {
        return this.getAdmins().find(x => x.email === email);
    }
    
    _getRoles(forceRefresh = false) {
        return RepositoryHelper.getAndSetData(
            () => this.roles,
            () => this.roles =
                this.dbClient.getAllRecords(
                    Keys.ROLES,
                    x => new Role(...x)),
            Keys.ROLES,
            forceRefresh);
    }

    getOperatorByEmail(email) {
        return this._getRoles().find(x => x.email === email && x.role === RoleType.OPERATOR);
    }

    getInstructors(forceRefresh = false) {
        return RepositoryHelper.getAndSetData(
            () => this.instructors,
            () => this.instructors =
                this.dbClient.getAllRecords(
                    Keys.INSTRUCTORS,
                    x => new Instructor(...x)),
            Keys.INSTRUCTORS,
            forceRefresh);
    }

    getInstructorById(id) {
        return this.getInstructors().find(x => x.id === id);
    }
    
    getInstructorByEmail(email) {
        return this.getInstructors().find(x => x.email === email);
    }

    getStudents(forceRefresh = false) {
        return RepositoryHelper.getAndSetData(
            () => this.students,
            () => this.students =
                this.dbClient.getAllRecords(
                    Keys.STUDENTS,
                    x => new Student(...x)),
            Keys.STUDENTS,
            forceRefresh);
    }

    getStudentById(id) {
        return this.getStudents().find(x => x.id === id);
    }

    getParents(forceRefresh = false) {
        return RepositoryHelper.getAndSetData(
            () => this.parents,
            () => this.parents =
                this.dbClient.getAllRecords(
                    Keys.PARENTS,
                    x => new Parent(...x)),
            Keys.PARENTS,
            forceRefresh);
    }

    getParentByEmail(email) {
        return this.getParents().find(x => x.email === email);
    }

    getRooms(forceRefresh = false) {
        return RepositoryHelper.getAndSetData(
            () => this.rooms,
            () => this.rooms =
                this.dbClient.getAllRecords(
                    Keys.ROOMS,
                    x => new Room(...x)),
            Keys.ROOMS,
            forceRefresh);
    }

    getRoomById(id) {
        return this.getRooms().find(x => x.id === id);
    }
}
