class Authenticator {
    static getSignedInUser() {
        let authenticatedUserEmail = null;

        try {
            authenticatedUserEmail = Session.getActiveUser().getEmail();
            console.log(`authenticatedUserEmail: ${authenticatedUserEmail}`);
        } catch (error) {
            console.error('Unable to get authenticated user email:', error);
            authenticatedUserEmail = null;
        }

        return authenticatedUserEmail;
    }

    static isAuthenticated() {
        return !!getSignedInUser();
    }
}