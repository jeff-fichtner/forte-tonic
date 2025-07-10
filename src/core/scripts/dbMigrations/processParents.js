// parents are attached to students
// this separates them into unique rows, assigns IDs, and adds them to the student sheet
function processParents() {
  const workingSpreadsheet = SpreadsheetApp.openById('17zTUME5PD3FHQmxyUIUn1S_u8QCVeMNf0VRPZXR0FlE');
  ErrorHandling.throwIfNo(workingSpreadsheet, 'No working spreadsheet found');

  const studentsSheet = workingSpreadsheet.getSheetById('1370055556'); // students-original
  ErrorHandling.throwIfNo(studentsSheet, `No students-original sheet found`);
  const parentsSheet = workingSpreadsheet.getSheetById('836793793'); // parents
  ErrorHandling.throwIfNo(parentsSheet, `No parents sheet found`);

  const studentData = studentsSheet.getDataRange().getValues().slice(1).map(x => new OriginalStudent(...x));
  
  const parentMap = new Map(); // To store unique parents and their IDs

  for (let i = 0; i < studentData.length; i++) {
    const student = studentData[i];
    
    const parent1Id = student.parent1Email ? `${student.parent1Email}_${student.parent1LastName}_${student.parent1FirstName}` : null;
    const parent2Id = student.parent2Email ? `${student.parent2Email}_${student.parent2LastName}_${student.parent2FirstName}` : null;

    let parent1;
    if (parent1Id && !parentMap.has(parent1Id)) {
      parent1 = { email: student.parent1Email, lastName: student.parent1LastName, firstName: student.parent1FirstName, phone: student.parent1Phone };
      parentMap.set(parent1Id, parent1);
      parentsSheet.appendRow([parent1Id, parent1.email, parent1.lastName, parent1.firstName, parent1.phone ? parent1.phone : '']);
      Logger.log(`Appending row ${parentMap.size} - ${parent1Id}`);
    }

    let parent2;
    if (parent2Id && !parentMap.has(parent2Id)) {
      parent2 = { email: student.parent2Email, lastName: student.parent2LastName, firstName: student.parent2FirstName, phone: student.parent2Phone };
      parentMap.set(parent2Id, parent2);
      parentsSheet.appendRow([parent2Id, parent2.email, parent2.lastName, parent2.firstName, parent2.phone ? parent2.phone : '']);
      Logger.log(`Appending row ${parentMap.size} - ${parent2Id}`);
    }

    const parentMapLength = parentMap.size;
    const totalStudentsLength = studentData.length;
    
    studentsSheet.getRange(i + 2, 14 + 1).setValue(parent1Id);
    studentsSheet.getRange(i + 2, 14 + 2).setValue(parent2Id);
  }

  Logger.log("Processing complete. Check the new spreadsheet.");
}

class OriginalStudent {

  constructor(
    studentid,
    lastName,
    firstName,
    fullName,
    grade,
    lastNickname,
    firstNickname,
    fullNickname,
    parent1FullName,
    parent1Phone,
    parent1Email,
    parent2FullName,
    parent2Phone,
    parent2Email) {

    this.studentid = studentid;
    this.lastName = lastName;
    this.firstName = firstName;
    this.fullName = fullName;
    this.grade = grade;
    this.lastNickname = lastNickname;
    this.firstNickname = firstNickname;
    this.fullNickname = fullNickname;
    this.parent1FullName = parent1FullName;
    this.parent1Phone = parent1Phone;
    this.parent1Email = parent1Email;
    this.parent2FullName = parent2FullName;
    this.parent2Phone = parent2Phone;
    this.parent2Email = parent2Email;
  }

  get parent1FirstName() {
    return this.parent1FullName.split(', ')[1];
  }

  get parent1LastName() {
    return this.parent1FullName.split(', ')[0];
  }

  get parent2FirstName() {
    return this.parent2FullName.split(', ')[1];
  }

  get parent2LastName() {
    return this.parent2FullName.split(', ')[0];
  }
}