/**
 *
 */
export class Authenticator {
  /**
   *
   */
  static getSignedInUser(req) {
    if (!req || !req.user) {
      return null;
    }

    return req.user.email;
  }

  /**
   *
   */
  static isAuthenticated(req) {
    return !!(req && req.isAuthenticated && req.isAuthenticated());
  }

  /**
   *
   */
  static getAccessToken(req) {
    if (!req || !req.user) {
      return null;
    }

    return req.user.accessToken;
  }
}
