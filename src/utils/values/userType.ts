/**
 * User Types
 * Used for authentication and authorization throughout the application
 */
export const UserType = Object.freeze({
  ADMIN: 'admin',
  INSTRUCTOR: 'instructor',
  PARENT: 'parent',
} as const);

export type UserTypeValue = (typeof UserType)[keyof typeof UserType];
