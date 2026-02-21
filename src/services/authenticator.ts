import type { Request } from 'express';

type AuthenticatedRequest = Request & {
  user?: {
    email?: string;
    accessToken?: string;
  } | null;
  isAuthenticated?: () => boolean;
};

export class Authenticator {
  static getSignedInUser(req: AuthenticatedRequest): string | null {
    if (!req || !req.user) {
      return null;
    }

    return req.user.email || null;
  }

  static isAuthenticated(req: AuthenticatedRequest): boolean {
    return !!(req && req.isAuthenticated && req.isAuthenticated());
  }

  static getAccessToken(req: AuthenticatedRequest): string | null {
    if (!req || !req.user) {
      return null;
    }

    return req.user.accessToken || null;
  }
}
