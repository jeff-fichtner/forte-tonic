import { isEnrollmentPeriod } from './periodHelpers.js';

export interface TrimesterContext {
  currentTrimester: string;
  nextTrimester: string | null;
  showBothTrimesters: boolean;
}

/**
 * Resolve the selected trimester from a button selector + period fallback.
 * Used by admin and instructor tabs that have trimester button groups.
 *
 * Checks for an active .trimester-btn in the given container, then falls back
 * to window.UserSession.getCurrentPeriod().trimester.
 */
export function resolveSelectedTrimester(buttonContainerId: string): string | null {
  const container = document.getElementById(buttonContainerId);
  const activeButton = container?.querySelector<HTMLElement>('.trimester-btn.active');
  const currentPeriod = window.UserSession?.getCurrentPeriod();
  return activeButton?.dataset.trimester || currentPeriod?.trimester || null;
}

/**
 * Resolve current and optional next trimester for parent tabs.
 * During enrollment periods, parents see both current and next trimester data.
 *
 * Returns null if period information is not available.
 */
export function resolveParentTrimesters(): TrimesterContext | null {
  const currentPeriod = window.UserSession?.getCurrentPeriod();
  const appConfig = window.UserSession?.getAppConfig();

  if (!currentPeriod) return null;

  const currentTrimester = appConfig?.currentTrimester || currentPeriod.trimester || '';

  if (isEnrollmentPeriod(currentPeriod)) {
    return {
      currentTrimester,
      nextTrimester: appConfig?.nextTrimester || currentPeriod.trimester || '',
      showBothTrimesters: true,
    };
  }

  return {
    currentTrimester,
    nextTrimester: null,
    showBothTrimesters: false,
  };
}
