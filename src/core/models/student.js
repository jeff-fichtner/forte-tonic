class Student {

    constructor(
        id,
        studentId,
        lastName,
        firstName,
        lastNickname,
        firstNickname,
        grade,
        parent1Id,
        parent2Id) {

        this.id = id;
        this.studentId = studentId;
        this.lastName = lastName;
        this.firstName = firstName;
        this.lastNickname = lastNickname;
        this.firstNickname = firstNickname;
        this.grade = grade;
        this.parent1Id = parent1Id;
        this.parent2Id = parent2Id;
    }

    get parents() {
        return [this.parent1Id, this.parent2Id];
    }
}