/**
 * TabController - Manages the lifecycle of tab-based views
 *
 * Responsibilities:
 * - Register tab instances (must implement BaseTab interface)
 * - Handle tab activation/deactivation
 * - Manage tab lifecycle (onLoad/onUnload)
 * - Coordinate with NavTabs component
 * - Maintain session context for tabs
 *
 * Usage:
 *   const controller = new TabController();
 *   controller.registerTab('instructor-directory', new InstructorDirectoryTab());
 *   await controller.activateTab('instructor-directory');
 */

export class TabController {
  /**
   * @param {object} sessionInfo - User session information
   * @param {object} sessionInfo.user - Current user (admin/instructor/parent)
   * @param {string} sessionInfo.userType - 'admin' | 'instructor' | 'parent'
   */
  constructor(sessionInfo = null) {
    /** @private {Map<string, BaseTab>} Registered tab instances */
    this.tabs = new Map();

    /** @private {BaseTab|null} Currently active tab */
    this.currentTab = null;

    /** @private {string|null} ID of currently active tab */
    this.currentTabId = null;

    /** @private {Object|null} User session information */
    this.sessionInfo = sessionInfo;

    /** @private {boolean} Whether controller is initialized */
    this.initialized = false;
  }

  /**
   * Initialize the tab controller
   * @returns {void}
   */
  initialize() {
    if (this.initialized) {
      console.warn('TabController already initialized');
      return;
    }

    this.initialized = true;
  }

  /**
   * Update session information (e.g., after login/logout)
   * @param {object | null} sessionInfo - New session info or null to clear
   */
  updateSession(sessionInfo) {
    this.sessionInfo = sessionInfo;

    // Notify current tab of session change if needed
    if (this.currentTab && typeof this.currentTab.onSessionChange === 'function') {
      this.currentTab.onSessionChange(sessionInfo);
    }
  }

  /**
   * Register a tab instance
   *
   * @param {string} tabId - Unique tab identifier (matches HTML element ID)
   * @param {BaseTab} tabInstance - Tab instance (must extend BaseTab)
   * @throws {Error} If tab doesn't implement required methods
   */
  registerTab(tabId, tabInstance) {
    if (!tabId || typeof tabId !== 'string') {
      throw new Error('Tab ID must be a non-empty string');
    }

    if (!tabInstance) {
      throw new Error('Tab instance is required');
    }

    // Validate that tab implements BaseTab interface
    const requiredMethods = ['onLoad', 'onUnload', 'fetchData', 'render'];
    for (const method of requiredMethods) {
      if (typeof tabInstance[method] !== 'function') {
        throw new Error(`Tab "${tabId}" must implement ${method}() method (BaseTab interface)`);
      }
    }

    if (this.tabs.has(tabId)) {
      console.warn(`Tab "${tabId}" is already registered. Overwriting.`);
    }

    this.tabs.set(tabId, tabInstance);
  }

  /**
   * Unregister a tab
   * @param {string} tabId - Tab to unregister
   * @returns {boolean} True if tab was unregistered
   */
  unregisterTab(tabId) {
    if (!this.tabs.has(tabId)) {
      console.warn(`Cannot unregister tab "${tabId}" - not registered`);
      return false;
    }

    // Unload tab if it's currently active
    if (this.currentTabId === tabId && this.currentTab) {
      this.currentTab.onUnload();
      this.currentTab = null;
      this.currentTabId = null;
    }

    this.tabs.delete(tabId);
    return true;
  }

  /**
   * Activate a tab (load its data and render)
   *
   * @param {string} tabId - Tab to activate
   * @param {object} options - Activation options
   * @param {boolean} options.forceReload - Force reload even if already active
   * @returns {Promise<void>}
   * @throws {Error} If tab is not registered
   */
  async activateTab(tabId, { forceReload = false } = {}) {
    if (!this.initialized) {
      throw new Error('TabController not initialized. Call initialize() first.');
    }

    if (!this.tabs.has(tabId)) {
      throw new Error(
        `Cannot activate tab "${tabId}" - not registered. Available tabs: ${Array.from(this.tabs.keys()).join(', ')}`
      );
    }

    // If same tab is already active and not forcing reload, do nothing
    if (this.currentTabId === tabId && !forceReload) {
      return;
    }

    // Unload current tab if any
    if (this.currentTab && this.currentTabId !== tabId) {
      try {
        await this.currentTab.onUnload();
      } catch (error) {
        console.error(`Error unloading tab "${this.currentTabId}":`, error);
        // Continue with activation even if unload fails
      }
    }

    // Activate new tab
    const newTab = this.tabs.get(tabId);
    this.currentTabId = tabId;
    this.currentTab = newTab;

    try {
      // Call tab's onLoad lifecycle method
      await newTab.onLoad(this.sessionInfo);
    } catch (error) {
      console.error(`Error activating tab "${tabId}":`, error);
      this.currentTabId = null;
      this.currentTab = null;
      throw error;
    }
  }

  /**
   * Reload the current tab
   * @returns {Promise<void>}
   */
  async reloadCurrentTab() {
    if (!this.currentTabId) {
      console.warn('No tab is currently active');
      return;
    }

    await this.activateTab(this.currentTabId, { forceReload: true });
  }

  /**
   * Get the currently active tab instance
   * @returns {BaseTab|null}
   */
  getCurrentTab() {
    return this.currentTab;
  }

  /**
   * Get the currently active tab ID
   * @returns {string|null}
   */
  getCurrentTabId() {
    return this.currentTabId;
  }

  /**
   * Check if a tab is registered
   * @param {string} tabId - Tab ID to check
   * @returns {boolean}
   */
  isTabRegistered(tabId) {
    return this.tabs.has(tabId);
  }

  /**
   * Get list of all registered tab IDs
   * @returns {string[]}
   */
  getRegisteredTabIds() {
    return Array.from(this.tabs.keys());
  }

  /**
   * Cleanup all tabs (call before logout or page unload)
   * @returns {Promise<void>}
   */
  async cleanup() {
    // Unload current tab
    if (this.currentTab) {
      try {
        await this.currentTab.onUnload();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }

    this.currentTab = null;
    this.currentTabId = null;
    this.sessionInfo = null;
    this.initialized = false;
  }
}
