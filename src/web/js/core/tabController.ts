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
 *   controller.registerTab('instructor-directory', new EmployeeDirectoryTab());
 *   await controller.activateTab('instructor-directory');
 */

import type { BaseTab, SessionInfo } from './baseTab.js';

export class TabController {
  private tabs: Map<string, BaseTab>;
  private currentTab: BaseTab | null;
  private currentTabId: string | null;
  private sessionInfo: SessionInfo | null;
  private initialized: boolean;

  constructor(sessionInfo: SessionInfo | null = null) {
    this.tabs = new Map();
    this.currentTab = null;
    this.currentTabId = null;
    this.sessionInfo = sessionInfo;
    this.initialized = false;
  }

  /**
   * Initialize the tab controller
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('TabController already initialized');
      return;
    }

    this.initialized = true;
  }

  /**
   * Update session information (e.g., after login/logout)
   */
  updateSession(sessionInfo: SessionInfo | null): void {
    this.sessionInfo = sessionInfo;

    // Notify current tab of session change if needed
    if (this.currentTab && typeof this.currentTab.onSessionChange === 'function') {
      this.currentTab.onSessionChange(sessionInfo);
    }
  }

  /**
   * Register a tab instance
   */
  registerTab(tabId: string, tabInstance: BaseTab): void {
    if (!tabId || typeof tabId !== 'string') {
      throw new Error('Tab ID must be a non-empty string');
    }

    if (!tabInstance) {
      throw new Error('Tab instance is required');
    }

    // Validate that tab implements BaseTab interface
    const requiredMethods = ['onLoad', 'onUnload', 'fetchData', 'render'] as const;
    for (const method of requiredMethods) {
      if (typeof (tabInstance as unknown as Record<string, unknown>)[method] !== 'function') {
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
   */
  unregisterTab(tabId: string): boolean {
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
   */
  async activateTab(tabId: string, { forceReload = false } = {}): Promise<void> {
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

    // Unload current tab if any (when switching tabs OR force reloading same tab)
    if (this.currentTab && (this.currentTabId !== tabId || forceReload)) {
      try {
        await this.currentTab.onUnload();
      } catch (error) {
        console.error(`Error unloading tab "${this.currentTabId}":`, error);
        // Continue with activation even if unload fails
      }
    }

    // Activate new tab
    const newTab = this.tabs.get(tabId)!;
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
   */
  async reloadCurrentTab(): Promise<void> {
    if (!this.currentTabId) {
      console.warn('No tab is currently active');
      return;
    }

    await this.activateTab(this.currentTabId, { forceReload: true });
  }

  /**
   * Get the currently active tab instance
   */
  getCurrentTab(): BaseTab | null {
    return this.currentTab;
  }

  /**
   * Get the currently active tab ID
   */
  getCurrentTabId(): string | null {
    return this.currentTabId;
  }

  /**
   * Check if a tab is registered
   */
  isTabRegistered(tabId: string): boolean {
    return this.tabs.has(tabId);
  }

  /**
   * Get list of all registered tab IDs
   */
  getRegisteredTabIds(): string[] {
    return Array.from(this.tabs.keys());
  }

  /**
   * Cleanup all tabs (call before logout or page unload)
   */
  async cleanup(): Promise<void> {
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
