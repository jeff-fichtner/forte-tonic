/**
 * Minimal type declarations for MaterializeCSS 1.0.0
 *
 * Only covers the subset of the M API actually used in this codebase.
 * This is a documented external boundary where hand-written declarations
 * are preferred over @types/materialize-css (see research.md R6).
 */

interface MaterializeToastOptions {
  html: string;
  classes?: string;
  displayLength?: number;
}

interface MaterializeModalOptions {
  dismissible?: boolean;
  onOpenStart?: (this: MaterializeModalInstance, el: Element) => void;
  onOpenEnd?: (this: MaterializeModalInstance, el: Element) => void;
  onCloseStart?: (this: MaterializeModalInstance, el: Element) => void;
  onCloseEnd?: (this: MaterializeModalInstance, el: Element) => void;
}

interface MaterializeModalInstance {
  open(): void;
  close(): void;
  destroy(): void;
  isOpen: boolean;
  el: Element;
}

interface MaterializeAutocompleteOptions {
  data: Record<string, string | null>;
  onAutocomplete?: (text: string) => void;
  limit?: number;
  minLength?: number;
}

interface MaterializeFormSelectOptions {
  classes?: string;
  dropdownOptions?: Record<string, unknown>;
}

interface MaterializeTabsInstance {
  select(tabId: string): void;
  updateTabIndicator(): void;
  destroy(): void;
  el: Element;
}

interface MaterializeComponent<TOptions, TInstance> {
  init(el: Element, options?: TOptions): TInstance;
  init(els: NodeListOf<Element>, options?: TOptions): TInstance[];
  getInstance(el: Element): TInstance | undefined;
}

interface Materialize {
  toast(options: MaterializeToastOptions): void;
  AutoInit(context?: Element): void;
  updateTextFields(): void;
  Modal: MaterializeComponent<MaterializeModalOptions, MaterializeModalInstance>;
  Autocomplete: MaterializeComponent<MaterializeAutocompleteOptions, unknown>;
  FormSelect: MaterializeComponent<MaterializeFormSelectOptions, unknown>;
  Tabs: MaterializeComponent<Record<string, unknown>, MaterializeTabsInstance>;
}

declare const M: Materialize;
