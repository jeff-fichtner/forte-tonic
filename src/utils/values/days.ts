/** Lowercase day keys matching instructor availability field prefixes */
export const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
export type Day = (typeof ALL_DAYS)[number];

/** Capitalized day names as stored in sheet data (e.g., Classes.day column) */
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
export type DayName = (typeof DAY_NAMES)[number];

/** Map capitalized day name → instructor sheet header for room column */
export const DAY_TO_ROOM_FIELD: Record<DayName, string> = {
  Monday: 'MondayRoom',
  Tuesday: 'TuesdayRoom',
  Wednesday: 'WednesdayRoom',
  Thursday: 'ThursdayRoom',
  Friday: 'FridayRoom',
} as const;
