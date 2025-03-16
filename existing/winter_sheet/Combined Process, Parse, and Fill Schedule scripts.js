const _addingToScheduleOptions = ["Re-enroll", "Sign Up", "Changing To"];
const _removingFromScheduleOptions = ["Drop", "Changing From"];

function compileAndParseResponses() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const responseTabs =
    [
      ['Form 1 Responses (A-H)', '1YwZ-8WOcHVTDZx_JE7aJwLyIGbDo_qkAQTcMxFim8G4'],
      ['Form 2 Responses (J-O)', '1HNcVD4K_-8CIDjw9L0YMyTcBBi0d9GjthomyppnmMWM'],
      ['Form 3 Responses (P-Z)', '19nnROmOZb3BxlvYUMT81QW7QMaL1iGYUOue2TDhBXBc']
    ];
  const compilationTab = ss.getSheetByName('Form Responses');
  const parsedResponsesSheet = ss.getSheetByName("Parsed Form Responses");
  const scheduleSheet = ss.getSheetByName("Fall Trimester Master Schedule");

  // Clear the compilation tab
  compilationTab.clear();

  // Set headers in Row 1 for compilation
  const headers = [
    'Timestamp', 'Email Address', 'Select Your Student', 
    'What grade level is your student in?', 
    'Will your student be doing Late Bus or Late Pickup for Winter Trimester?', 
    'Re-enroll', 'Drop', 'Change Time?', 'Try to Change', 
    'Sign Up', 'Requests/Comments',
    'Available Lessons for Andrew Kunz', 'Available Lessons for Cal Reichenbach',
    'Available Lessons for Cesar Cancino', 'Available Lessons for Daria Mautner',
    'Available Lessons for Jeanette Wilkin', 'Available Lessons for Jeff Rosen',
    'Available Lessons for Jesse Brewster', 'Available Lessons for Justin McCoy',
    'Available Lessons for Lisa Gorman', 'Available Lessons for Melody Nishinaga',
    'Available Lessons for Paul Montes', 'Available Lessons for Phoebe Dinga',
    'Available Lessons for Rob Caniglia', 'Available Lessons for Rob Thomure',
    'Available Lessons for Ruth Chou', 'Available Lessons for Ryan Low',
    'NEW OPTION COLUMN', 'Edit URL'
  ];

  compilationTab.getRange(1, 1, 1, headers.length).setValues([headers]); // Set headers in Row 1

  const allCompiledRows = []; // Array to hold all compiled rows

  // Iterate over each response tab
  responseTabs.forEach(tab => {
    const sheet = ss.getSheetByName(tab[0]);
    const data = sheet.getDataRange().getValues();
    const headerRow = data[0]; // Store headers for later search

    let formResponses;
    try {
      formResponses = FormApp.openById(tab[1]).getResponses();
    } catch (ex) {
      Logger.log(`${ex} Failed to get form with ID ${tab[1]}`);
    }

    // Loop through each row (starting from index 1 to skip headers)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const studentName = row[2]; // Column C holds the student's name

      // Find the 5 columns corresponding to the student name in the headers
      const studentColIndex = headerRow.findIndex(header => header.includes(studentName));

      if (studentColIndex === -1)
        continue; // Skip if student name not found

      // Extract the 5 relevant columns (F-J in the compilation tab)
      const reEnroll = row[studentColIndex];
      const drop = row[studentColIndex + 1];
      const changeTime = row[studentColIndex + 2];
      const tryChange = row[studentColIndex + 3];
      const signUp = row[studentColIndex + 4];

      // Extract the Requests/Comments column
      const requestsComments = row[headerRow.length - 1]; // Last column

      // Extract all teacher availability columns (L:AA in the compilation tab)
      const availabilityStart = headerRow.findIndex(header => header.startsWith('Available Lessons for'));
      const availability = row.slice(availabilityStart, headerRow.length - 1);
      const waitLists = row.filter(x => String(x)?.includes("above work for our schedule. Please place us on the waitlist for") ?? false);
      
      // Compile row data
      const compiledRow = [
        row[0], // Timestamp
        row[1], // Email Address
        row[2], // Select Your Student
        row[3], // Grade Level
        row[4], // Late Bus or Pickup
        reEnroll,
        drop,
        changeTime === "Yes" ? changeTime : null,
        tryChange,
        signUp, // F-J
        requestsComments, // K
        ...availability,
        waitLists.length > 0 ? waitLists.join(", ") : "",
        formResponses ? formResponses[i - 1].getEditResponseUrl() : "",
      ];

      allCompiledRows.push(compiledRow); // Store compiled row for later
      debugger
    }
  });

  // Sort compiled rows by timestamp (oldest to newest)
  allCompiledRows.sort((a, b) => new Date(a[0]) - new Date(b[0]));

  // Append all compiled rows to the Form Responses tab
  if (allCompiledRows.length > 0) {
    compilationTab.getRange(2, 1, allCompiledRows.length, headers.length).setValues(allCompiledRows);
  }

  Logger.log('Compilation complete!');

  // Now, parse the compiled responses
  parseResponses(compilationTab, parsedResponsesSheet, scheduleSheet);

  // Run the update function after parsing
  updateWinterTrimesterSchedule();

  populateLessonTimes1();
  populateLessonTimes2();
  populateLessonTimes3();
  populateLessonTimes4();
  processGroupClasses();
}

function parseResponses(formResponsesSheet, parsedResponsesSheet, scheduleSheet) {
  // Clear previous data and ensure only correct headers remain
  parsedResponsesSheet.clearContents();

  // Clear existing conditional formatting
  clearConditionalFormatting(parsedResponsesSheet);

  // Set the headers on the Parsed Form Responses tab
  const headers = [
    "Timestamp", "Email Address", "Student Name", "Grade", 
    "Will your student be doing Late Bus or Late Pickup?", 
    "Day", "Time", "Instrument", "Teacher", "Length", 
    "Lesson ID", "Change Time?", "Requests / Comments?", "Action", "Add To WaitList", "Edit URL"
  ];
  parsedResponsesSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Get all the data from the Form Responses tab
  const formResponsesData = formResponsesSheet.getDataRange().getValues();

  // Get the Fall Trimester Schedule data and create a map of lesson IDs to schedule info
  const scheduleData = scheduleSheet.getDataRange().getValues();
  const scheduleMap = createLessonIDMap(scheduleData);

  // Store all parsed rows in an array
  const parsedRows = [];

  // Loop through each row of form responses (starting from row 2 to skip headers)
  for (let i = 1; i < formResponsesData.length; i++) {
    const row = formResponsesData[i];

    // Copy columns A-E (Timestamp, Email, Student Name, Grade, Late Bus/Pickup)
    const parsedRow = [...row.slice(0, 5)];

    // Copy column H (Change Time?) to column L of Parsed Form Responses
    const changeTime = row[7]; // Column H is at index 7 (0-based)

    // Copy column K (Requests / Comments) to column M
    const requestsComments = row[10]; // Column K is at index 10 (0-based)

    // Process relevant columns: Re-enroll (F), Drop (G), Changing From (I), Sign Up (J), and 12-27
    const relevantColumns = [
      { col: 5, action: "Re-enroll" }, // Column F
      { col: 6, action: "Drop" },      // Column G
      { col: 8, action: "Changing From" }, // Column I
      { col: 9, action: "Sign Up" },      // Column J
      ...Array.from({ length: 16 }, (_, k) => ({ col: 12 + k })) // Columns 12-27
    ];

    relevantColumns.forEach(({ col, action }) => {
      const cell = row[col] || "";
      Logger.log(`Row ${i + 1}, Column ${col}: "${cell}"`); // Debug log

      if (cell) {
        const lessonIDs = extractLessonIDs(cell); // Extract lesson IDs (L/G + number)

        // For each lesson ID, retrieve schedule info and prepare a new row
        lessonIDs.forEach((lessonID) => {
          const scheduleInfo = scheduleMap[lessonID];

          if (scheduleInfo) {
            const newRow = [
              ...parsedRow,         // Common fields A-E
              ...scheduleInfo,      // Schedule info (Day, Time, Instrument, Teacher, Length)
              lessonID,             // Lesson ID to Column K
              changeTime || "",     // Change Time? to Column L
              requestsComments || "", // Requests / Comments to Column M
              action || "",          // Action (Re-enroll, Drop, Changing From, Sign Up) to Column N
              row[row.length - 2],
              row[row.length - 1]
            ];
            parsedRows.push(newRow); // Store parsed row for later appending
          } else {
            Logger.log(`Lesson ID ${lessonID} not found in the schedule.`);
          }
        });
      }
    });

    // If trying to change a lesson, check columns L-AA for new lesson IDs
    const tryToChangeCell = row[8]; // Column I (Changing From) is at index 8
    const changeTimeYes = changeTime === "Yes"; // Check if Change Time? is "Yes"

    if (tryToChangeCell && changeTimeYes) {
      for (let j = 11; j < 27; j++) { // Columns L (11) to AA (26)
        const newLessonIDCell = row[j];
        if (newLessonIDCell) {
          const newLessonIDsExtracted = extractLessonIDs(newLessonIDCell);
          newLessonIDsExtracted.forEach((newLessonID) => {
            const newScheduleInfo = scheduleMap[newLessonID];
            if (newScheduleInfo) {
              const newRow = [
                ...parsedRow,         // Common fields A-E
                ...newScheduleInfo,   // Schedule info (Day, Time, Instrument, Teacher, Length)
                newLessonID,          // New Lesson ID
                changeTime || "",     // Change Time? to Column L
                requestsComments || "", // Requests / Comments to Column M
                "Changing To",               // Action for the new lesson
                row[row.length - 2],
                row[row.length - 1]
              ];
              parsedRows.push(newRow); // Store parsed row for later appending
            } else {
              Logger.log(`New Lesson ID ${newLessonID} not found in the schedule.`);
            }
          });
        }
      }
    }
  }

  // Append parsed rows to the Parsed Form Responses tab
  if (parsedRows.length > 0) {
    
    parsedResponsesSheet.getRange(2, 1, parsedRows.length, headers.length).setValues(parsedRows);
    for (let i = 0; i < parsedRows.length; i++) {
      let row = parsedRows[i];
      let isAdding = _addingToScheduleOptions.includes(row[13]);
      let lessonId = row[10]; // first letter of lesson ID
      let isPrivateLesson = lessonId && lessonId[0] === "L";
      let match = parsedRows
        .find(x => x !== row // not itself
            && x[2] !== row[2] // same name
            && x[10] === row[10] // same lesson
            && _addingToScheduleOptions.includes(x[13]));

      if (isAdding && isPrivateLesson && match) {
        Logger.log(`Identified double-booked lesson for '${row[2]}' in lesson '${row[10]}'`);
        const range = parsedResponsesSheet.getRange(i + 2, 11);
        applyRedConditionalFormatting(range);
      }
    }
  }

  Logger.log('Parsing complete!');
}

function createLessonIDMap(scheduleData) {
  const lessonIDMap = {};
  for (let i = 1; i < scheduleData.length; i++) { // Skip header row
    const row = scheduleData[i];
    const lessonID = row[0]; // Assume Lesson ID is in Column A
    const day = row[1]; // Column B
    const time = row[2]; // Column C
    const instrument = row[7]; // Column D
    const teacher = row[3]; // Column E
    const length = row[4]; // Column F

    lessonIDMap[lessonID] = [day, time, instrument, teacher, length];
  }
  return lessonIDMap;
}

function extractLessonIDs(cell) {
  const ids = [];
  const regex = /G\d+|L\d+/g; // Match patterns like G1, G2, L3, etc.
  let match;
  while ((match = regex.exec(cell)) !== null) {
    ids.push(match[0]); // Extract and store the lesson IDs
  }
  return ids;
}

function updateWinterTrimesterSchedule() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const parsedResponsesSheet = ss.getSheetByName("Parsed Form Responses");
  const winterScheduleSheet = ss.getSheetByName("Winter Trimester Master Schedule");
  
  const parsedData = parsedResponsesSheet.getDataRange().getValues();
  const winterData = winterScheduleSheet.getDataRange().getValues();

  let filteredParsedData = parsedData.filter(x => !x[x.length - 2]);

  // Clear existing conditional formatting
  clearConditionalFormatting(winterScheduleSheet);

  // Start at row 2 in Parsed Form Responses (skip headers)
  for (let i = 1; i < filteredParsedData.length; i++) {
    const action = filteredParsedData[i][13]; // Column N (0-based index 13)
    if (!action)
      continue; // Skip if no action specified

    const lessonID = filteredParsedData[i][10]; // Column K (0-based index 10)
    const studentName = filteredParsedData[i][2]; // Column C
    const grade = filteredParsedData[i][3]; // Column D

    // Locate matching row in Winter Trimester Master Schedule
    const winterRow = winterData.findIndex(row => row[0] === lessonID); // Column A
    if (winterRow === -1)
      continue; // Skip if Lesson ID not found

    const F = winterData[winterRow][5]; // Column F in Winter Schedule (Student Name)
    const G = winterData[winterRow][6]; // Column G in Winter Schedule (Grade)
    const I = winterData[winterRow][8]; // Column I in Winter Schedule (Active Status)

    // Apply actions based on Action type
    if (_addingToScheduleOptions.includes(action)) {
      if (!F && !G) {
        // Both F and G empty - fill with Parsed Form Response data
        winterScheduleSheet.getRange(winterRow + 1, 6).setValue(studentName); // Set Column F
        winterScheduleSheet.getRange(winterRow + 1, 7).setValue(grade); // Set Column G
        winterScheduleSheet.getRange(winterRow + 1, 9).setValue("FALSE"); // Set Column I to FALSE unconditionally
      } else if (F !== studentName || G !== grade) {
        // F and G are filled but mismatched - apply conditional formatting if necessary
        const rangeF = winterScheduleSheet.getRange(winterRow + 1, 6);
        const rangeG = winterScheduleSheet.getRange(winterRow + 1, 7);
        applyConditionalFormattingIfUnexpected(rangeF, studentName);
        applyConditionalFormattingIfUnexpected(rangeG, grade);
      }
    } else if (_removingFromScheduleOptions.includes(action)) {
      if (!F && !G) {
        // F and G are empty - ensure Column I is TRUE
        winterScheduleSheet.getRange(winterRow + 1, 9).setValue("TRUE"); // Set Column I to TRUE unconditionally
      } else {
        // F and G are filled - check if they match D and C from Parsed Form Responses
        if (F === studentName && G === grade) {
          // F and G match Parsed Form Responses (D and C) - clear them and set Column I to TRUE
          winterScheduleSheet.getRange(winterRow + 1, 6, 1, 2).clearContent(); // Clear Columns F and G
          winterScheduleSheet.getRange(winterRow + 1, 9).setValue("TRUE"); // Set Column I to TRUE unconditionally
        }
        // If F and G do not match D and C, leave F, G, and I unchanged
      }
    }
  }
}

function clearConditionalFormatting(sheet) {
  sheet.setConditionalFormatRules([]);
}

// Function to apply conditional formatting only if content does not match expected value
function applyConditionalFormattingIfUnexpected(range, expectedValue) {
  if (range.getValue() === expectedValue) {
    return;
  }
  
  applyRedConditionalFormatting(range);
}

// Function to apply conditional formatting only if content does not match expected value
function applyRedConditionalFormatting(range) {
  const rule =
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=TRUE')
      .setBackground("#FF0000") // Red color for mismatch
      .setRanges([range])
      .build();
  const sheet = range.getSheet();
  const rules = sheet.getConditionalFormatRules();
  rules.push(rule);
  sheet.setConditionalFormatRules(rules);
}
