function populateFormOnOpen() {
  const form = FormApp.getActiveForm();
  const spreadsheet = SpreadsheetApp.openById("1zAeXxq1oQ7im6eRPvFWZhZY1U9cXUY3GYaETHuu8eqA");
  const privateLessonsSheet = spreadsheet.getSheetByName("Fall Trimester Master Schedule");
  const groupClassesSheet = spreadsheet.getSheetByName("Instructor Info");

  // Gather student names dynamically from form questions only once
  let studentSelectionItem = form.getItems()[1].asListItem();
  let studentNames = studentSelectionItem.getChoices().map(x => x.getValue());

  // Cache form items to avoid multiple calls to getItems
  const formItems = form.getItems(FormApp.ItemType.CHECKBOX);
  const formItemsMap = new Map();
  formItems.forEach(item => formItemsMap.set(item.getTitle(), item.asCheckboxItem()));

  // Fetch and populate private lessons for each student
  const privateLessonsData = privateLessonsSheet.getDataRange().getValues();
  studentNames.forEach(studentName => {
    const lessons = getLessonsForStudent(privateLessonsData, studentName);
    if (lessons.length > 0) {
      populateStudentQuestions(formItemsMap, studentName, lessons);
    }
    // Fetch group classes and populate the relevant question
    const groupClasses = getGroupClasses(groupClassesSheet);
    populateGroupClassQuestion(formItemsMap, groupClasses, studentName);
  });
}

// Fetch all lessons for a given student from the master schedule
function getLessonsForStudent(data, studentName) {
  return data
    .filter(row => row[5] === studentName) // Column F: Student Name
    .map(row => {
      const day = row[1];  // Column B: Day
      const time = Utilities.formatDate(new Date(row[2]), Session.getScriptTimeZone(), "h:mm a");  // Column C: Time
      const instrument = row[7];  // Column H: Instrument
      const teacher = row[3];  // Column D: Teacher
      const duration = row[4];  // Column E: Duration
      const lessonId = row[0];  // Column A: Lesson ID
      return `${day}, ${time} - ${instrument} with ${teacher} (${duration} minutes) | ID: ${lessonId}`;
    });
}

// Fetch unique group classes from the "Instructor Info" sheet
function getGroupClasses(sheet) {
  const data = sheet.getRange(2, 4, sheet.getLastRow() - 1, 11).getValues(); // Columns D:K, starting from row 2
  return Array.from(new Set(data
    .filter(row => row[7]) // Column K: Class Name, only add if non-empty
    .map(row => {
      const day = row[1];  // Column E: Day
      const time = Utilities.formatDate(new Date(row[2]), Session.getScriptTimeZone(), "h:mm a");  // Column F: Time
      const classname = row[7];  // Column K: Class Name
      const teacher = row[3];  // Column G: Teacher
      const duration = row[4];  // Column H: Duration
      const groupId = row[0];  // Column D: Group ID
      const graderange = row[9]; // Column M: Grade Range
      return `${classname} with ${teacher} | ${day}, ${time} (${duration} minutes) | ${graderange} | ID: ${groupId}`;
    })
  ));
}

// Populate the group class question with group class data
function populateGroupClassQuestion(formItemsMap, groupClasses, studentName) {
  const groupClassTitle = `Would you like to sign ${studentName} up for any of these group classes we are offering in the Winter Trimester?`;
  const checkboxItem = formItemsMap.get(groupClassTitle);

  if (checkboxItem) {
    checkboxItem.setChoices(groupClasses.map(groupClass => checkboxItem.createChoice(groupClass)));
    Logger.log(`Populated group class question: "${groupClassTitle}"`);
  }
}

// Populate all questions that contain the student's name with private lesson data
function populateStudentQuestions(formItemsMap, studentName, lessons) {
  let populatedCount = 0;
  const studentQuestions = Array.from(formItemsMap.keys()).filter(title => title.includes(studentName));

  studentQuestions.some(title => {
    const checkboxItem = formItemsMap.get(title);
    if (populatedCount >= 3) return true; // Limit to 3 questions per student

    if (title.includes("Which of the private lessons below would you like to change to another time for")) {
      const filteredLessons = lessons.filter(lesson => !lesson.match(/ID: G([1-9]|1[0-9]|20)$/)); // Exclude IDs G1-G20
      const choices = filteredLessons.length > 0 ? filteredLessons : ["There are no private lessons to change."];
      checkboxItem.setChoices(choices.map(choice => checkboxItem.createChoice(choice)));
    } else {
      checkboxItem.setChoices(lessons.map(lesson => checkboxItem.createChoice(lesson)));
    }
    populatedCount++;
    return false;
  });
}