class Instructor {

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
        fridayRoomId) {

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

    get fullName() {
        return `${this.firstName} ${this.lastName}`;
    }
}
