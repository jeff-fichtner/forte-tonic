function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Forte Functions') // Name of your custom menu
    .addSubMenu(ui.createMenu('Winter')
      .addItem('Process Winter Master Schedule', 'processedWinterMasterSchedule') // Add a menu item
      .addItem('Create Winter Registration List', 'createWinterRegistrationYAMMData')) // Add YAMM Registration script
    .addSubMenu(ui.createMenu('Spring')
      .addItem('Process Spring Master Schedule', 'processedSpringMasterSchedule') // Add a menu item
      .addItem('Create Spring Registration List', 'createSpringRegistrationYAMMData')) // Add YAMM Registration script
    .addToUi();
}

function processedWinterMasterSchedule() {
  const sheetUrl = "https://docs.google.com/spreadsheets/d/1Muyt2e5oF4XByjkIZLUE_8QgvDtF7L4hhjulK4iPWl8/edit#gid=1893135389";
  const masterScheduleSheetName = "Winter Master Schedule";
  const studentListSheetName = "Student List + ID Numbers";
  const outputSheetName = "Processed Schedule - Winter";

  const spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
  const masterSheet = spreadsheet.getSheetByName(masterScheduleSheetName);
  const studentListSheet = spreadsheet.getSheetByName(studentListSheetName);

  if (!masterSheet || !studentListSheet) {
    throw new Error(`One or more required sheets ("${masterScheduleSheetName}", "${studentListSheetName}") are missing.`);
  }

  let outputSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(outputSheetName);
  if (!outputSheet) {
    outputSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(outputSheetName);
  } else {
    outputSheet.clear();
  }

  const headers = [
    "Day", "Lesson Start Time", "Lesson End Time", "Student ID", "Student First Name", 
    "Student Last Name", "Grade", "Instrument", "Lesson Type", "Length", 
    "Teacher/Class", "Parent #1: First Name", "Parent #1: Last Name", "Parent #1: Mobile Phone", 
    "Parent #1: Email 1", "Parent #2: First Name", "Parent #2: Last Name", 
    "Parent #2: Mobile Phone", "Parent #2: Email 1"
  ];
  outputSheet.appendRow(headers);

  const dayRanges = {
    "Monday": ["B", "H"],
    "Tuesday": ["I", "O"],
    "Wednesday": ["P", "V"],
    "Thursday": ["W", "AC"],
    "Friday": ["AD", "AJ"]
  };

  const studentListData = studentListSheet.getDataRange().getValues();
  const studentMap = new Map();
  studentListData.forEach(row => {
    if (row[3]) studentMap.set(row[3], row);
    if (row[5]) studentMap.set(row[5], row);
  });

  function extractFirstLastName(fullName) {
    if (!fullName) return { firstName: "", lastName: "" };
    const parts = fullName.split(",").map(part => part.trim());
    return { lastName: parts[0] || "", firstName: parts[1] || "" };
  }

  function formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  function calculateEndTime(startTime, length) {
    if (!startTime || !length) return "";

    startTime = startTime.toString().trim();
    let hours, minutes;
    if (startTime.includes(":")) {
      const timeParts = startTime.split(":");
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10) || 0;
    } else {
      hours = parseInt(startTime, 10);
      minutes = 0;
    }

    if (isNaN(hours) || isNaN(minutes)) return "";

    const totalMinutes = hours * 60 + minutes + Number(length);
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;

    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  }

  const outputData = [];

  Object.keys(dayRanges).forEach((day) => {
    const [startCol, endCol] = dayRanges[day];
    const startColIndex = masterSheet.getRange(`${startCol}2`).getColumn();
    const endColIndex = masterSheet.getRange(`${endCol}2`).getColumn();

    const privateLessonData = masterSheet.getRange(2, startColIndex, 154, endColIndex - startColIndex + 1).getValues();
    for (let rowIndex = 0; rowIndex < privateLessonData.length; rowIndex += 11) {
      const teacher = privateLessonData[rowIndex][0];
      const lessonBlock = privateLessonData.slice(rowIndex + 2, rowIndex + 11);

      lessonBlock.forEach(row => {
        const studentName = row[1];
        if (studentName === "Available") {
          // Handle available slots
          let startTime = row[0];
          const length = row[5];
          if (startTime instanceof Date) {
            startTime = formatTime(startTime);
          }
          const endTime = calculateEndTime(startTime, length);

          outputData.push([
            day, startTime, endTime, "", "", "", "", "", "", length, teacher,
            "", "", "", "",
            "", "", "", ""
          ]);
        } else if (studentMap.has(studentName)) {
          // Process registered student data
          const { firstName: studentFirstName, lastName: studentLastName } = extractFirstLastName(studentName);
          const studentData = studentMap.get(studentName);
          const studentID = studentData[0];
          const { firstName: parent1First, lastName: parent1Last } = extractFirstLastName(studentData[6] || "");
          const { firstName: parent2First, lastName: parent2Last } = extractFirstLastName(studentData[9] || "");

          let startTime = row[0];
          const length = row[5];

          if (startTime instanceof Date) {
            startTime = formatTime(startTime);
          }

          const endTime = calculateEndTime(startTime, length);

          outputData.push([
            day, startTime, endTime, studentID, studentFirstName, studentLastName, row[2], 
            row[3], row[4], length, teacher, 
            parent1First, parent1Last, studentData[7], studentData[8],
            parent2First, parent2Last, studentData[10], studentData[11]
          ]);
        }
      });
    }
    // Handle group classes (unchanged)
    const groupClassData = masterSheet.getRange(157, startColIndex, 249 - 156, endColIndex - startColIndex + 1).getValues();
    let groupClassName = "";
    let groupStartTime = "";
    let groupEndTime = "";
    for (let i = 0; i < groupClassData.length; i++) {
      const row = groupClassData[i];

      if (row[0] === "Spot") {
        groupClassName = groupClassData[i - 1][0];
        groupStartTime = groupClassData[i - 1][5];
        groupEndTime = groupClassData[i - 1][6];
        continue;
      }

      const studentName = row[1];
      if (studentMap.has(studentName)) {
        const { firstName: studentFirstName, lastName: studentLastName } = extractFirstLastName(studentName);
        const studentData = studentMap.get(studentName);
        const studentID = studentData[0];
        const { firstName: parent1First, lastName: parent1Last } = extractFirstLastName(studentData[6] || "");
        const { firstName: parent2First, lastName: parent2Last } = extractFirstLastName(studentData[9] || "");

        outputData.push([
          day, groupStartTime, groupEndTime, studentID, studentFirstName, studentLastName, row[2], 
          row[3], "Group Class", row[5], groupClassName,
          parent1First, parent1Last, studentData[7], studentData[8],
          parent2First, parent2Last, studentData[10], studentData[11]
        ]);
      }
    }
  });

  outputSheet.getRange(2, 1, outputData.length, outputData[0].length).setValues(outputData);
  outputSheet.getRange(2, 2, outputData.length).setNumberFormat("h:mm");
  outputSheet.getRange(2, 3, outputData.length).setNumberFormat("h:mm");

  SpreadsheetApp.flush();
}

// Spring Functions
function processedSpringMasterSchedule() {
  const sheetUrl = "https://docs.google.com/spreadsheets/d/1Muyt2e5oF4XByjkIZLUE_8QgvDtF7L4hhjulK4iPWl8/edit#gid=1893135389";
  const masterScheduleSheetName = "Spring Master Schedule";
  const studentListSheetName = "Student List + ID Numbers";
  const outputSheetName = "Processed Schedule - Spring";

  const spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
  const masterSheet = spreadsheet.getSheetByName(masterScheduleSheetName);
  const studentListSheet = spreadsheet.getSheetByName(studentListSheetName);

  if (!masterSheet || !studentListSheet) {
    throw new Error(`One or more required sheets ("${masterScheduleSheetName}", "${studentListSheetName}") are missing.`);
  }

  let outputSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(outputSheetName);
  if (!outputSheet) {
    outputSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(outputSheetName);
  } else {
    outputSheet.clear();
  }

  const headers = [
    "Day", "Lesson Start Time", "Lesson End Time", "Student ID", "Student First Name", 
    "Student Last Name", "Grade", "Instrument", "Lesson Type", "Length", 
    "Teacher/Class", "Parent #1: First Name", "Parent #1: Last Name", "Parent #1: Mobile Phone", 
    "Parent #1: Email 1", "Parent #2: First Name", "Parent #2: Last Name", 
    "Parent #2: Mobile Phone", "Parent #2: Email 1"
  ];
  outputSheet.appendRow(headers);

  const dayRanges = {
    "Monday": ["B", "H"],
    "Tuesday": ["I", "O"],
    "Wednesday": ["P", "V"],
    "Thursday": ["W", "AC"],
    "Friday": ["AD", "AJ"]
  };

  const studentListData = studentListSheet.getDataRange().getValues();
  const studentMap = new Map();
  studentListData.forEach(row => {
    if (row[3]) studentMap.set(row[3], row);
    if (row[5]) studentMap.set(row[5], row);
  });

  function extractFirstLastName(fullName) {
    if (!fullName) return { firstName: "", lastName: "" };
    const parts = fullName.split(",").map(part => part.trim());
    return { lastName: parts[0] || "", firstName: parts[1] || "" };
  }

  function formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  function calculateEndTime(startTime, length) {
    if (!startTime || !length) return "";

    startTime = startTime.toString().trim();
    let hours, minutes;
    if (startTime.includes(":")) {
      const timeParts = startTime.split(":");
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10) || 0;
    } else {
      hours = parseInt(startTime, 10);
      minutes = 0;
    }

    if (isNaN(hours) || isNaN(minutes)) return "";

    const totalMinutes = hours * 60 + minutes + Number(length);
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;

    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  }

  const outputData = [];

  Object.keys(dayRanges).forEach((day) => {
    const [startCol, endCol] = dayRanges[day];
    const startColIndex = masterSheet.getRange(`${startCol}2`).getColumn();
    const endColIndex = masterSheet.getRange(`${endCol}2`).getColumn();

    const privateLessonData = masterSheet.getRange(2, startColIndex, 154, endColIndex - startColIndex + 1).getValues();
    for (let rowIndex = 0; rowIndex < privateLessonData.length; rowIndex += 11) {
      const teacher = privateLessonData[rowIndex][0];
      const lessonBlock = privateLessonData.slice(rowIndex + 2, rowIndex + 11);

      lessonBlock.forEach(row => {
        const studentName = row[1];
        if (studentName === "Available") {
          // Handle available slots
          let startTime = row[0];
          const length = row[5];
          if (startTime instanceof Date) {
            startTime = formatTime(startTime);
          }
          const endTime = calculateEndTime(startTime, length);

          outputData.push([
            day, startTime, endTime, "", "", "", "", "", "", length, teacher,
            "", "", "", "",
            "", "", "", ""
          ]);
        } else if (studentMap.has(studentName)) {
          // Process registered student data
          const { firstName: studentFirstName, lastName: studentLastName } = extractFirstLastName(studentName);
          const studentData = studentMap.get(studentName);
          const studentID = studentData[0];
          const { firstName: parent1First, lastName: parent1Last } = extractFirstLastName(studentData[6] || "");
          const { firstName: parent2First, lastName: parent2Last } = extractFirstLastName(studentData[9] || "");

          let startTime = row[0];
          const length = row[5];

          if (startTime instanceof Date) {
            startTime = formatTime(startTime);
          }

          const endTime = calculateEndTime(startTime, length);

          outputData.push([
            day, startTime, endTime, studentID, studentFirstName, studentLastName, row[2], 
            row[3], row[4], length, teacher, 
            parent1First, parent1Last, studentData[7], studentData[8],
            parent2First, parent2Last, studentData[10], studentData[11]
          ]);
        }
      });
    }
    // Handle group classes (unchanged)
    const groupClassData = masterSheet.getRange(157, startColIndex, 249 - 156, endColIndex - startColIndex + 1).getValues();
    let groupClassName = "";
    let groupStartTime = "";
    let groupEndTime = "";
    for (let i = 0; i < groupClassData.length; i++) {
      const row = groupClassData[i];

      if (row[0] === "Spot") {
        groupClassName = groupClassData[i - 1][0];
        groupStartTime = groupClassData[i - 1][5];
        groupEndTime = groupClassData[i - 1][6];
        continue;
      }

      const studentName = row[1];
      if (studentMap.has(studentName)) {
        const { firstName: studentFirstName, lastName: studentLastName } = extractFirstLastName(studentName);
        const studentData = studentMap.get(studentName);
        const studentID = studentData[0];
        const { firstName: parent1First, lastName: parent1Last } = extractFirstLastName(studentData[6] || "");
        const { firstName: parent2First, lastName: parent2Last } = extractFirstLastName(studentData[9] || "");

        outputData.push([
          day, groupStartTime, groupEndTime, studentID, studentFirstName, studentLastName, row[2], 
          row[3], "Group Class", row[5], groupClassName,
          parent1First, parent1Last, studentData[7], studentData[8],
          parent2First, parent2Last, studentData[10], studentData[11]
        ]);
      }
    }
  });

  outputSheet.getRange(2, 1, outputData.length, outputData[0].length).setValues(outputData);
  outputSheet.getRange(2, 2, outputData.length).setNumberFormat("h:mm");
  outputSheet.getRange(2, 3, outputData.length).setNumberFormat("h:mm");

  SpreadsheetApp.flush();
}
