/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { TabController } from '../../../src/web/js/core/tabController.js';
import { BaseTab } from '../../../src/web/js/core/baseTab.js';

/**
 * Mock tab for testing
 */
class MockTab extends BaseTab {
  constructor(tabId) {
    super(tabId);
    this.fetchDataCalled = false;
    this.renderCalled = false;
    this.onLoadCalled = false;
    this.onUnloadCalled = false;
  }

  async fetchData(sessionInfo) {
    this.fetchDataCalled = true;
    return { message: 'Test data', sessionInfo };
  }

  async render() {
    this.renderCalled = true;
  }

  async onLoad(sessionInfo) {
    this.onLoadCalled = true;
    await super.onLoad(sessionInfo);
  }

  async onUnload() {
    this.onUnloadCalled = true;
    await super.onUnload();
  }
}

/**
 * Invalid tab (missing required methods)
 */
class InvalidTab {
  constructor() {
    this.tabId = 'invalid-tab';
  }
}

describe('TabController', () => {
  let controller;
  let mockTab;
  let sessionInfo;

  beforeEach(() => {
    sessionInfo = {
      user: { id: '123', name: 'Test User' },
      userType: 'admin',
    };

    controller = new TabController(sessionInfo);
    mockTab = new MockTab('test-tab');

    // Create container in DOM
    document.body.innerHTML = '<div id="test-tab"></div>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    it('should initialize with empty tabs map', () => {
      expect(controller.tabs.size).toBe(0);
    });

    it('should store session info', () => {
      expect(controller.sessionInfo).toBe(sessionInfo);
    });

    it('should initialize with no current tab', () => {
      expect(controller.currentTab).toBeNull();
      expect(controller.currentTabId).toBeNull();
    });

    it('should not be initialized yet', () => {
      expect(controller.initialized).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should set initialized flag', () => {
      controller.initialize();
      expect(controller.initialized).toBe(true);
    });

    it('should warn if already initialized', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      controller.initialize();
      controller.initialize();
      expect(consoleSpy).toHaveBeenCalledWith('TabController already initialized');
      consoleSpy.mockRestore();
    });
  });

  describe('registerTab', () => {
    it('should register a valid tab', () => {
      controller.registerTab('test-tab', mockTab);
      expect(controller.tabs.has('test-tab')).toBe(true);
      expect(controller.tabs.get('test-tab')).toBe(mockTab);
    });

    it('should throw if tabId is not a string', () => {
      expect(() => controller.registerTab(null, mockTab)).toThrow(
        'Tab ID must be a non-empty string'
      );
      expect(() => controller.registerTab(123, mockTab)).toThrow(
        'Tab ID must be a non-empty string'
      );
    });

    it('should throw if tabInstance is null', () => {
      expect(() => controller.registerTab('test-tab', null)).toThrow(
        'Tab instance is required'
      );
    });

    it('should throw if tab does not implement BaseTab interface', () => {
      const invalidTab = new InvalidTab();
      expect(() => controller.registerTab('invalid-tab', invalidTab)).toThrow(
        /must implement onLoad\(\) method/
      );
    });

    it('should warn if tab is already registered', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      controller.registerTab('test-tab', mockTab);
      controller.registerTab('test-tab', mockTab);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Tab "test-tab" is already registered. Overwriting.'
      );
      consoleSpy.mockRestore();
    });
  });

  describe('unregisterTab', () => {
    beforeEach(() => {
      controller.registerTab('test-tab', mockTab);
    });

    it('should unregister a tab', () => {
      const result = controller.unregisterTab('test-tab');
      expect(result).toBe(true);
      expect(controller.tabs.has('test-tab')).toBe(false);
    });

    it('should return false and warn if tab not registered', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = controller.unregisterTab('nonexistent-tab');
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Cannot unregister tab "nonexistent-tab" - not registered'
      );
      consoleSpy.mockRestore();
    });

    it('should unload tab if it is currently active', async () => {
      controller.initialize();
      await controller.activateTab('test-tab');

      controller.unregisterTab('test-tab');

      expect(mockTab.onUnloadCalled).toBe(true);
      expect(controller.currentTab).toBeNull();
      expect(controller.currentTabId).toBeNull();
    });
  });

  describe('activateTab', () => {
    beforeEach(() => {
      controller.initialize();
      controller.registerTab('test-tab', mockTab);
    });

    it('should throw if not initialized', async () => {
      const uninitializedController = new TabController();
      uninitializedController.registerTab('test-tab', mockTab);

      await expect(uninitializedController.activateTab('test-tab')).rejects.toThrow(
        'TabController not initialized'
      );
    });

    it('should throw if tab is not registered', async () => {
      await expect(controller.activateTab('nonexistent-tab')).rejects.toThrow(
        /Cannot activate tab "nonexistent-tab" - not registered/
      );
    });

    it('should activate a registered tab', async () => {
      await controller.activateTab('test-tab');

      expect(controller.currentTabId).toBe('test-tab');
      expect(controller.currentTab).toBe(mockTab);
      expect(mockTab.onLoadCalled).toBe(true);
    });

    it('should pass session info to tab onLoad', async () => {
      await controller.activateTab('test-tab');
      expect(mockTab.sessionInfo).toBe(sessionInfo);
    });

    it('should do nothing if same tab is already active', async () => {
      await controller.activateTab('test-tab');
      mockTab.onLoadCalled = false; // Reset flag

      await controller.activateTab('test-tab');
      expect(mockTab.onLoadCalled).toBe(false); // Should not call again
    });

    it('should reload if forceReload is true', async () => {
      await controller.activateTab('test-tab');
      mockTab.onLoadCalled = false; // Reset flag

      await controller.activateTab('test-tab', { forceReload: true });
      expect(mockTab.onLoadCalled).toBe(true);
    });

    it('should unload previous tab when switching', async () => {
      const mockTab2 = new MockTab('test-tab-2');
      document.body.innerHTML += '<div id="test-tab-2"></div>';
      controller.registerTab('test-tab-2', mockTab2);

      await controller.activateTab('test-tab');
      await controller.activateTab('test-tab-2');

      expect(mockTab.onUnloadCalled).toBe(true);
      expect(controller.currentTabId).toBe('test-tab-2');
    });

    it('should handle errors during tab activation', async () => {
      const errorTab = new MockTab('error-tab');
      errorTab.fetchData = jest.fn().mockRejectedValue(new Error('Fetch failed'));
      document.body.innerHTML += '<div id="error-tab"></div>';
      controller.registerTab('error-tab', errorTab);

      await expect(controller.activateTab('error-tab')).rejects.toThrow('Fetch failed');
      expect(controller.currentTab).toBeNull();
      expect(controller.currentTabId).toBeNull();
    });
  });

  describe('reloadCurrentTab', () => {
    beforeEach(() => {
      controller.initialize();
      controller.registerTab('test-tab', mockTab);
    });

    it('should reload current tab', async () => {
      await controller.activateTab('test-tab');
      mockTab.onLoadCalled = false; // Reset flag

      await controller.reloadCurrentTab();
      expect(mockTab.onLoadCalled).toBe(true);
    });

    it('should warn if no tab is active', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      await controller.reloadCurrentTab();
      expect(consoleSpy).toHaveBeenCalledWith('No tab is currently active');
      consoleSpy.mockRestore();
    });
  });

  describe('updateSession', () => {
    beforeEach(() => {
      controller.initialize();
      controller.registerTab('test-tab', mockTab);
    });

    it('should update session info', () => {
      const newSession = { user: { id: '456' }, userType: 'parent' };
      controller.updateSession(newSession);
      expect(controller.sessionInfo).toBe(newSession);
    });

    it('should notify current tab if it has onSessionChange method', async () => {
      mockTab.onSessionChange = jest.fn();
      await controller.activateTab('test-tab');

      const newSession = { user: { id: '456' }, userType: 'parent' };
      controller.updateSession(newSession);

      expect(mockTab.onSessionChange).toHaveBeenCalledWith(newSession);
    });
  });

  describe('getters', () => {
    beforeEach(() => {
      controller.initialize();
      controller.registerTab('test-tab', mockTab);
    });

    it('getCurrentTab should return current tab', async () => {
      expect(controller.getCurrentTab()).toBeNull();
      await controller.activateTab('test-tab');
      expect(controller.getCurrentTab()).toBe(mockTab);
    });

    it('getCurrentTabId should return current tab ID', async () => {
      expect(controller.getCurrentTabId()).toBeNull();
      await controller.activateTab('test-tab');
      expect(controller.getCurrentTabId()).toBe('test-tab');
    });

    it('isTabRegistered should check if tab is registered', () => {
      expect(controller.isTabRegistered('test-tab')).toBe(true);
      expect(controller.isTabRegistered('nonexistent')).toBe(false);
    });

    it('getRegisteredTabIds should return array of tab IDs', () => {
      const mockTab2 = new MockTab('test-tab-2');
      controller.registerTab('test-tab-2', mockTab2);

      const ids = controller.getRegisteredTabIds();
      expect(ids).toEqual(['test-tab', 'test-tab-2']);
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      controller.initialize();
      controller.registerTab('test-tab', mockTab);
    });

    it('should unload current tab', async () => {
      await controller.activateTab('test-tab');
      await controller.cleanup();

      expect(mockTab.onUnloadCalled).toBe(true);
    });

    it('should clear state', async () => {
      await controller.activateTab('test-tab');
      await controller.cleanup();

      expect(controller.currentTab).toBeNull();
      expect(controller.currentTabId).toBeNull();
      expect(controller.sessionInfo).toBeNull();
      expect(controller.initialized).toBe(false);
    });

    it('should handle errors during cleanup', async () => {
      mockTab.onUnload = jest.fn().mockRejectedValue(new Error('Cleanup error'));
      await controller.activateTab('test-tab');

      // Should not throw
      await expect(controller.cleanup()).resolves.toBeUndefined();
    });
  });
});
