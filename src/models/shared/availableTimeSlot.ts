/** A pre-computed, conflict-free time slot for private lesson availability */
export interface AvailableTimeSlot {
  instructorId: string;
  day: string; // "monday"
  dayName: string; // "Monday"
  time: string; // "14:00"
  timeFormatted: string; // "2:00 PM"
  length: number; // 30, 45, 60
  instrument: string;
  roomId: string;
}
