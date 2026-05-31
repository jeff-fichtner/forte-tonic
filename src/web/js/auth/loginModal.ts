import { HttpService } from '../data/httpService.js';
import { ServerFunctions } from '../constants.js';
import { setPageLoading } from '../ui/pageLoading.js';
import { ModalKeyboardHandler } from '../utilities/modalKeyboardHandler.js';
import { AccessCodeManager, type AuthenticatedUser } from './session.js';
import { LoginType } from '/utils/values/loginType.js';
import {
  formatPhoneAsTyped,
  isValidPhoneNumber,
  stripPhoneFormatting,
} from '../utilities/phoneHelpers.js';

/**
 * Pull `firstName` off whichever role-record the auth response carries.
 * Returns null when no name is available (no role, or no `firstName` field).
 */
export function extractFirstName(user: AuthenticatedUser | null): string | null {
  if (!user) return null;
  const record = user.admin ?? user.instructor ?? user.parent;
  const firstName = (record as { firstName?: unknown } | null | undefined)?.firstName;
  return typeof firstName === 'string' && firstName.length > 0 ? firstName : null;
}

// Module-level state
let loginModal: MaterializeModalInstance | null = null;
let currentLoginType: string = 'parent';

// Stored callback for login success — set once in init(), called on each successful login
let onLoginSuccessCallback:
  | ((user: AuthenticatedUser, roleToClick: string | null) => Promise<void>)
  | null = null;

/**
 * Initialize the login modal DOM bindings.
 * Call once after DOMContentLoaded.
 */
export function init(
  onLoginSuccess: (user: AuthenticatedUser, roleToClick: string | null) => Promise<void>
): void {
  onLoginSuccessCallback = onLoginSuccess;
  initLoginModal();
}

/**
 * Open the login modal.
 */
export function open(): void {
  loginModal?.open();
}

/**
 * Close the login modal if it is currently open.
 */
export function closeIfOpen(): void {
  if (loginModal && loginModal.isOpen) {
    loginModal.close();
  }
}

/**
 * Update the navbar login button text ("Login" vs "Change User") based on
 * stored credentials. When `firstName` is provided, also renders a
 * "Hello, <firstName>" greeting next to the button. Pass null/undefined
 * to clear the greeting (e.g. on logout).
 * Called by main.ts startup, after successful login, and after logout.
 */
export function updateLoginButtonState(firstName?: string | null): void {
  const loginButton = document.querySelector('a[href="#login-modal"]');
  if (!loginButton) {
    console.warn('Login button not found');
    return;
  }

  const storedCode = AccessCodeManager.getStoredAccessCode();

  const buttonTextNode = loginButton.childNodes[loginButton.childNodes.length - 1];
  if (buttonTextNode && buttonTextNode.nodeType === Node.TEXT_NODE) {
    buttonTextNode.textContent = storedCode ? 'Change User' : 'Login';
  }

  const greeting = document.getElementById('user-greeting');
  if (greeting) {
    if (firstName && storedCode) {
      greeting.textContent = `Hello, ${firstName}!`;
      greeting.style.display = 'block';
    } else {
      greeting.textContent = '';
      greeting.style.display = 'none';
    }
  }
}

/**
 * Make the login button container visible after config loads.
 * Called by main.ts startup sequence.
 */
export function showLoginButton(): void {
  try {
    const loginButtonContainer = document.getElementById('login-button-container');
    if (loginButtonContainer) {
      loginButtonContainer.hidden = false;
    }
  } catch (error: unknown) {
    console.error('❌ Error showing login button:', error);
  }
}

// ---------------------------------------------------------------------------
// Internal functions
// ---------------------------------------------------------------------------

function initLoginModal(): void {
  const modalElement = document.getElementById('login-modal');
  if (!modalElement) {
    console.warn('Login modal not found');
    return;
  }

  loginModal = M.Modal.init(modalElement, {
    dismissible: true,
    opacity: 0.5,
    inDuration: 300,
    outDuration: 200,
  } as MaterializeModalOptions);

  // Expose to window for console debugging and runtime access
  window.loginModal = modalElement;
  window.loginModalInstance = loginModal;

  const parentTab = document.getElementById('parent-login-tab');
  const employeeTab = document.getElementById('employee-login-tab');
  const parentSection = document.getElementById('parent-login-section');
  const employeeSection = document.getElementById('employee-login-section');
  const parentPhoneInput = document.getElementById('parent-phone-input') as HTMLInputElement | null;
  const employeeCodeInput = document.getElementById(
    'employee-access-code'
  ) as HTMLInputElement | null;
  const loginButton = document.getElementById('login-submit-btn');

  if (
    !parentTab ||
    !employeeTab ||
    !parentSection ||
    !employeeSection ||
    !parentPhoneInput ||
    !employeeCodeInput ||
    !loginButton
  ) {
    console.warn('Login modal elements not found');
    return;
  }

  currentLoginType = 'parent';

  initLoginTypeSwitching(parentTab, employeeTab, parentSection, employeeSection);
  initParentPhoneInput(parentPhoneInput, loginButton);
  initEmployeeCodeInput(employeeCodeInput, loginButton);

  loginButton.addEventListener('click', (e: Event) => {
    e.preventDefault();
    handleLogin();
  });

  modalElement.addEventListener('modal:opened', () => {
    resetLoginModal(parentPhoneInput, employeeCodeInput, loginButton);
    setTimeout(() => {
      focusCurrentInput();
      validateCurrentInput();
    }, 100);
  });

  modalElement.addEventListener('modal:closed', () => {
    resetLoginModal(parentPhoneInput, employeeCodeInput, loginButton);
  });

  ModalKeyboardHandler.attachKeyboardHandlers(modalElement, {
    allowEscape: true,
    allowEnter: true,
    onConfirm: (_event: KeyboardEvent) => {
      if (!(loginButton as HTMLButtonElement).disabled) {
        handleLogin();
      }
    },
    onCancel: (_event: KeyboardEvent) => {
      loginModal!.close();
    },
  });
}

function initLoginTypeSwitching(
  parentTab: HTMLElement,
  employeeTab: HTMLElement,
  parentSection: HTMLElement,
  employeeSection: HTMLElement
): void {
  parentTab.addEventListener('click', (e: Event) => {
    e.preventDefault();
    if (currentLoginType !== 'parent') {
      currentLoginType = 'parent';

      parentTab.classList.remove('inactive-login-type');
      parentTab.classList.add('active-login-type');
      employeeTab.classList.remove('active-login-type');
      employeeTab.classList.add('inactive-login-type');

      parentSection.style.display = 'block';
      parentSection.classList.remove('inactive-section');
      parentSection.classList.add('active-section');
      employeeSection.style.display = 'none';
      employeeSection.classList.remove('active-section');
      employeeSection.classList.add('inactive-section');

      validateCurrentInput();
      focusCurrentInput();
    }
  });

  employeeTab.addEventListener('click', (e: Event) => {
    e.preventDefault();
    if (currentLoginType !== 'employee') {
      currentLoginType = 'employee';

      employeeTab.classList.remove('inactive-login-type');
      employeeTab.classList.add('active-login-type');
      parentTab.classList.remove('active-login-type');
      parentTab.classList.add('inactive-login-type');

      employeeSection.style.display = 'block';
      employeeSection.classList.remove('inactive-section');
      employeeSection.classList.add('active-section');
      parentSection.style.display = 'none';
      parentSection.classList.remove('active-section');
      parentSection.classList.add('inactive-section');

      validateCurrentInput();
      focusCurrentInput();
    }
  });
}

function initParentPhoneInput(phoneInput: HTMLInputElement, _loginButton: HTMLElement): void {
  phoneInput.addEventListener('input', (e: Event) => {
    const target = e.target as HTMLInputElement;
    target.value = formatPhoneAsTyped(target.value);

    if (currentLoginType === LoginType.PARENT) {
      validateCurrentInput();
    }
  });

  phoneInput.addEventListener('focus', (_e: Event) => {
    if (currentLoginType === LoginType.PARENT) {
      setTimeout(() => {
        validateCurrentInput();
      }, 50);
    }
  });

  phoneInput.addEventListener('paste', (e: Event) => {
    const target = e.target as HTMLInputElement;
    setTimeout(() => {
      target.value = formatPhoneAsTyped(target.value);
      if (currentLoginType === LoginType.PARENT) {
        validateCurrentInput();
      }
    }, 0);
  });
}

function initEmployeeCodeInput(codeInput: HTMLInputElement, _loginButton: HTMLElement): void {
  codeInput.addEventListener('input', (e: Event) => {
    const target = e.target as HTMLInputElement;
    const numericValue = target.value.replace(/[^0-9]/g, '').substring(0, 6);
    target.value = numericValue;

    if (currentLoginType === 'employee') {
      validateCurrentInput();
    }
  });

  codeInput.addEventListener('focus', (_e: Event) => {
    if (currentLoginType === 'employee') {
      setTimeout(() => {
        validateCurrentInput();
      }, 50);
    }
  });
}

function validateCurrentInput(): void {
  const loginButton = document.getElementById('login-submit-btn');
  if (!loginButton) return;

  let isValid = false;

  if (currentLoginType === LoginType.PARENT) {
    const phoneInput = document.getElementById('parent-phone-input') as HTMLInputElement | null;
    if (!phoneInput) return;
    const phoneValue = phoneInput.value;

    isValid = isValidPhoneNumber(phoneValue);

    if (phoneValue.length > 0) {
      if (isValid) {
        phoneInput.classList.add('valid');
        phoneInput.classList.remove('invalid');
      } else {
        phoneInput.classList.add('invalid');
        phoneInput.classList.remove('valid');
      }
    } else {
      phoneInput.classList.remove('valid', 'invalid');
    }
  } else {
    const codeInput = document.getElementById('employee-access-code') as HTMLInputElement | null;
    if (!codeInput) return;
    const codeValue = codeInput.value;
    isValid = codeValue.length === 6;

    if (codeValue.length > 0) {
      if (isValid) {
        codeInput.classList.add('valid');
        codeInput.classList.remove('invalid');
      } else {
        codeInput.classList.add('invalid');
        codeInput.classList.remove('valid');
      }
    } else {
      codeInput.classList.remove('valid', 'invalid');
    }
  }

  if (isValid) {
    loginButton.removeAttribute('disabled');
    loginButton.classList.remove('disabled');
    loginButton.style.opacity = '1';
    loginButton.style.pointerEvents = 'auto';
    loginButton.style.cursor = 'pointer';
  } else {
    loginButton.setAttribute('disabled', 'disabled');
    loginButton.classList.add('disabled');
    loginButton.style.opacity = '0.6';
    loginButton.style.pointerEvents = 'none';
    loginButton.style.cursor = 'not-allowed';
  }
}

function focusCurrentInput(): void {
  if (currentLoginType === LoginType.PARENT) {
    const phoneInput = document.getElementById('parent-phone-input') as HTMLInputElement | null;
    if (phoneInput) phoneInput.focus();
  } else {
    const codeInput = document.getElementById('employee-access-code') as HTMLInputElement | null;
    if (codeInput) codeInput.focus();
  }
}

function resetLoginModal(
  parentPhoneInput: HTMLInputElement,
  employeeCodeInput: HTMLInputElement,
  loginButton: HTMLElement
): void {
  parentPhoneInput.value = '';
  employeeCodeInput.value = '';

  parentPhoneInput.classList.remove('valid', 'invalid');
  employeeCodeInput.classList.remove('valid', 'invalid');

  loginButton.setAttribute('disabled', 'disabled');
  loginButton.classList.add('disabled');
  loginButton.style.opacity = '0.6';
  loginButton.style.pointerEvents = 'none';
  loginButton.style.cursor = 'not-allowed';

  currentLoginType = 'parent';
  const parentTab = document.getElementById('parent-login-tab');
  const employeeTab = document.getElementById('employee-login-tab');
  const parentSection = document.getElementById('parent-login-section');
  const employeeSection = document.getElementById('employee-login-section');

  if (parentTab) {
    parentTab.classList.remove('inactive-login-type');
    parentTab.classList.add('active-login-type');
  }
  if (employeeTab) {
    employeeTab.classList.remove('active-login-type');
    employeeTab.classList.add('inactive-login-type');
  }

  if (parentSection) {
    parentSection.style.display = 'block';
    parentSection.classList.remove('inactive-section');
    parentSection.classList.add('active-section');
  }
  if (employeeSection) {
    employeeSection.style.display = 'none';
    employeeSection.classList.remove('active-section');
    employeeSection.classList.add('inactive-section');
  }
}

async function handleLogin(): Promise<void> {
  let loginValue = '';
  const loginType = currentLoginType;

  if (loginType === LoginType.PARENT) {
    const phoneInput = document.getElementById('parent-phone-input') as HTMLInputElement | null;
    if (!phoneInput) return;
    const phoneValue = phoneInput.value.trim();

    if (!isValidPhoneNumber(phoneValue)) {
      M.toast({
        html: 'Please enter a valid 10-digit phone number.',
        classes: 'red darken-1',
        displayLength: 3000,
      });
      phoneInput.focus();
      return;
    }

    loginValue = stripPhoneFormatting(phoneValue);
  } else {
    const codeInput = document.getElementById('employee-access-code') as HTMLInputElement | null;
    if (!codeInput) return;
    const codeValue = codeInput.value.trim();

    if (codeValue.length !== 6) {
      M.toast({
        html: 'Please enter a valid 6-digit access code.',
        classes: 'red darken-1',
        displayLength: 3000,
      });
      codeInput.focus();
      return;
    }

    loginValue = codeValue;
  }

  loginModal!.close();

  await attemptLoginWithCode(
    loginValue,
    loginType,
    () => {
      const parentInput = document.getElementById('parent-phone-input') as HTMLInputElement | null;
      const employeeInput = document.getElementById(
        'employee-access-code'
      ) as HTMLInputElement | null;
      if (parentInput) parentInput.value = '';
      if (employeeInput) employeeInput.value = '';
    },
    () => {
      loginModal!.open();
      setTimeout(() => {
        focusCurrentInput();
      }, 300);
    }
  );
}

async function attemptLoginWithCode(
  loginValue: string,
  loginType: string,
  onSuccessfulLogin: (() => void) | null = null,
  onFailedLogin: (() => void) | null = null
): Promise<void> {
  setPageLoading(true);

  const authResult = await HttpService.post<AuthenticatedUser>(
    ServerFunctions.authenticateByAccessCode,
    {
      accessCode: loginValue,
      loginType: loginType,
    }
  );

  const authenticatedUser = authResult.ok ? authResult.data : null;
  const loginSuccess = authenticatedUser !== null && !authenticatedUser?.systemError;

  if (loginSuccess) {
    AccessCodeManager.saveAccessCodeSecurely(loginValue, loginType);
    updateLoginButtonState(extractFirstName(authenticatedUser));
    onSuccessfulLogin?.();

    let roleToClick: string | null = null;
    if (authenticatedUser!.admin) {
      roleToClick = 'admin';
    } else if (authenticatedUser!.instructor) {
      roleToClick = 'instructor';
    } else if (authenticatedUser!.parent) {
      roleToClick = 'parent';
    }

    if (onLoginSuccessCallback) {
      await onLoginSuccessCallback(authenticatedUser!, roleToClick);
    }
  } else {
    if (authenticatedUser?.systemError && authenticatedUser?.error) {
      M.toast({
        html: authenticatedUser.error as string,
        classes: 'red darken-1',
        displayLength: 4000,
      });
    } else if (!authResult.ok) {
      M.toast({
        html: authResult.error.message || 'Login failed. Please try again.',
        classes: 'red darken-1',
        displayLength: 4000,
      });
    } else {
      const isPhoneNumber = loginValue.length === 10 && /^\d{10}$/.test(loginValue);
      const errorMessage = isPhoneNumber ? 'Invalid phone number' : 'Invalid access code';
      M.toast({
        html: errorMessage,
        classes: 'red darken-1',
        displayLength: 3000,
      });
    }
    onFailedLogin?.();
  }

  setPageLoading(false);
}
