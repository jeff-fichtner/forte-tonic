export const INTENT_TYPES = {
  KEEP: 'keep',
  DROP: 'drop',
  CHANGE: 'change',
} as const;

export type IntentType = (typeof INTENT_TYPES)[keyof typeof INTENT_TYPES];
