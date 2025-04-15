function doGet(request) {
  return HtmlService.createTemplateFromFile('index')
      .evaluate();
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

function getStudentsForEmail(email) {
  return email;
}

function getCurrentLessonsForStudent(studentId) {
  return studentId;
}

function addLessonForStudent(studentId, lessonId) {
  return studentId;
}

function deleteLessonForStudent(studentId, lessonId) {
  return studentId;
}

function loadLessonsForInstrument(studentId, instrumentId) {
  return studentId;
}
