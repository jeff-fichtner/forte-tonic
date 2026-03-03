import { BaseTab } from './baseTab.js';
import { resolveSelectedTrimester } from '../utilities/trimesterHelpers.js';

export abstract class AdminBaseTab<TData = Record<string, unknown>> extends BaseTab<TData> {
  /**
   * Returns the currently selected trimester string, or null if none is determinable.
   */
  getTrimester(): string | null {
    return resolveSelectedTrimester('admin-trimester-buttons');
  }

  /**
   * Wires the trimester selector: clicking a .trimester-btn toggles .active
   * and triggers a tab reload.
   */
  attachEventListeners(): void {
    const trimesterButtons = document.getElementById('admin-trimester-buttons');
    if (trimesterButtons) {
      this.addEventListener(trimesterButtons, 'click', async (event: Event) => {
        const target = event.target as HTMLElement;
        const button = target.closest('.trimester-btn');
        if (button) {
          trimesterButtons
            .querySelectorAll('.trimester-btn')
            .forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          await this.reload();
        }
      });
    }
  }
}
