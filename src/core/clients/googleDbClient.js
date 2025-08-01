class GoogleDbClient {

    constructor(settings) {
        this.settings = settings;

        this.externalSpreadsheet = SpreadsheetApp.openById(settings.externalSpreadsheetId);
        ErrorHandling.throwIfNo(this.externalSpreadsheet, 'No external spreadsheet found');

        // get working spreadsheet by opening folder and looking for spreadsheet name
        const workingFolder = DriveApp.getFolderById(settings.workingFolderId);
        ErrorHandling.throwIfNo(workingFolder, 'No working folder found');

        this.workingSpreadsheet = this._getSpreadsheetByFolderAndName(workingFolder, settings.workingSpreadsheetName);
        ErrorHandling.throwIfNo(this.workingSpreadsheet, `No working spreadsheet found with name '${settings.workingSpreadsheetName}' in folder '${workingFolder.getName()}'`);

        const rolesSheet = this.workingSpreadsheet.getSheetByName(Keys.ROLES);
        ErrorHandling.throwIfNo(rolesSheet, `No '${Keys.ROLES}' sheet found`);

        const adminsSheet = this.workingSpreadsheet.getSheetByName(Keys.ADMINS);
        ErrorHandling.throwIfNo(adminsSheet, `No '${Keys.ADMINS}' sheet found`);

        const instructorsSheet = this.workingSpreadsheet.getSheetByName(Keys.INSTRUCTORS);
        ErrorHandling.throwIfNo(instructorsSheet, `No '${Keys.INSTRUCTORS}' sheet found`);

        const parentsSheet = this.workingSpreadsheet.getSheetByName(Keys.PARENTS);
        ErrorHandling.throwIfNo(parentsSheet, `No '${Keys.PARENTS}' sheet found`);

        const studentsSheet = this.workingSpreadsheet.getSheetByName(Keys.STUDENTS);
        ErrorHandling.throwIfNo(studentsSheet, `No '${Keys.STUDENTS}' sheet found`);

        const classesSheet = this.workingSpreadsheet.getSheetByName(Keys.CLASSES);
        ErrorHandling.throwIfNo(classesSheet, `No '${Keys.CLASSES}' sheet found`);

        const roomsSheet = this.workingSpreadsheet.getSheetByName(Keys.ROOMS);
        ErrorHandling.throwIfNo(roomsSheet, `No '${Keys.ROOMS}' sheet found`);

        const registrationsSheet = this.workingSpreadsheet.getSheetByName(Keys.REGISTRATIONS);
        ErrorHandling.throwIfNo(registrationsSheet, `No '${Keys.REGISTRATIONS}' sheet found`);

        const registrationsAuditSheet = this.workingSpreadsheet.getSheetByName(Keys.REGISTRATIONSAUDIT);
        ErrorHandling.throwIfNo(registrationsAuditSheet, `No '${Keys.REGISTRATIONSAUDIT}' sheet found`);

        const attendanceSheet = this.workingSpreadsheet.getSheetByName(Keys.ATTENDANCE);
        ErrorHandling.throwIfNo(attendanceSheet, `No '${Keys.ATTENDANCE}' sheet found`);

        const attendanceAuditSheet = this.workingSpreadsheet.getSheetByName(Keys.ATTENDANCEAUDIT);
        ErrorHandling.throwIfNo(attendanceAuditSheet, `No '${Keys.ATTENDANCEAUDIT}' sheet found`);

        this.workingSheetInfo = {
            [Keys.ROLES]: {
                sheet: rolesSheet
            },
            [Keys.ADMINS]: {
                sheet: adminsSheet
            },
            [Keys.INSTRUCTORS]: {
                sheet: instructorsSheet
            },
            [Keys.PARENTS]: {
                sheet: parentsSheet
            },
            [Keys.STUDENTS]: {
                sheet: studentsSheet
            },
            [Keys.CLASSES]: {
                sheet: classesSheet
            },
            [Keys.ROOMS]: {
                sheet: roomsSheet
            },
            [Keys.REGISTRATIONS]: {
                sheet: registrationsSheet,
                auditSheet: registrationsAuditSheet,
                id: (row) => row[0],
                postProcess: (record) => {
                    record.id = 
                        record.registrationType === RegistrationType.GROUP
                            ? `${record.studentId}_${record.classId}`
                            : `${record.studentId}_${record.instructorId}_${record.day}_${record.startTime}`;
                    return record;
                }
            },
            [Keys.ATTENDANCE]: {
                sheet: attendanceSheet,
                auditSheet: attendanceAuditSheet,
                id: (row) => row[0],
                getArchiveSheetName: (existingSheetName) => `${existingSheetName}_archive_${new Date().toISOString().slice(0, 10)}`,
            },
        }
    }

    getAllRecords(sheetKey, mapFunc) {
        const { sheet } = this.workingSheetInfo[sheetKey];
        const data = sheet.getDataRange().getValues();

        // Map the data to objects using the provided mapping function
        const mappedData =
            data.slice(1) // skip header row
                .map(row => mapFunc(row));

        return mappedData;
    }

    appendRecord(sheetKey, record,  createdBy) {
        const { sheet, auditSheet, postProcess } = this.workingSheetInfo[sheetKey];

        const clonedRecord = CloneUtility.clone(record);
        let processedRecord = this._auditRecord(clonedRecord, createdBy);
        if (postProcess) {
            processedRecord = postProcess(processedRecord);
        }
        const values = Object.values(processedRecord);

        sheet.appendRow(values);
        
        if (!auditSheet) {
            Logger.log(`No audit sheet defined for ${sheetKey}. Skipping audit logging.`);
            return processedRecord;
        }

        const auditValues = this._convertToAuditValues(values);
        auditSheet.appendRow(auditValues);

        return processedRecord;
    }

    deleteRecord(sheetKey, recordId, deletedBy) {
        const { sheet, auditSheet, id } = this.workingSheetInfo[sheetKey];
        const data = sheet.getDataRange().getValues();

        // Find the row to delete based on the ID
        const rowIndex = data.findIndex(row => id(row) === recordId);

        // get all the values

        if (rowIndex === -1) {
            Logger.log(`Record with ID ${recordId} not found in ${sheetKey}.`);
            return;
        }

        // get values
        const values = data[rowIndex];

        sheet.deleteRow(rowIndex + 1); // +1 because getDataRange() includes header
        Logger.log(`Record with ID ${recordId} deleted from ${sheetKey}.`);

        if (!auditSheet) {
            Logger.log(`No audit sheet defined for ${sheetKey}. Skipping audit logging.`);
            return;
        }

        const auditValues = this._convertToAuditValues(values, deletedBy);
        auditSheet.appendRow(auditValues);
    }

    archiveSheet(sheetKey) {
        const { existingSheet, getArchiveSheetName } = this.workingSheetInfo[sheetKey];

        if (!getArchiveSheetName) {
            throw new Error(`No getArchiveSheetName function defined for sheet key: ${sheetKey}`);
        }

        // get name change of the sheet passing in existing sheet name
        const newSheetName = getArchiveSheetName(existingSheet.getName());

        // check if the new sheet name already exists
        const existingSheets = this.workingSpreadsheet.getSheets();
        if (existingSheets.some(s => s.getName() === newSheetName)) {
            throw new Error(`A sheet with the name "${newSheetName}" already exists.`);
        }

        existingSheet.setName(newSheetName);

        // create new sheet
        const newSheet = this.workingSpreadsheet.insertSheet(sheetKey);

        // copy the header row from the archived sheet to the new sheet
        const headerRow = existingSheet.getRange(1, 1, 1, existingSheet.getLastColumn()).getValues();
        newSheet.getRange(1, 1, 1, headerRow[0].length).setValues(headerRow);
        
        this.workingSheetInfo[sheetKey].sheet = newSheet;
        Logger.log(`Sheet "${newSheetName}" archived and new sheet created.`);
    }

    _getSpreadsheetByFolderAndName(folder, spreadsheetName) {
        let spreadsheet;

        const files = folder.getFilesByName(spreadsheetName);
        if (files.hasNext()) {
            spreadsheet = SpreadsheetApp.openById(files.next().getId());
        }

        return spreadsheet;
    }

    _createSpreadsheetWithinFolder(folder, spreadsheetName) {
        const newSpreadsheet = SpreadsheetApp.create(spreadsheetName);
        const file = DriveApp.getFileById(newSpreadsheet.getId());
        folder.addFile(file);
        DriveApp.getRootFolder().removeFile(file); // Remove from root folder
        Logger.log(`Spreadsheet "${spreadsheetName}" created and moved to folder "${folder.getName()}".`);
    }

    // Deletes all sheets in the spreadsheet except the last one, which is cleared and renamed to "_".
    // Google sheets always requires a minimum of one sheet.
    _deleteAllSheetsAndClearLast(spreadsheet) {
        try {
            // Loop to delete all sheets except the last one
            while (spreadsheet.getSheets().length > 1) {
                spreadsheet.deleteSheet(spreadsheet.getSheets().at(0));
            }

            // Clear and rename the last remaining sheet
            const lastSheet = spreadsheet.getSheets().at(0);
            lastSheet.clear();
            lastSheet.setName("_");
        } catch (error) {
            Logger.log(`Error: ${error.message}`);
        }
    }

    _auditRecord(record, createdBy) {
        record.createdAt = new Date();
        record.createdBy = createdBy;
        return record;
    }

    _convertToAuditValues(values, deletedBy = null) {
        // copy list
        values = values.slice();

        const guid = GuidUtility.generateGuid();
        // insert guid at the beginning of the values array
        values.unshift(guid);

        if (deletedBy) {
            values.push(true);
            values.push(new Date());
            values.push(deletedBy);
        }

        return values;
    }
}