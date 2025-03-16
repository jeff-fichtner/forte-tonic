function processGroupClasses() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const parsedFormResponsesSheet = ss.getSheetByName("Parsed Form Responses");
  const instructorInfoSheet = ss.getSheetByName("Instructor Info");
  const winterScheduleSheet = ss.getSheetByName("Winter Trimester Master Schedule");

  const parsedData = parsedFormResponsesSheet.getDataRange().getValues();
  const instructorData = instructorInfoSheet.getDataRange().getValues();
  
  // Clear the target range in Winter Trimester Master Schedule (Columns K-S from Row 2 onward)
  const lastRow = winterScheduleSheet.getLastRow();
  winterScheduleSheet.getRange(`K2:S${lastRow}`).clearContent();

  // Define starting row in Winter Trimester Master Schedule
  let nextRow = 2; // Start from Row 2

  // Loop through each row in Parsed Form Responses, starting from row 2 to skip headers
  for (let i = 1; i < parsedData.length; i++) {
    const lessonID = parsedData[i][10]?.trim(); // Column K (0-based index 10)

    // Check if the lessonID is in the "G (value)" format (G1 to G20 specifically)
    const groupLessonIDs = Array.from({ length: 20 }, (_, j) => `G${j + 1}`);
    if (lessonID && groupLessonIDs.includes(lessonID)) {
      Logger.log(`Found group lesson ID: ${lessonID} at row ${i + 1}`);

      const action = parsedData[i][13]; // Column N (0-based index 13)
      Logger.log(`Action for lesson ID ${lessonID}: ${action}`);
      
      // Proceed only for "Re-enroll", "Sign Up", or "Changing To" actions
      if (["Re-enroll", "Sign Up", "Changing To"].includes(action)) {
        
        // Find the matching lesson ID in Instructor Info (Column D)
        const instructorRow = instructorData.findIndex(row => row[3].toString().trim() === lessonID); // Column D (0-based index 3)
        if (instructorRow === -1) {
          Logger.log(`No match found in Instructor Info for lesson ID ${lessonID}`);
          continue; // Skip if no match found in Instructor Info
        }
        
        Logger.log(`Found matching instructor row for lesson ID ${lessonID} at Instructor Info row ${instructorRow + 1}`);

        // Get data from Instructor Info (Columns D-K and Column M)
        const instructorInfo = [
          instructorData[instructorRow][3], // Column D
          instructorData[instructorRow][4], // Column E
          instructorData[instructorRow][5], // Column F
          instructorData[instructorRow][6], // Column G
          instructorData[instructorRow][7], // Column H
          instructorData[instructorRow][8], // Column I
          instructorData[instructorRow][9], // Column J
          instructorData[instructorRow][10], // Column K
          instructorData[instructorRow][12] // Column M
        ];

        // Set the data from Instructor Info into Winter Trimester Master Schedule (Columns K-O and R-S)
        winterScheduleSheet.getRange(nextRow, 11, 1, instructorInfo.length).setValues([instructorInfo]);
        Logger.log(`Populated Instructor Info for lesson ID ${lessonID} into Winter Trimester Master Schedule at row ${nextRow}`);

        // Set Student Name and Grade from Parsed Form Responses (Columns C and D) into Winter Schedule (Columns P and Q)
        const studentName = parsedData[i][2]; // Column C
        const grade = parsedData[i][3];       // Column D
        winterScheduleSheet.getRange(nextRow, 16).setValue(studentName); // Column P
        winterScheduleSheet.getRange(nextRow, 17).setValue(grade);       // Column Q
        Logger.log(`Populated student info for ${studentName} (Grade: ${grade}) in Winter Trimester Master Schedule for lesson ID ${lessonID}`);
        
        // Increment the row for the next entry
        nextRow++;
      }
    }
  }
  Logger.log("Group class processing complete.");
}
