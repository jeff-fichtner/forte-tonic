function createWinterRegistrationYAMMData() {
  const processedSheetName = "Processed Schedule - Winter";
  const lsSheetName = "Winter Registration - LS (YAMM Data)";
  const usSheetName = "Winter Registration - US (YAMM Data)";

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const processedSheet = spreadsheet.getSheetByName(processedSheetName);

  if (!processedSheet) {
    throw new Error(`The sheet "${processedSheetName}" does not exist.`);
  }

  // Create or clear LS and US sheets
  const initializeSheet = (sheetName) => {
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
    } else {
      sheet.clear();
    }
    sheet.appendRow([
      "Email", "CC Email", "Student First Name", "Student Last Name", "Schedule Summary",
      "Parent #1: First Name", "Parent #1: Last Name", "Parent #1: Mobile Phone", "Parent #1: Email 1",
      "Parent #2: First Name", "Parent #2: Last Name", "Parent #2: Mobile Phone", "Parent #2: Email 1"
    ]);
    return sheet;
  };

  const lsSheet = initializeSheet(lsSheetName);
  const usSheet = initializeSheet(usSheetName);

  const processedData = processedSheet.getDataRange().getValues();

  const groupedData = new Map();
  processedData.slice(1).forEach((row) => {
    const day = row[0]; // Column A
    const startTime = row[1]; // Column B
    const endTime = row[2]; // Column C
    const studentID = row[3]; // Column D
    const studentFirstName = row[4]; // Column E
    const studentLastName = row[5]; // Column F
    const grade = row[6]; // Column G
    const instrument = row[7]; // Column H
    const lessonType = row[8]; // Column I
    const teacherOrClass = row[10]; // Column K
    const parent1FirstName = row[11]; // Column L
    const parent1LastName = row[12]; // Column M
    const parent1Mobile = row[13]; // Column N
    const parent1Email = row[14]; // Column O
    const parent2FirstName = row[15]; // Column P
    const parent2LastName = row[16]; // Column Q
    const parent2Mobile = row[17]; // Column R
    const parent2Email = row[18]; // Column S

    if (!studentID || !startTime || !endTime) {
      Logger.log(`Skipping row for Student ID: ${studentID || "Missing"}`);
      return;
    }

    // Format start and end times in "h:mm" format
    const formattedStartTime = Utilities.formatDate(new Date(startTime), Session.getScriptTimeZone(), "h:mm");
    const formattedEndTime = Utilities.formatDate(new Date(endTime), Session.getScriptTimeZone(), "h:mm");

    const lessonSummary = `${day}: ${formattedStartTime} - ${formattedEndTime}, ${instrument} (${lessonType}) with ${teacherOrClass}`;

    if (!groupedData.has(studentID)) {
      groupedData.set(studentID, {
        studentFirstName,
        studentLastName,
        parent1FirstName,
        parent1LastName,
        parent1Mobile,
        parent1Email,
        parent2FirstName,
        parent2LastName,
        parent2Mobile,
        parent2Email,
        lessons: [],
        grade
      });
    }

    groupedData.get(studentID).lessons.push(lessonSummary);
  });

  const outputLSData = [];
  const outputUSData = [];

  groupedData.forEach((studentInfo) => {
    const rowData = [
      studentInfo.parent1Email,
      studentInfo.parent2Email || "",
      studentInfo.studentFirstName,
      studentInfo.studentLastName,
      studentInfo.lessons.join("\n"), // Flattened schedule summary
      studentInfo.parent1FirstName,
      studentInfo.parent1LastName,
      studentInfo.parent1Mobile,
      studentInfo.parent1Email,
      studentInfo.parent2FirstName || "",
      studentInfo.parent2LastName || "",
      studentInfo.parent2Mobile || "",
      studentInfo.parent2Email || ""
    ];

    if (["K", 1, "1", 2, "2", 3, "3", 4, "4"].includes(studentInfo.grade)) {
      outputLSData.push(rowData);
    } else if ([5, "5", 6, "6", 7, "7", 8, "8"].includes(studentInfo.grade)) {
      outputUSData.push(rowData);
    }
  });

  if (outputLSData.length > 0) {
    lsSheet.getRange(2, 1, outputLSData.length, outputLSData[0].length).setValues(outputLSData);
  }

  if (outputUSData.length > 0) {
    usSheet.getRange(2, 1, outputUSData.length, outputUSData[0].length).setValues(outputUSData);
  }

  SpreadsheetApp.flush();
  Logger.log("YAMM-ready data creation completed successfully.");
}
