export const PeriodType = {
  INTENT: 'intent',
  PRIORITY_ENROLLMENT: 'priorityEnrollment',
  OPEN_ENROLLMENT: 'openEnrollment',
  REGISTRATION: 'registration',
} as const;

export type PeriodTypeValue = (typeof PeriodType)[keyof typeof PeriodType];
