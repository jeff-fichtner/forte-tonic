export const RegistrationType = {
  PRIVATE: 'private',
  GROUP: 'group',
} as const;

export type RegistrationTypeValue = (typeof RegistrationType)[keyof typeof RegistrationType];
