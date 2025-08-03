/**
 *
 */
export class DomHelpers {
  /**
   *
   */
  static async _waitForDocumentReadyAsync() {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      return true;
    }
    await PromiseHelpers.promisifyEvent('DOMContentLoaded', document);
  }
}

// For backwards compatibility with existing code
window.DomHelpers = DomHelpers;
