function populateLessonTimes() {
  const forms = [
    '1YwZ-8WOcHVTDZx_JE7aJwLyIGbDo_qkAQTcMxFim8G4',
    '1HNcVD4K_-8CIDjw9L0YMyTcBBi0d9GjthomyppnmMWM',
    '19nnROmOZb3BxlvYUMT81QW7QMaL1iGYUOue2TDhBXBc',
    '1Z-Tak5LBovsGtsvJ20EoXe4KsDPsMPicJSe8U12mQQg'
  ];

  for (let i = 0; i < forms.length; i++) {
    const form = FormApp.openById(forms[i]);
    const sheet = SpreadsheetApp.openById('1zAeXxq1oQ7im6eRPvFWZhZY1U9cXUY3GYaETHuu8eqA').getSheetByName('Winter Trimester Master Schedule');
    
    const data = sheet.getDataRange().getValues();
    const noLessonsMessage = sheet.getRange("U2").getValue();
    
    const lessons = {};
    const allTeachers = ["Andrew Kunz", "Cal Reichenbach", "Cesar Cancino", "Daria Mautner", "Jeanette Wilkin", 
                        "Jeff Rosen", "Jesse Brewster", "Justin McCoy", "Lisa Gorman", "Melody Nishinaga", 
                        "Paul Montes", "Phoebe Dinga", "Rob Caniglia", "Rob Thomure", "Ruth Chou", "Ryan Low"];
    
    // Initialize lessons object for each teacher
    allTeachers.forEach(teacher => lessons[teacher] = []);

    // Loop through data and populate lessons based on availability
    for (let i = 1; i < data.length; i++) {
      const [lessonId, day, time, teacher, duration, , , instrument, availability] = data[i];
      if (teacher && (availability === "TRUE" || availability === true)) {
        const lessonString = `${day}, ${Utilities.formatDate(new Date(time), Session.getScriptTimeZone(), "h:mm a")} - ${instrument} (${duration} minutes) | ID: ${lessonId}`;
        lessons[teacher].push(lessonString);
      }
    }

    const lessonItems = form.getItems(FormApp.ItemType.CHECKBOX);
    const lessonMap = {}; // Map to store items by title for faster access

    // Store form items by title in lessonMap
    lessonItems.forEach(item => {
      lessonMap[item.getTitle()] = item.asCheckboxItem();
    });

    // Populate form with lesson options or no lessons message
    allTeachers.forEach(teacher => {
      const questionTitle = `Available Lessons for ${teacher}`;
      const lessonOptions = lessons[teacher].length > 0 ? lessons[teacher] : [noLessonsMessage];
      lessonOptions.push(`None of the lessons above work for our schedule. Please place us on the waitlist for ${teacher}`);


      if (lessonMap[questionTitle]) {
        lessonMap[questionTitle].setChoiceValues(lessonOptions);
        Logger.log(`Set options for ${teacher}: ${lessonOptions.join(", ")}`);
      }
    });
  }
}
