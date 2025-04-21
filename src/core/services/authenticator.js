class Authenticator {
    static getSignedInUser() {
        let authenticatedUserEmail = null;

        try {
            authenticatedUserEmail = Session.getActiveUser().getEmail();
            console.log(`authenticatedUserEmail: ${authenticatedUserEmail}`);
        } catch (error) {
            console.error('Error getting authenticated user email:', error);
            authenticatedUserEmail = null;
        }

        return authenticatedUserEmail;
    }
}