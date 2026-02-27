import { BaseTab } from './baseTab.js';

export abstract class AdminBaseTab extends BaseTab {
  /**
   * Returns the currently selected trimester string, or null if none is determinable.
   * Checks the active .trimester-btn in #admin-trimester-buttons first,
   * then falls back to window.UserSession?.getCurrentPeriod()?.trimester.
   */
  getTrimester(): string | null {
    const trimesterButtons = document.getElementById('admin-trimester-buttons');
    const activeButton = trimesterButtons?.querySelector<HTMLElement>('.trimester-btn.active');
    const currentPeriod = window.UserSession?.getCurrentPeriod();
    return activeButton?.dataset.trimester || currentPeriod?.trimester || null;
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
          trimesterButtons.querySelectorAll('.trimester-btn').forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          await this.reload();
        }
      });
    }
  }
}
