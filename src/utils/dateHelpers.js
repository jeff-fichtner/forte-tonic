/**
 *
 */
export class DateHelpers {
  // convert 15:00 to 3:00 PM format
  /**
   *
   */
  static convertTo12HourFormat(timeString) {
    if (!timeString) {
      return null;
    }

    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12; // Convert 0 to 12 for midnight
    return `${formattedHours}:${String(minutes).padStart(2, '0')} ${period}`;
  }

  // get datetime start of current day utc
  /**
   *
   */
  static getStartOfCurrentDayUTC() {
    return this.getStartOfDate(new Date());
  }

  /**
   *
   */
  static getStartOfDate(now) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
