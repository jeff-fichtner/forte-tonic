import { HttpService } from '../data/httpService.js';
import { UserSession } from '../auth/session.js';
import { formatPhone } from '../utilities/phoneHelpers.js';

/** Shape of the /api/version response */
export interface VersionInfo {
  number: string;
  environment: string;
  gitCommit: string;
  gitTag?: string;
  buildDate: string;
  displayVersion?: boolean;
}

const NodeEnv = {
  PRODUCTION: 'production',
  STAGING: 'staging',
  DEVELOPMENT: 'development',
  TEST: 'test',
};

export async function initializeVersionDisplay(): Promise<void> {
  try {
    const result = await HttpService.get<VersionInfo>('version');
    if (!result.ok) return;
    const versionInfo = result.data;

    window.TONIC_ENV = {
      environment: versionInfo.environment,
      isDevelopment: versionInfo.environment === NodeEnv.DEVELOPMENT,
      isStaging: versionInfo.environment === NodeEnv.STAGING,
      isProduction: versionInfo.environment === NodeEnv.PRODUCTION,
      version: versionInfo.number,
      gitCommit: versionInfo.gitCommit,
      NodeEnv,
    };

    console.log(
      `Tonic v${versionInfo.number} (${versionInfo.environment}) [${versionInfo.gitCommit.substring(0, 7)}]`
    );

    if (versionInfo.displayVersion) {
      const versionDisplay = document.getElementById('version-display');
      const versionNumber = document.getElementById('version-number-text');
      const versionEnv = document.getElementById('version-env');
      const versionCommit = document.getElementById('version-commit');

      if (versionDisplay && versionNumber && versionEnv && versionCommit) {
        versionNumber.textContent = versionInfo.number;
        versionEnv.textContent = versionInfo.environment.toUpperCase();
        versionCommit.textContent = versionInfo.gitCommit.substring(0, 7);

        versionDisplay.style.display = 'block';

        versionDisplay.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(versionInfo.gitCommit);
          } catch (error) {
            console.warn('Failed to copy commit ID:', error);
          }

          const details = `
Version: ${versionInfo.number}
${versionInfo.gitTag ? `Git Tag: ${versionInfo.gitTag}\n` : ''}Environment: ${versionInfo.environment}
Build Date: ${new Date(versionInfo.buildDate).toLocaleString()}
Git Commit: ${versionInfo.gitCommit}

✓ Commit ID copied to clipboard!
          `.trim();

          alert(details);
        });
      }
    }
  } catch (error) {
    // Don't throw - version display is not critical
  }
}

export function loadDirectorInfo(): void {
  const director = UserSession.getAppConfig()?.director;

  if (!director) {
    return;
  }

  const nameElement = document.getElementById('director-name');
  const emailElement = document.getElementById('director-email');
  const phoneElement = document.getElementById('director-phone');

  if (nameElement) nameElement.textContent = director.fullName;
  if (emailElement) emailElement.textContent = director.displayEmail || director.email;
  const rawPhone = director.displayPhone || director.phone || '';
  if (phoneElement) phoneElement.textContent = rawPhone ? formatPhone(rawPhone) : 'N/A';
}
