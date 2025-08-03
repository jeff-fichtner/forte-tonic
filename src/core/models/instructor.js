/**
 * Instructor data model - for database operations only
 * Simple data container with minimal logic
 */
export class Instructor {
  /**
   * Creates an Instructor data model instance
   * @param {string} id - Unique identifier
   * @param {string} email - Email address
   * @param {string} lastName - Last name
   * @param {string} firstName - First name
   * @param {string} phone - Phone number
   * @param {boolean} isDeactivated - Deactivated status
   * @param {string} minimumGrade - Minimum grade level
   * @param {string} maximumGrade - Maximum grade level
   * @param {string} instrument1 - Primary instrument
   * @param {string} instrument2 - Secondary instrument
   * @param {string} instrument3 - Third instrument
   * @param {string} instrument4 - Fourth instrument
   * @param {boolean} isAvailableMonday - Monday availability
   * @param {Date|string} mondayStartTime - Monday start time
   * @param {Date|string} mondayEndTime - Monday end time
   * @param {string} mondayRoomId - Monday room ID
   * @param {boolean} isAvailableTuesday - Tuesday availability
   * @param {Date|string} tuesdayStartTime - Tuesday start time
   * @param {Date|string} tuesdayEndTime - Tuesday end time
   * @param {string} tuesdayRoomId - Tuesday room ID
   * @param {boolean} isAvailableWednesday - Wednesday availability
   * @param {Date|string} wednesdayStartTime - Wednesday start time
   * @param {Date|string} wednesdayEndTime - Wednesday end time
   * @param {string} wednesdayRoomId - Wednesday room ID
   * @param {boolean} isAvailableThursday - Thursday availability
   * @param {Date|string} thursdayStartTime - Thursday start time
   * @param {Date|string} thursdayEndTime - Thursday end time
   * @param {string} thursdayRoomId - Thursday room ID
   * @param {boolean} isAvailableFriday - Friday availability
   * @param {Date|string} fridayStartTime - Friday start time
   * @param {Date|string} fridayEndTime - Friday end time
   * @param {string} fridayRoomId - Friday room ID
   */
  constructor(
    id,
    email,
    lastName,
    firstName,
    phone,
    isDeactivated,
    minimumGrade,
    maximumGrade,
    instrument1,
    instrument2,
    instrument3,
    instrument4,
    isAvailableMonday,
    mondayStartTime,
    mondayEndTime,
    mondayRoomId,
    isAvailableTuesday,
    tuesdayStartTime,
    tuesdayEndTime,
    tuesdayRoomId,
    isAvailableWednesday,
    wednesdayStartTime,
    wednesdayEndTime,
    wednesdayRoomId,
    isAvailableThursday,
    thursdayStartTime,
    thursdayEndTime,
    thursdayRoomId,
    isAvailableFriday,
    fridayStartTime,
    fridayEndTime,
    fridayRoomId
  ) {
    this.id = id;
    this.email = email;
    this.lastName = lastName;
    this.firstName = firstName;
    this.phone = phone;
    this.isDeactivated = isDeactivated;
    this.minimumGrade = minimumGrade;
    this.maximumGrade = maximumGrade;
    this.instrument1 = instrument1;
    this.instrument2 = instrument2;
    this.instrument3 = instrument3;
    this.instrument4 = instrument4;
    this.isAvailableMonday = isAvailableMonday;
    this.mondayStartTime = mondayStartTime;
    this.mondayEndTime = mondayEndTime;
    this.mondayRoomId = mondayRoomId;
    this.isAvailableTuesday = isAvailableTuesday;
    this.tuesdayStartTime = tuesdayStartTime;
    this.tuesdayEndTime = tuesdayEndTime;
    this.tuesdayRoomId = tuesdayRoomId;
    this.isAvailableWednesday = isAvailableWednesday;
    this.wednesdayStartTime = wednesdayStartTime;
    this.wednesdayEndTime = wednesdayEndTime;
    this.wednesdayRoomId = wednesdayRoomId;
    this.isAvailableThursday = isAvailableThursday;
    this.thursdayStartTime = thursdayStartTime;
    this.thursdayEndTime = thursdayEndTime;
    this.thursdayRoomId = thursdayRoomId;
    this.isAvailableFriday = isAvailableFriday;
    this.fridayStartTime = fridayStartTime;
    this.fridayEndTime = fridayEndTime;
    this.fridayRoomId = fridayRoomId;
  }

  /**
   * Gets all instruments taught by this instructor
   * @returns {Array<string>} Array of instruments (filtered for non-empty values)
   */
  get instruments() {
    return [this.instrument1, this.instrument2, this.instrument3, this.instrument4]
      .filter(Boolean);
  }

  /**
   * Gets all available days
   * @returns {Array<string>} Array of available day names
   */
  get availableDays() {
    const days = [];
    if (this.isAvailableMonday) days.push('monday');
    if (this.isAvailableTuesday) days.push('tuesday');
    if (this.isAvailableWednesday) days.push('wednesday');
    if (this.isAvailableThursday) days.push('thursday');
    if (this.isAvailableFriday) days.push('friday');
    return days;
  }
}
