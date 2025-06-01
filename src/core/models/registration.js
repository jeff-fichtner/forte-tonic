class Registration {

    constructor(
        id,
        studentId,
        startTime,
        length,
        lessonType,
        day,
        instructorId,
        roomId,
        instrument,
        cost,
        fallCost,
        winterCost,
        springCost,
        enrollmentType,
        transportationType,
        notes) {

        this.id = id;
        this.studentId = studentId;
        this.startTime = startTime;
        this.length = length;
        this.lessonType = lessonType;
        this.day = day;
        this.instructorId = instructorId;
        this.roomId = roomId;
        this.instrument = instrument;
        this.cost = cost;
        this.fallCost = fallCost;
        this.winterCost = winterCost;
        this.springCost = springCost;
        this.enrollmentType = enrollmentType;
        this.transportationType = transportationType;
        this.notes = notes;
    }
}