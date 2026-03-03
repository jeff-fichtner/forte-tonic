/**
 * Page loading state — controls the loading spinner and error display.
 * Extracted from main.ts so auth modules can import directly
 * instead of routing through window events.
 */

export function setPageLoading(isLoading: boolean, errorMessage: string = ''): void {
  const loadingContainer = document.getElementById('page-loading-container');
  const pageContent = document.getElementById('page-content');
  const pageErrorContent = document.getElementById('page-error-content');
  const pageErrorContentMessage = document.getElementById('page-error-content-message');

  if (loadingContainer) {
    loadingContainer.style.display = isLoading ? 'flex' : 'none';
    loadingContainer.hidden = !isLoading;
  }

  if (pageContent) {
    pageContent.hidden = isLoading || !!errorMessage;
  }

  if (pageErrorContent) {
    pageErrorContent.hidden = !errorMessage;
  }
  if (pageErrorContentMessage) {
    pageErrorContentMessage.textContent = errorMessage;
  }
}
