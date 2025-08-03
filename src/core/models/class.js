import { DateHelpers } from '../helpers/nativeDateTimeHelpers.js';

/**
 *
 */
export class Class {
  /**
   *
   */
  constructor(
    id,
    instructorId,
    day,
    startTime,
    length,
    endTime,
    instrument,
    title,
    size,
    minimumGrade,
    maximumGrade
  ) {
    this.id = id;
    this.instructorId = instructorId;
    this.day = day;
    this.startTime = DateHelpers.parseTimeString(startTime).to24Hour();
    this.length = length;
    this.endTime = DateHelpers.parseTimeString(endTime).to24Hour();
    this.instrument = instrument;
    this.title = title;
    this.size = size;
    this.minimumGrade = minimumGrade;
    this.maximumGrade = maximumGrade;
  }
}
