class UnitOfWork {

    constructor() {
        this.settings = new Settings(this.isRelease_());
        this.dbClient = new GoogleDbClient(this.settings);
    }

    get userRepositoryInstance() {
        if (!this.userRepository) {
            this.userRepository = new UserRepository(this.dbClient);
        }

        return this.userRepository;
    }

    get programRepositoryInstance() {
        if (!this.programRepository) {
            this.programRepository = new ProgramRepository(this.dbClient);
        }

        return this.programRepository;
    }

    isRelease_() {
        return false;
        // TODO release config
        // if (!this.release) {
        //     this.release = ;
        // }

        // return this.release;
    }
}