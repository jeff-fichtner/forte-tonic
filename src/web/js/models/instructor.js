/**
 *
 */
export class Instructor {
  /**
   *
   */
  constructor({
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
    mondayStartTime,
    mondayEndTime,
    mondayRoomId,
    tuesdayStartTime,
    tuesdayEndTime,
    tuesdayRoomId,
    wednesdayStartTime,
    wednesdayEndTime,
    wednesdayRoomId,
    thursdayStartTime,
    thursdayEndTime,
    thursdayRoomId,
    fridayStartTime,
    fridayEndTime,
    fridayRoomId,
  }) {
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
    this.mondayStartTime = mondayStartTime;
    this.mondayEndTime = mondayEndTime;
    this.mondayRoomId = mondayRoomId;
    this.tuesdayStartTime = tuesdayStartTime;
    this.tuesdayEndTime = tuesdayEndTime;
    this.tuesdayRoomId = tuesdayRoomId;
    this.wednesdayStartTime = wednesdayStartTime;
    this.wednesdayEndTime = wednesdayEndTime;
    this.wednesdayRoomId = wednesdayRoomId;
    this.thursdayStartTime = thursdayStartTime;
    this.thursdayEndTime = thursdayEndTime;
    this.thursdayRoomId = thursdayRoomId;
    this.fridayStartTime = fridayStartTime;
    this.fridayEndTime = fridayEndTime;
    this.fridayRoomId = fridayRoomId;
  }
  /**
   *
   */
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
  /**
   *
   */
  get lastFirst() {
    return `${this.lastName}, ${this.firstName}`;
  }
  /**
   *
   */
  get isAvailableMonday() {
    return this.mondayStartTime && this.mondayEndTime;
  }
  /**
   *
   */
  get isAvailableTuesday() {
    return this.tuesdayStartTime && this.tuesdayEndTime;
  }
  /**
   *
   */
  get isAvailableWednesday() {
    return this.wednesdayStartTime && this.wednesdayEndTime;
  }
  /**
   *
   */
  get isAvailableThursday() {
    return this.thursdayStartTime && this.thursdayEndTime;
  }
  /**
   *
   */
  get isAvailableFriday() {
    return this.fridayStartTime && this.fridayEndTime;
  }
  /**
   *
   */
  get instruments() {
    const instruments = [];
    if (this.instrument1) instruments.push(this.instrument1);
    if (this.instrument2) instruments.push(this.instrument2);
    if (this.instrument3) instruments.push(this.instrument3);
    if (this.instrument4) instruments.push(this.instrument4);
    return instruments;
  }
}

// For backwards compatibility with existing code
window.Instructor = Instructor;
