// save data?

const doGet =
  (request) => {
    return HtmlService.createTemplateFromFile('index')
        .evaluate();
  }

const include =
  (filename) => {
    return HtmlService.createHtmlOutputFromFile(filename)
        .getContent();
  }

const initialize =
  () => {
    // ensure all tables exist

    // check existing email
    const activeUserEmail = Session.getActiveUser().getEmail();
    console.log(`active user email: ${activeUserEmail}`);
    // get all teachers
    // get all students/parents
    // get all lessons
  };

const addLesson =
  (studentId, lessonId) => {
    return studentId;
  }

const deleteLesson =
  (studentId, lessonId) => {
    return studentId;
  }

const calculateAvailableLessons =
  (studentId, instrumentId, length) => {
    return studentId;
  }
