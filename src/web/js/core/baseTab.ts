/**
 * BaseTab - Abstract base class for all tab implementations
 *
 * All tabs must extend this class and implement:
 * - fetchData(): Fetch tab-specific data from API
 * - render(): Render the tab's UI with the data
 *
 * Lifecycle:
 * 1. onLoad() is called when tab becomes active
 *    - Calls fetchData()
 *    - Calls render()
 *    - Calls attachEventListeners()
 * 2. onUnload() is called when tab becomes inactive
 *    - Calls cleanup()
 *    - Removes event listeners
 *
 * Usage:
 *   interface MyData { items: Item[]; }
 *   class MyTab extends BaseTab<MyData> {
 *     constructor() { super('my-tab'); }
 *     async fetchData(sessionInfo) { ... }
 *     async render() {
 *       // this.data is MyData | null — no casting needed
 *     }
 *   }
 */

import type { HttpResult } from '../data/httpService.js';
import type { AuthenticatedUser } from '../auth/session.js';

export interface SessionInfo {
  user?: AuthenticatedUser;
  userType?: string;
  [key: string]: unknown;
}

/** Extract parent ID from session, or null */
export function getParentId(sessionInfo: SessionInfo | null): string | null {
  return sessionInfo?.user?.parent?.id ?? null;
}

/** Extract instructor ID from session, or null */
export function getInstructorId(sessionInfo: SessionInfo | null): string | null {
  return sessionInfo?.user?.instructor?.id ?? null;
}

interface TrackedEventListener {
  element: Element;
  event: string;
  handler: EventListenerOrEventListenerObject;
  options: AddEventListenerOptions;
}

export class BaseTab<TData = Record<string, unknown>> {
  protected tabId: string;
  protected data: TData | null;
  protected sessionInfo: SessionInfo | null;
  protected isLoaded: boolean;
  protected abortController: AbortController | null;
  protected eventListeners: TrackedEventListener[];

  constructor(tabId: string) {
    if (!tabId || typeof tabId !== 'string') {
      throw new Error('Tab ID is required');
    }

    this.tabId = tabId;
    this.data = null;
    this.sessionInfo = null;
    this.isLoaded = false;
    this.abortController = null;
    this.eventListeners = [];
  }

  /**
   * Called when tab becomes active
   * Orchestrates the tab loading sequence
   */
  async onLoad(sessionInfo: SessionInfo | null = null): Promise<void> {
    if (this.isLoaded) {
      console.warn(`Tab ${this.tabId} is already loaded`);
      return;
    }

    this.sessionInfo = sessionInfo;
    this.abortController = new AbortController();
    this.showLoadingState(true);

    const result = await this.fetchData(sessionInfo);

    if (!result.ok) {
      this.showLoadingState(false);
      this.showError(result.error.message);
      return;
    }

    this.data = result.data;

    await this.render();
    this.attachEventListeners();

    this.isLoaded = true;
    this.showLoadingState(false);
  }

  /**
   * Called when tab becomes inactive
   * Cleans up resources and removes event listeners
   */
  async onUnload(): Promise<void> {
    if (!this.isLoaded) {
      return;
    }

    // Cancel any in-flight requests
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Remove all event listeners
    this.removeEventListeners();

    // Call custom cleanup
    await this.cleanup();

    // Clear data
    this.data = null;
    this.sessionInfo = null;
    this.isLoaded = false;
  }

  /**
   * Fetch tab-specific data from API
   * MUST be implemented by subclasses — return HttpResult, never throw
   */
  async fetchData(_sessionInfo: SessionInfo | null): Promise<HttpResult<TData>> {
    throw new Error(`fetchData() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Render the tab's UI
   * MUST be implemented by subclasses
   */
  async render(): Promise<void> {
    throw new Error(`render() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Attach event listeners for tab interactions
   * Override in subclasses if needed
   */
  attachEventListeners(): void {
    // Default: no event listeners
    // Override in subclasses
  }

  /**
   * Remove all event listeners
   * Automatically called during onUnload()
   */
  removeEventListeners(): void {
    // Remove all tracked event listeners
    for (const { element, event, handler, options } of this.eventListeners) {
      element.removeEventListener(event, handler, options);
    }
    this.eventListeners = [];
  }

  /**
   * Add an event listener and track it for cleanup
   */
  addEventListener(
    element: Element,
    event: string,
    handler: EventListenerOrEventListenerObject,
    options: AddEventListenerOptions = {}
  ): void {
    element.addEventListener(event, handler, options);
    this.eventListeners.push({ element, event, handler, options });
  }

  /**
   * Custom cleanup logic (override in subclasses if needed)
   * Called during onUnload()
   */
  async cleanup(): Promise<void> {
    // Default: no cleanup needed
    // Override in subclasses for custom cleanup
  }

  /**
   * Called when session changes (e.g., user switches role)
   * Override in subclasses if tab needs to react to session changes
   */
  onSessionChange(sessionInfo: SessionInfo | null): void {
    this.sessionInfo = sessionInfo;
    // Override in subclasses if needed
  }

  /**
   * Get the tab's container element
   */
  getContainer(): HTMLElement {
    const container = document.getElementById(this.tabId);
    if (!container) {
      throw new Error(`Tab container not found: ${this.tabId}`);
    }
    return container;
  }

  /**
   * Show/hide loading state
   * Override in subclasses for custom loading UI
   */
  showLoadingState(isLoading: boolean): void {
    const container = this.getContainer();

    if (isLoading) {
      // Add loading class or spinner
      container.classList.add('tab-loading');
      container.setAttribute('aria-busy', 'true');
    } else {
      container.classList.remove('tab-loading');
      container.removeAttribute('aria-busy');
    }
  }

  /**
   * Show an inline error banner inside the tab container.
   * Includes a retry button that re-runs fetchData + render.
   * Override in subclasses for custom error UI.
   */
  showError(message: string): void {
    const container = this.getContainer();

    container.innerHTML = `
      <div class="tab-error-banner" role="alert" style="margin: 16px; padding: 12px 16px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828; display: flex; align-items: center; gap: 12px;">
        <i class="material-icons" style="flex-shrink: 0;">error_outline</i>
        <span style="flex: 1;">${message}</span>
        <button class="btn-flat red-text tab-error-retry" type="button" style="flex-shrink: 0;">Retry</button>
      </div>
    `;

    container.querySelector('.tab-error-retry')?.addEventListener('click', () => {
      this.reload();
    });
  }

  /**
   * Remove the inline error banner if present
   */
  clearError(): void {
    const container = this.getContainer();
    const banner = container.querySelector('.tab-error-banner');
    if (banner) {
      banner.remove();
    }
  }

  /**
   * Reload this tab's data
   */
  async reload(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();
    this.isLoaded = false;
    this.clearError();
    this.showLoadingState(true);

    const result = await this.fetchData(this.sessionInfo);

    if (!result.ok) {
      this.showLoadingState(false);
      this.showError(result.error.message);
      return;
    }

    this.data = result.data;
    await this.render();
    this.isLoaded = true;
    this.showLoadingState(false);
  }

  /**
   * Get abort signal for fetch requests
   * Use this in fetch() calls to support cancellation
   */
  getAbortSignal(): AbortSignal | undefined {
    return this.abortController?.signal;
  }
}
