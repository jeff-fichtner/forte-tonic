/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { BaseTab } from '../../../src/web/js/core/baseTab.js';

/**
 * Concrete implementation for testing
 */
class TestTab extends BaseTab {
  constructor(tabId = 'test-tab') {
    super(tabId);
    this.fetchDataCalled = false;
    this.renderCalled = false;
    this.cleanupCalled = false;
    this.attachEventListenersCalled = false;
  }

  async fetchData(sessionInfo) {
    this.fetchDataCalled = true;
    return { message: 'Test data', userId: sessionInfo?.user?.id };
  }

  async render() {
    this.renderCalled = true;
    const container = this.getContainer();
    container.innerHTML = '<div class="test-content">Content</div>';
  }

  attachEventListeners() {
    this.attachEventListenersCalled = true;
  }

  async cleanup() {
    this.cleanupCalled = true;
  }
}

describe('BaseTab', () => {
  let tab;
  let sessionInfo;

  beforeEach(() => {
    sessionInfo = {
      user: { id: '123', name: 'Test User' },
      userType: 'admin',
    };

    tab = new TestTab('test-tab');

    // Create container in DOM
    document.body.innerHTML = '<div id="test-tab"></div>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    it('should initialize with tab ID', () => {
      expect(tab.tabId).toBe('test-tab');
    });

    it('should throw if tabId is missing', () => {
      expect(() => new BaseTab()).toThrow('Tab ID is required');
      expect(() => new BaseTab(null)).toThrow('Tab ID is required');
      expect(() => new BaseTab('')).toThrow('Tab ID is required');
    });

    it('should initialize with null data and session', () => {
      expect(tab.data).toBeNull();
      expect(tab.sessionInfo).toBeNull();
    });

    it('should not be loaded initially', () => {
      expect(tab.isLoaded).toBe(false);
    });

    it('should initialize empty event listeners array', () => {
      expect(tab.eventListeners).toEqual([]);
    });
  });

  describe('onLoad', () => {
    it('should call fetchData, render, and attachEventListeners', async () => {
      await tab.onLoad(sessionInfo);

      expect(tab.fetchDataCalled).toBe(true);
      expect(tab.renderCalled).toBe(true);
      expect(tab.attachEventListenersCalled).toBe(true);
    });

    it('should store session info', async () => {
      await tab.onLoad(sessionInfo);
      expect(tab.sessionInfo).toBe(sessionInfo);
    });

    it('should set isLoaded to true', async () => {
      await tab.onLoad(sessionInfo);
      expect(tab.isLoaded).toBe(true);
    });

    it('should store fetched data', async () => {
      await tab.onLoad(sessionInfo);
      expect(tab.data).toEqual({ message: 'Test data', userId: '123' });
    });

    it('should create abort controller', async () => {
      await tab.onLoad(sessionInfo);
      expect(tab.abortController).toBeDefined();
      expect(tab.abortController).toBeInstanceOf(AbortController);
    });

    it('should warn if already loaded', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      await tab.onLoad(sessionInfo);
      await tab.onLoad(sessionInfo);

      expect(consoleSpy).toHaveBeenCalledWith('Tab test-tab is already loaded');
      consoleSpy.mockRestore();
    });

    it('should handle errors during fetch', async () => {
      tab.fetchData = jest.fn().mockRejectedValue(new Error('Fetch failed'));
      tab.showError = jest.fn();

      await expect(tab.onLoad(sessionInfo)).rejects.toThrow('Fetch failed');
      expect(tab.isLoaded).toBe(false);
      expect(tab.showError).toHaveBeenCalled();
    });

    it('should not log abort errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      tab.fetchData = jest.fn().mockRejectedValue(abortError);

      await expect(tab.onLoad(sessionInfo)).rejects.toThrow();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Tab load cancelled: test-tab');

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('onUnload', () => {
    beforeEach(async () => {
      await tab.onLoad(sessionInfo);
    });

    it('should call cleanup', async () => {
      await tab.onUnload();
      expect(tab.cleanupCalled).toBe(true);
    });

    it('should remove event listeners', async () => {
      const button = document.createElement('button');
      const handler = jest.fn();
      tab.addEventListener(button, 'click', handler);

      expect(tab.eventListeners.length).toBe(1);

      await tab.onUnload();
      expect(tab.eventListeners.length).toBe(0);

      // Verify handler is actually removed
      button.click();
      expect(handler).not.toHaveBeenCalled();
    });

    it('should abort in-flight requests', async () => {
      const abortSpy = jest.spyOn(tab.abortController, 'abort');
      await tab.onUnload();
      expect(abortSpy).toHaveBeenCalled();
    });

    it('should clear data and session', async () => {
      await tab.onUnload();
      expect(tab.data).toBeNull();
      expect(tab.sessionInfo).toBeNull();
    });

    it('should set isLoaded to false', async () => {
      await tab.onUnload();
      expect(tab.isLoaded).toBe(false);
    });

    it('should do nothing if not loaded', async () => {
      const unloadedTab = new TestTab('unloaded-tab');
      await unloadedTab.onUnload();
      expect(unloadedTab.cleanupCalled).toBe(false);
    });
  });

  describe('fetchData', () => {
    it('should throw if not implemented', async () => {
      const baseTab = Object.create(BaseTab.prototype);
      baseTab.tabId = 'base-tab';

      await expect(baseTab.fetchData()).rejects.toThrow(
        'fetchData() must be implemented by BaseTab'
      );
    });
  });

  describe('render', () => {
    it('should throw if not implemented', async () => {
      const baseTab = Object.create(BaseTab.prototype);
      baseTab.tabId = 'base-tab';

      await expect(baseTab.render()).rejects.toThrow(
        'render() must be implemented by BaseTab'
      );
    });
  });

  describe('addEventListener', () => {
    it('should add event listener to element', () => {
      const button = document.createElement('button');
      const handler = jest.fn();

      tab.addEventListener(button, 'click', handler);

      button.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should track event listener for cleanup', () => {
      const button = document.createElement('button');
      const handler = jest.fn();

      tab.addEventListener(button, 'click', handler);
      expect(tab.eventListeners.length).toBe(1);
      expect(tab.eventListeners[0]).toEqual({
        element: button,
        event: 'click',
        handler,
        options: {},
      });
    });

    it('should support event listener options', () => {
      const button = document.createElement('button');
      const handler = jest.fn();
      const options = { once: true };

      tab.addEventListener(button, 'click', handler, options);

      button.click();
      button.click();

      expect(handler).toHaveBeenCalledTimes(1); // once option works
    });
  });

  describe('removeEventListeners', () => {
    it('should remove all tracked event listeners', () => {
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      tab.addEventListener(button1, 'click', handler1);
      tab.addEventListener(button2, 'click', handler2);

      tab.removeEventListeners();

      button1.click();
      button2.click();

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(tab.eventListeners.length).toBe(0);
    });
  });

  describe('getContainer', () => {
    it('should return container element', () => {
      const container = tab.getContainer();
      expect(container).toBeInstanceOf(HTMLElement);
      expect(container.id).toBe('test-tab');
    });

    it('should throw if container not found', () => {
      tab.tabId = 'nonexistent-tab';
      expect(() => tab.getContainer()).toThrow('Tab container not found: nonexistent-tab');
    });
  });

  describe('showLoadingState', () => {
    it('should add loading class when true', () => {
      const container = tab.getContainer();
      tab.showLoadingState(true);

      expect(container.classList.contains('tab-loading')).toBe(true);
      expect(container.getAttribute('aria-busy')).toBe('true');
    });

    it('should remove loading class when false', () => {
      const container = tab.getContainer();
      tab.showLoadingState(true);
      tab.showLoadingState(false);

      expect(container.classList.contains('tab-loading')).toBe(false);
      expect(container.hasAttribute('aria-busy')).toBe(false);
    });
  });

  describe('showError', () => {
    it('should display error message', () => {
      const error = new Error('Test error');
      tab.showError(error);

      const container = tab.getContainer();
      expect(container.innerHTML).toContain('Test error');
      expect(container.innerHTML).toContain('Error:');
    });

    it('should show default message if no error message', () => {
      tab.showError({});

      const container = tab.getContainer();
      expect(container.innerHTML).toContain('An error occurred loading this tab');
    });
  });

  describe('reload', () => {
    beforeEach(async () => {
      await tab.onLoad(sessionInfo);
    });

    it('should fetch data again', async () => {
      tab.fetchDataCalled = false;
      await tab.reload();
      expect(tab.fetchDataCalled).toBe(true);
    });

    it('should re-render', async () => {
      tab.renderCalled = false;
      await tab.reload();
      expect(tab.renderCalled).toBe(true);
    });

    it('should abort previous requests', async () => {
      const oldController = tab.abortController;
      const abortSpy = jest.spyOn(oldController, 'abort');

      await tab.reload();
      expect(abortSpy).toHaveBeenCalled();
    });

    it('should create new abort controller', async () => {
      const oldController = tab.abortController;
      await tab.reload();
      expect(tab.abortController).not.toBe(oldController);
    });

    it('should handle errors', async () => {
      tab.fetchData = jest.fn().mockRejectedValue(new Error('Reload failed'));
      tab.showError = jest.fn();

      await expect(tab.reload()).rejects.toThrow('Reload failed');
      expect(tab.showError).toHaveBeenCalled();
    });
  });

  describe('getAbortSignal', () => {
    it('should return abort signal when controller exists', async () => {
      await tab.onLoad(sessionInfo);
      const signal = tab.getAbortSignal();
      expect(signal).toBeDefined();
      expect(signal).toBeInstanceOf(AbortSignal);
    });

    it('should return undefined if no controller', () => {
      const signal = tab.getAbortSignal();
      expect(signal).toBeUndefined();
    });
  });

  describe('onSessionChange', () => {
    it('should update session info', () => {
      const newSession = { user: { id: '456' }, userType: 'parent' };
      tab.onSessionChange(newSession);
      expect(tab.sessionInfo).toBe(newSession);
    });

    it('should be overridable in subclasses', () => {
      class CustomTab extends BaseTab {
        constructor() {
          super('custom-tab');
          this.sessionChangeCallCount = 0;
        }

        onSessionChange(sessionInfo) {
          super.onSessionChange(sessionInfo);
          this.sessionChangeCallCount++;
        }

        async fetchData() {
          return {};
        }
        async render() {}
      }

      const customTab = new CustomTab();
      customTab.onSessionChange(sessionInfo);
      expect(customTab.sessionChangeCallCount).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should be overridable for custom cleanup logic', async () => {
      class CustomCleanupTab extends BaseTab {
        constructor() {
          super('cleanup-tab');
          this.customCleanupCalled = false;
        }

        async cleanup() {
          await super.cleanup();
          this.customCleanupCalled = true;
        }

        async fetchData() {
          return {};
        }
        async render() {}
      }

      document.body.innerHTML = '<div id="cleanup-tab"></div>';
      const customTab = new CustomCleanupTab();
      await customTab.onLoad(sessionInfo);
      await customTab.onUnload();

      expect(customTab.customCleanupCalled).toBe(true);
    });
  });

  describe('attachEventListeners', () => {
    it('should be optional to override', async () => {
      class NoEventListenersTab extends BaseTab {
        constructor() {
          super('no-events-tab');
        }

        async fetchData() {
          return {};
        }
        async render() {}
        // Don't override attachEventListeners
      }

      document.body.innerHTML = '<div id="no-events-tab"></div>';
      const noEventsTab = new NoEventListenersTab();

      // Should not throw
      await expect(noEventsTab.onLoad(sessionInfo)).resolves.toBeUndefined();
    });
  });
});
