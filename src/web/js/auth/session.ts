import type {
  AppConfigurationResponse,
  Period,
} from '/models/shared/responses/appConfigurationResponse.js';
import { LoginType } from '/utils/values/loginType.js';

interface AccessCodeManagerShape {
  _accessCodeCache: { accessCode: string; loginType: string } | null;
  saveAccessCodeSecurely(accessCode: string, loginType?: string): void;
  generateSessionId(): string;
  getStoredAccessCode(): string | null;
  getStoredAuthData(): { accessCode: string; loginType: string } | null;
  clearStoredAccessCode(): boolean;
}

interface UserSessionShape {
  appConfig: AppConfigurationResponse | null;
  saveAppConfig(config: AppConfigurationResponse): void;
  getAppConfig(): AppConfigurationResponse | null;
  getCurrentPeriod(): Period | undefined;
  getNextPeriod(): Period | undefined;
  clearAppConfig(): void;
  hasAcceptedTermsOfService(): boolean;
  acceptTermsOfService(): void;
  unacceptTermsOfService(): void;
}

export const AccessCodeManager: AccessCodeManagerShape = {
  _accessCodeCache: null as { accessCode: string; loginType: string } | null,

  saveAccessCodeSecurely(accessCode: string, loginType: string = LoginType.EMPLOYEE): void {
    try {
      const secureData = {
        accessCode: accessCode,
        loginType: loginType,
        sessionId: this.generateSessionId(),
      };

      const encodedData = btoa(JSON.stringify(secureData));
      localStorage.setItem('forte_auth_session', encodedData);
    } catch (error) {
      console.error('Failed to save access code securely:', error);
      this._accessCodeCache = {
        accessCode: accessCode,
        loginType: loginType,
      };
    }
  },

  generateSessionId(): string {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  getStoredAccessCode(): string | null {
    const authData = this.getStoredAuthData();
    return authData?.accessCode || null;
  },

  getStoredAuthData(): { accessCode: string; loginType: string } | null {
    try {
      const encodedData = localStorage.getItem('forte_auth_session');
      if (!encodedData) {
        if (!this._accessCodeCache) {
          return null;
        }
        if (!this._accessCodeCache.loginType) {
          console.error('loginType not found in access code cache');
          return null;
        }
        return {
          accessCode: this._accessCodeCache.accessCode,
          loginType: this._accessCodeCache.loginType,
        };
      }

      const secureData = JSON.parse(atob(encodedData));

      if (!secureData.loginType) {
        console.error('loginType not found in stored auth data');
        return null;
      }

      return {
        accessCode: secureData.accessCode,
        loginType: secureData.loginType,
      };
    } catch (error) {
      console.error('Failed to retrieve stored auth data:', error);
      if (!this._accessCodeCache) {
        return null;
      }
      if (!this._accessCodeCache.loginType) {
        console.error('loginType not found in access code cache');
        return null;
      }
      return {
        accessCode: this._accessCodeCache.accessCode,
        loginType: this._accessCodeCache.loginType,
      };
    }
  },

  clearStoredAccessCode(): boolean {
    try {
      localStorage.removeItem('forte_auth_session');
      this._accessCodeCache = null;
      return true;
    } catch (error) {
      console.error('Failed to clear stored access code:', error);
      return false;
    }
  },
};

export const UserSession: UserSessionShape = {
  appConfig: null as AppConfigurationResponse | null,

  saveAppConfig(config: AppConfigurationResponse): void {
    this.appConfig = config;
  },

  getAppConfig(): AppConfigurationResponse | null {
    return this.appConfig;
  },

  getCurrentPeriod(): Period | undefined {
    return this.appConfig?.currentPeriod ?? undefined;
  },

  getNextPeriod(): Period | undefined {
    return this.appConfig?.nextPeriod ?? undefined;
  },

  clearAppConfig(): void {
    this.appConfig = null;
  },

  hasAcceptedTermsOfService(): boolean {
    return localStorage.getItem('hasAcceptedTermsOfService') === 'true';
  },

  acceptTermsOfService(): void {
    localStorage.setItem('hasAcceptedTermsOfService', 'true');
  },

  unacceptTermsOfService(): void {
    localStorage.removeItem('hasAcceptedTermsOfService');
  },
};
