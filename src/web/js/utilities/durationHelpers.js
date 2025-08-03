/**
 *
 */
export class DurationHelpers {
  // Converts "HH:MM" to a Luxon Duration object
  /**
   *
   */
  static stringToDuration(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return Duration.fromObject({ hours, minutes });
  }
  // Converts total minutes into a Luxon Duration object
  /**
   *
   */
  static minutesToDuration(minutes) {
    return Duration.fromObject({ minutes });
  }

  // Converts a Luxon Duration object to a string in "h:mm a" format
  /**
   *
   */
  static durationToDateTime(duration) {
    // Add the duration to midnight (start of the day)
    return DateTime.fromObject({ hour: 0, minute: 0 }).plus(duration);
  }
}

// For backwards compatibility with existing code
window.DurationHelpers = DurationHelpers;
