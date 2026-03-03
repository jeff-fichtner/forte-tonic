/**
 * TabController singleton holder.
 * main.ts sets the instance after creation; other modules read it via getTabController().
 */

import type { TabController } from './tabController.js';

let instance: TabController | null = null;

export function getTabController(): TabController | null {
  return instance;
}

export function setTabController(tc: TabController): void {
  instance = tc;
}
