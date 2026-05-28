/**
 * Login Types
 *
 * Distinguishes which credential format a request is using. Carried by the
 * `x-login-type` header and stored alongside the access code in local
 * storage. Distinct from `UserType` — a "parent" login type uses a phone
 * number as the credential and identifies as a Parent user; an "employee"
 * login type uses a 6-digit access code and may resolve to either an Admin
 * or an Instructor user.
 *
 * - `parent`   — credential is a 10-digit phone number
 * - `employee` — credential is a 6-digit access code (admin or instructor)
 */
export const LoginType = Object.freeze({
  PARENT: 'parent',
  EMPLOYEE: 'employee',
} as const);

export type LoginTypeValue = (typeof LoginType)[keyof typeof LoginType];
