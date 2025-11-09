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

export class BaseTab {
  /**
   * @param {string} tabId - HTML element ID for this tab's container
   */
  constructor(tabId) {
    if (!tabId || typeof tabId !== 'string') {
      throw new Error('Tab ID is required');
    }

    /** @protected {string} Tab's container element ID */
    this.tabId = tabId;

    /** @protected {Object|null} Tab-specific data */
    this.data = null;

    /** @protected {Object|null} User session information */
    this.sessionInfo = null;

    /** @protected {boolean} Whether tab is currently loaded */
    this.isLoaded = false;

    /** @protected {AbortController|null} For cancelling fetch requests */
    this.abortController = null;

    /** @protected {Function[]} Event listeners to clean up */
    this.eventListeners = [];
  }

  /**
   * Called when tab becomes active
   * Orchestrates the tab loading sequence
   *
   * @param {Object} sessionInfo - User session information
   * @param {Object} sessionInfo.user - Current user object
   * @param {string} sessionInfo.userType - 'admin' | 'instructor' | 'parent'
   * @returns {Promise<void>}
   */
  async onLoad(sessionInfo = null) {
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
    } catch (error) {
      // Don't log abort errors (user navigated away)
      if (error.name !== 'AbortError') {
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
   *
   * @returns {Promise<void>}
   */
  async onUnload() {
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
   *
   * @param {Object} sessionInfo - User session information
   * @returns {Promise<Object>} Tab data
   * @throws {Error} If not implemented
   */
  async fetchData(sessionInfo) {
    throw new Error(`fetchData() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Render the tab's UI
   * MUST be implemented by subclasses
   *
   * @returns {Promise<void>}
   * @throws {Error} If not implemented
   */
  async render() {
    throw new Error(`render() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Attach event listeners for tab interactions
   * Override in subclasses if needed
   *
   * @returns {void}
   */
  attachEventListeners() {
    // Default: no event listeners
    // Override in subclasses
  }

  /**
   * Remove all event listeners
   * Automatically called during onUnload()
   *
   * @returns {void}
   */
  removeEventListeners() {
    // Remove all tracked event listeners
    for (const { element, event, handler, options } of this.eventListeners) {
      element.removeEventListener(event, handler, options);
    }
    this.eventListeners = [];
  }

  /**
   * Add an event listener and track it for cleanup
   *
   * @param {Element} element - DOM element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - Event listener options
   */
  addEventListener(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options);
    this.eventListeners.push({ element, event, handler, options });
  }

  /**
   * Custom cleanup logic (override in subclasses if needed)
   * Called during onUnload()
   *
   * @returns {Promise<void>}
   */
  async cleanup() {
    // Default: no cleanup needed
    // Override in subclasses for custom cleanup
  }

  /**
   * Called when session changes (e.g., user switches role)
   * Override in subclasses if tab needs to react to session changes
   *
   * @param {Object} sessionInfo - New session information
   * @returns {void}
   */
  onSessionChange(sessionInfo) {
    this.sessionInfo = sessionInfo;
    // Override in subclasses if needed
  }

  /**
   * Get the tab's container element
   *
   * @returns {HTMLElement}
   * @throws {Error} If container not found
   */
  getContainer() {
    const container = document.getElementById(this.tabId);
    if (!container) {
      throw new Error(`Tab container not found: ${this.tabId}`);
    }
    return container;
  }

  /**
   * Show/hide loading state
   * Override in subclasses for custom loading UI
   *
   * @param {boolean} isLoading - Whether to show loading state
   */
  showLoadingState(isLoading) {
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
   *
   * @param {Error} error - Error to display
   */
  showError(error) {
    const container = this.getContainer();
    const errorMessage = error?.message || 'An error occurred loading this tab';

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
   *
   * @returns {Promise<void>}
   */
  async reload() {
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
    } catch (error) {
      if (error.name !== 'AbortError') {
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
   *
   * @returns {AbortSignal|undefined}
   */
  getAbortSignal() {
    return this.abortController?.signal;
  }

  /**
   * Find a student by ID from the tab's data
   * @protected
   * @param {string|Object} studentId - Student ID (string or object with .value)
   * @returns {Object|undefined} Student object or undefined if not found
   */
  findStudent(studentId) {
    if (!this.data?.students) return undefined;

    const idToFind = studentId?.value || studentId;
    return this.data.students.find(student => {
      const id = student.id?.value || student.id;
      return id === idToFind;
    });
  }

  /**
   * Find an instructor by ID from the tab's data
   * @protected
   * @param {string|Object} instructorId - Instructor ID (string or object with .value)
   * @returns {Object|undefined} Instructor object or undefined if not found
   */
  findInstructor(instructorId) {
    if (!this.data?.instructors) return undefined;

    const idToFind = instructorId?.value || instructorId;
    return this.data.instructors.find(instructor => {
      const id = instructor.id?.value || instructor.id;
      return id === idToFind;
    });
  }
}
