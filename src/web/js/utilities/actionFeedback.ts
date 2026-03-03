import type { HttpResult } from '../data/httpService.js';

interface FeedbackOptions {
  /** Optional inline status element for ⏳/✅/❌ indicators */
  statusElement?: HTMLElement | null;
  /** Toast message on success (null to skip) */
  successToast?: string | null;
  /** Toast message on failure (null to use error message from result) */
  failureToast?: string | null;
}

/**
 * Execute an async action with standardized feedback.
 * Handles inline status indicators (⏳→✅/❌) and Materialize toast messages.
 *
 * Usage:
 *   const result = await withFeedback(
 *     () => HttpService.patch(`registrations/${id}/intent`, { intent }),
 *     { statusElement: indicator, successToast: 'Intent updated!' }
 *   );
 *   if (result.ok) await this.reload();
 */
export async function withFeedback<T>(
  action: () => Promise<HttpResult<T>>,
  options: FeedbackOptions = {}
): Promise<HttpResult<T>> {
  const { statusElement, successToast, failureToast } = options;

  if (statusElement) {
    statusElement.textContent = '⏳ Saving...';
    statusElement.style.display = 'inline';
    statusElement.style.color = '';
  }

  const result = await action();

  if (result.ok) {
    if (statusElement) {
      statusElement.textContent = '✅ Saved';
      statusElement.style.color = 'green';
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 2000);
    }
    if (successToast && typeof M !== 'undefined') {
      M.toast({ html: successToast });
    }
  } else {
    if (statusElement) {
      statusElement.textContent = '❌ Error';
      statusElement.style.color = 'red';
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 3000);
    }
    const message = failureToast ?? result.error.message ?? 'An error occurred. Please try again.';
    if (typeof M !== 'undefined') {
      M.toast({ html: message });
    }
  }

  return result;
}
