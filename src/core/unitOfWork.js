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

    get lessonRepositoryInstance() {
        if (!this.lessonRepository) {
            this.lessonRepository = new LessonRepository(this.dbClient);
        }

        return this.lessonRepository;
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