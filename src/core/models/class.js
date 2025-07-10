class Class {

    constructor(
        id,
        instructorId,
        day,
        startTime,
        length,
        instrument,
        title,
        size,
        minimumGrade,
        maximumGrade) {

        this.id = id;
        this.instructorId = instructorId;
        this.day = day;
        this.startTime = startTime;
        this.length = length;
        this.instrument = instrument;
        this.title = title;
        this.size = size;
        this.minimumGrade = minimumGrade;
        this.maximumGrade = maximumGrade;
    }

    // get endTime() {
    //     return this.startTime + this.length;
    // }
}