class UserRepository {
    
    constructor(dbClient) {
        this.dbClient = dbClient;
        this.initialize_();
    }

    getSignedInUser() {
        this.throwIfNoUser_();

        return this.authenticatedUser;
    }

    isAuthenticated() {
        return !!this.authenticatedUser;
    }

    isAdmin() {
        this.throwIfNoUser_();
        this.throwIfNoAdmins_();

        return isAuthenticated() && this.admins.includes(this.authenticatedUser);
    }

    addUsers(users) {
        this.users = this.users.concat(users);
    }

    findUserById(id) {
        return this.users.find(user => user.id === id);
    }
    
    initialize_() {
        // set authenticated user
        this.authenticatedUser = Authenticator.getSignedInUser();
        this.throwIfNoUser_();

        // get admins
        // this.admins = this.dbClient.getAdminEmails();
        // this.throwIfNoAdmins_();
        
        // // get users
        // this.users = this.dbClient.getAllUsers();
        // throwIfNoPeople_();
    }

    throwIfNoUser_() {
        if (!this.authenticatedUser) {
            throw new Error('No authenticated user found');
        }
    }

    throwIfNoAdmins_() {
        if (!this.admins || this.admins.length === 0) {
            throw new Error('No admins found');
        }
    }

    throwIfNoPeople_() {
        if (!this.users || this.users.length === 0) {
            throw new Error('No users found');
        }
    }
}