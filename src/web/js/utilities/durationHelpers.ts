import { Duration } from '../constants.js';

/**
 * Duration helpers using native JavaScript implementation
 */
export class DurationHelpers {
  // Converts "HH:MM" to a native Duration object
  /**
   *
   */
  static stringToDuration(timeString) {
    return Duration.fromTimeString(timeString);
  }

  // Converts total minutes into a native Duration object
  /**
   *
   */
  static minutesToDuration(minutes) {
    return Duration.fromMinutes(minutes);
  }

  // Converts a native Duration object to a DateTime for formatting
  /**
   *
   */
  static durationToDateTime(duration) {
    // Convert duration to a date at midnight plus the duration
    return duration.toDate();
  }
}

// Expose to window for console debugging and runtime access
window.DurationHelpers = DurationHelpers;
