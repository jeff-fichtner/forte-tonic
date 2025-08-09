import { PromiseHelpers } from './promiseHelpers.js';

/**
 *
 */
export class DomHelpers {
  /**
   *
   */
  static async waitForDocumentReadyAsync() {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      return true;
    }
    await PromiseHelpers.promisifyEvent('DOMContentLoaded', document);
  }

  /**
   * Clear a Materialize CSS select element consistently
   * 
   * This provides a consistent way to clear Materialize selects across the app,
   * following the same pattern as the Select component's clearSelectedOption() method.
   * Use this for native select elements that aren't wrapped in the Select component.
   * 
   * @param {string|HTMLElement} selectElement - Select element ID or element reference
   * @param {boolean} triggerChange - Whether to trigger a change event after clearing
   */
  static clearMaterializeSelect(selectElement, triggerChange = false) {
    const select = typeof selectElement === 'string' 
      ? document.getElementById(selectElement) 
      : selectElement;
      
    if (!select) {
      console.warn(`❌ Select element not found for clearing: ${selectElement}`);
      return;
    }

    console.log(`🔄 Clearing select: ${select.id || 'unnamed select'}, current value: "${select.value}"`);

    // Clear the value
    select.value = '';
    
    // Check if Materialize is available
    if (typeof M === 'undefined') {
      console.warn('❌ Materialize (M) is not available for select reinitialization');
    } else if (!M.FormSelect) {
      console.warn('❌ M.FormSelect is not available');
    } else {
      // Reinitialize Materialize select to refresh the display
      M.FormSelect.init(select);
      console.log(`✅ Reinitialized Materialize select: ${select.id}`);
    }
    
    // Trigger change event if requested
    if (triggerChange) {
      select.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`📢 Triggered change event for: ${select.id}`);
    }
    
    console.log(`✅ Select cleared: ${select.id || 'unnamed select'}, new value: "${select.value}"`);
  }

  /**
   * Clear multiple Materialize CSS select elements consistently
   * @param {Array<string|HTMLElement>} selectElements - Array of select element IDs or element references
   * @param {boolean} triggerChange - Whether to trigger change events after clearing
   */
  static clearMaterializeSelects(selectElements, triggerChange = false) {
    selectElements.forEach(selectElement => {
      this.clearMaterializeSelect(selectElement, triggerChange);
    });
  }
}

// For backwards compatibility with existing code
window.DomHelpers = DomHelpers;
