class Class {

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
        maximumGrade) {

        this.id = id;
        this.instructorId = instructorId;
        this.day = day;
        this.startTime = DateHelpers.parseGoogleSheetsDate(startTime);
        this.length = length;
        this.endTime = DateHelpers.parseGoogleSheetsDate(endTime);
        this.instrument = instrument;
        this.title = title;
        this.size = size;
        this.minimumGrade = minimumGrade;
        this.maximumGrade = maximumGrade;
    }
}