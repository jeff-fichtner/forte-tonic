/**
 *
 */
export class DateHelpers {
  // parse 1899 date time string from google sheets into javascript date
  /**
   *
   */
  static parseGoogleSheetsDate(dateTimeString) {
    if (!dateTimeString) {
      return null;
    }

    // Convert the date string to a Date object
    const date = new Date(dateTimeString);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date string: ${dateTimeString}`);
    }

    // extract to HH:mm format
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;

    return formattedTime;
  }

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
