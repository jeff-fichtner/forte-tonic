import { PromiseHelpers } from './promiseHelpers.js';

/**
 *
 */
export class DomHelpers {
  /**
   *
   */
  static async waitForDocumentReadyAsync(): Promise<boolean | void> {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      return true;
    }
    await PromiseHelpers.promisifyEvent('DOMContentLoaded', document);
  }

  /**
   * Reset a Materialize CSS select element consistently
   *
   * This provides a consistent way to reset Materialize selects across the app,
   * following the same pattern as the Select component's clearSelectedOption() method.
   * Use this for native select elements that aren't wrapped in the Select component.
   *
   * @param {string|HTMLElement} selectElement - Select element ID or element reference
   * @param {boolean} triggerChange - Whether to trigger a change event after resetting
   */
  static resetMaterializeSelect(
    selectElement: string | HTMLElement,
    triggerChange: boolean = false
  ): void {
    const select = (
      typeof selectElement === 'string' ? document.getElementById(selectElement) : selectElement
    ) as HTMLSelectElement | null;

    if (!select) {
      console.warn(`❌ Select element not found for clearing: ${selectElement}`);
      return;
    }

    // Clear the value
    select.value = '';

    // Check if Materialize is available and reinitialize to refresh the display
    if (typeof M !== 'undefined' && M.FormSelect) {
      M.FormSelect.init(select);
    }

    // Trigger change event if requested
    if (triggerChange) {
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  /**
   * Reset multiple Materialize CSS select elements consistently
   * @param {Array<string|HTMLElement>} selectElements - Array of select element IDs or element references
   * @param {boolean} triggerChange - Whether to trigger change events after resetting
   */
  static resetMaterializeSelects(
    selectElements: Array<string | HTMLElement>,
    triggerChange: boolean = false
  ): void {
    selectElements.forEach(selectElement => {
      this.resetMaterializeSelect(selectElement, triggerChange);
    });
  }
}
