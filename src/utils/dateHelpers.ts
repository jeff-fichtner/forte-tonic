export class DateHelpers {
  /** Convert 15:00 to 3:00 PM format */
  static convertTo12HourFormat(timeString: string | null | undefined): string | null {
    if (!timeString) {
      return null;
    }

    const [hours, minutes] = timeString.split(':').map(Number);
    const period: string = hours >= 12 ? 'PM' : 'AM';
    const formattedHours: number = hours % 12 || 12; // Convert 0 to 12 for midnight
    return `${formattedHours}:${String(minutes).padStart(2, '0')} ${period}`;
  }

  /** Get datetime start of current day UTC */
  static getStartOfCurrentDayUTC(): Date {
    return this.getStartOfDate(new Date());
  }

  /** Get datetime start of the given date UTC */
  static getStartOfDate(now: Date): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
