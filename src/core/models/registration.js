class Registration {

    constructor(
        id,
        studentId,
        instructorId,
        day,
        startTime,
        length,
        registrationType,
        roomId,
        instrument,
        transportationType,
        notes,
        classId,
        expectedStartDate,
        createdAt,
        createdBy) {

        this.id = id;
        this.studentId = studentId;
        this.instructorId = instructorId;
        this.day = day;
        this.startTime = startTime;
        this.length = length;
        this.registrationType = registrationType;
        this.roomId = roomId;
        this.instrument = instrument;
        this.transportationType = transportationType;
        this.notes = notes;
        this.classId = classId; // For group registrations
        this.expectedStartDate = expectedStartDate;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
    }
}