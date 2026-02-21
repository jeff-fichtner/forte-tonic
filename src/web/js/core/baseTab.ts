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
 *   class MyTab extends BaseTab {
 *     constructor() {
 *       super('my-tab');
 *     }
 *
 *     async fetchData(sessionInfo) {
 *       const response = await fetch('/api/my-tab/data');
 *       return response.json();
 *     }
 *
 *     async render() {
 *       const container = this.getContainer();
 *       container.innerHTML = `<div>${this.data.message}</div>`;
 *     }
 *   }
 */

export interface SessionInfo {
  user?: Record<string, unknown>;
  userType?: string;
  [key: string]: unknown;
}

interface TrackedEventListener {
  element: Element;
  event: string;
  handler: EventListenerOrEventListenerObject;
  options: AddEventListenerOptions;
}

export class BaseTab {
  protected tabId: string;
  protected data: Record<string, unknown> | null;
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

    // Create abort controller for this load cycle
    this.abortController = new AbortController();

    try {
      // Show loading state
      this.showLoadingState(true);

      // Fetch tab-specific data
      this.data = await this.fetchData(sessionInfo);

      // Render the UI
      await this.render();

      // Attach event listeners
      this.attachEventListeners();

      this.isLoaded = true;
      this.showLoadingState(false);
    } catch (error: unknown) {
      // Don't log abort errors (user navigated away)
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error(`Error loading tab ${this.tabId}:`, error);
        this.showError(error);
      }

      this.showLoadingState(false);
      throw error;
    }
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
   * MUST be implemented by subclasses
   */
  async fetchData(_sessionInfo: SessionInfo | null): Promise<Record<string, unknown>> {
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
   * Show error message
   * Override in subclasses for custom error UI
   */
  showError(error: Error | unknown): void {
    const container = this.getContainer();
    const errorMessage =
      error instanceof Error ? error.message : 'An error occurred loading this tab';

    // Simple error display (override for better UI)
    container.innerHTML = `
      <div class="error-message" role="alert">
        <p><strong>Error:</strong> ${errorMessage}</p>
        <button onclick="location.reload()">Reload Page</button>
      </div>
    `;
  }

  /**
   * Reload this tab's data
   */
  async reload(): Promise<void> {
    // Cancel any in-flight requests
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();

    try {
      this.showLoadingState(true);

      // Fetch fresh data
      this.data = await this.fetchData(this.sessionInfo);

      // Re-render
      await this.render();

      this.showLoadingState(false);
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error(`Error reloading tab ${this.tabId}:`, error);
        this.showError(error);
      }
      this.showLoadingState(false);
      throw error;
    }
  }

  /**
   * Get abort signal for fetch requests
   * Use this in fetch() calls to support cancellation
   */
  getAbortSignal(): AbortSignal | undefined {
    return this.abortController?.signal;
  }

  /**
   * Find a student by ID from the tab's data
   */
  findStudent(studentId: string): Record<string, unknown> | undefined {
    if (!this.data?.students) return undefined;

    const idToFind = studentId;
    return (this.data.students as Record<string, unknown>[]).find(
      (student: Record<string, unknown>) => {
        const id = student.id;
        return id === idToFind;
      }
    );
  }

  /**
   * Find an instructor by ID from the tab's data
   */
  findInstructor(instructorId: string): Record<string, unknown> | undefined {
    if (!this.data?.instructors) return undefined;

    const idToFind = instructorId;
    return (this.data.instructors as Record<string, unknown>[]).find(
      (instructor: Record<string, unknown>) => {
        const id = instructor.id;
        return id === idToFind;
      }
    );
  }
}
