import { google } from 'googleapis';

/**
 * Enhanced GoogleSheetsDbClient with performance optimizations
 * Core functionality only - for structural migrations see src/core/scripts/dbMigrations/
 */
export class OptimizedGoogleSheetsDbClient {
  constructor(configurationService) {
    this.configService = configurationService;
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    // Initialize Google API clients
    const authConfig = this.configService.getGoogleSheetsAuth();
    const sheetsConfig = this.configService.getGoogleSheetsConfig();

    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: authConfig.clientEmail,
        private_key: authConfig.privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    this.spreadsheetId = sheetsConfig.spreadsheetId;

    // Optimized sheet info with better range targeting
    this.sheetInfo = {
      students: {
        sheet: 'students',
        range: 'A2:H1000', // Updated range after StudentId column deletion
        columns: ['id', 'lastName', 'firstName', 'lastNickname', 'firstNickname', 'grade', 'parent1Id', 'parent2Id'],
        // Note: StudentId column has been deleted as part of Migration001
        // New structure: A=id, B=lastName, C=firstName, D=lastNickname, E=firstNickname, F=grade, G=parent1Id, H=parent2Id
      },
      parents: {
        sheet: 'parents', 
        range: 'A2:E1000',
        columns: ['id', 'email', 'lastName', 'firstName', 'phone'],
        // Note: Headers updated to camelCase as part of Migration001
        // Structure: A=id, B=email, C=LastName, D=FirstName, E=phone
      },
      instructors: {
        sheet: 'instructors',
        range: 'A2:E1000', // Focus on core data for performance
        columns: ['id', 'email', 'lastName', 'firstName', 'phone']
      },
      registrations: {
        sheet: 'registrations',
        range: 'A2:P1000',
        columns: ['id', 'studentId', 'instructorId', 'day', 'startTime', 'length', 'registrationType', 'roomId', 'instrument', 'transportationType', 'notes', 'classId', 'classTitle', 'expectedStartDate', 'createdAt', 'createdBy'],
        // Enhanced structure recommendations:
        // Add: schoolYear, trimester, status, endDate, modifiedAt, modifiedBy
        // This would enable better academic year tracking and audit trails
        enhancedColumns: ['id', 'studentId', 'instructorId', 'classId', 'registrationType', 'schoolYear', 'trimester', 'day', 'startTime', 'endTime', 'roomId', 'instrument', 'status', 'createdAt', 'createdBy', 'modifiedAt', 'modifiedBy']
      },
    };
  }

  /**
   * Batch load multiple sheets in parallel
   */
  async getAllDataParallel() {
    const startTime = Date.now();
    
    try {
      // Load all sheets in parallel
      const promises = Object.entries(this.sheetInfo).map(async ([sheetName, info]) => {
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `${info.sheet}!${info.range}`,
        });
        
        return {
          sheetName,
          data: response.data.values || [],
          columns: info.columns
        };
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      console.log(`🚀 Parallel batch load completed in ${endTime - startTime}ms`);
      
      // Cache results
      const dataMap = {};
      results.forEach(({ sheetName, data, columns }) => {
        dataMap[sheetName] = data;
        this.cache.set(sheetName, data);
        this.cacheTimestamps.set(sheetName, Date.now());
      });
      
      return dataMap;
    } catch (error) {
      console.error('❌ Batch load failed:', error);
      throw error;
    }
  }

  /**
   * Get data with caching
   */
  async getCachedData(sheetName) {
    const now = Date.now();
    const cachedTime = this.cacheTimestamps.get(sheetName);
    
    if (cachedTime && (now - cachedTime) < this.CACHE_TTL) {
      console.log(`📦 Using cached data for ${sheetName}`);
      return this.cache.get(sheetName);
    }
    
    // Cache miss, load fresh data
    const info = this.sheetInfo[sheetName];
    if (!info) throw new Error(`Unknown sheet: ${sheetName}`);
    
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${info.sheet}!${info.range}`,
    });
    
    const data = response.data.values || [];
    this.cache.set(sheetName, data);
    this.cacheTimestamps.set(sheetName, now);
    
    return data;
  }

  /**
   * Enhanced batch operations for writes
   */
  async batchWrite(operations) {
    const batchRequest = {
      spreadsheetId: this.spreadsheetId,
      resource: {
        valueInputOption: 'RAW',
        data: operations.map(op => ({
          range: op.range,
          values: op.values
        }))
      }
    };

    const startTime = Date.now();
    const response = await this.sheets.spreadsheets.values.batchUpdate(batchRequest);
    const endTime = Date.now();

    console.log(`📝 Batch write of ${operations.length} operations completed in ${endTime - startTime}ms`);
    
    // Invalidate cache for affected sheets
    operations.forEach(op => {
      const sheetName = op.range.split('!')[0];
      this.cache.delete(sheetName);
      this.cacheTimestamps.delete(sheetName);
    });

    return response;
  }

  /**
   * Smart relationship loading - load related data efficiently
   */
  async getStudentsWithParents() {
    const [studentsData, parentsData] = await Promise.all([
      this.getCachedData('students'),
      this.getCachedData('parents')
    ]);

    // Create parent lookup map for O(1) access
    const parentMap = new Map();
    parentsData.forEach(row => {
      if (row.length > 0) {
        parentMap.set(row[0], {
          id: row[0],
          email: row[1],
          lastName: row[2],
          firstName: row[3],
          phone: row[4]
        });
      }
    });

    // Enrich students with parent data
    return studentsData.map(row => {
      if (row.length < 8) return null; // Updated from 9 to 8 after StudentId deletion
      
      const student = {
        id: row[0],
        lastName: row[1],        // Updated mapping after StudentId deletion
        firstName: row[2],       // Updated mapping after StudentId deletion
        lastNickname: row[3],    // Updated mapping after StudentId deletion
        firstNickname: row[4],   // Updated mapping after StudentId deletion
        grade: row[5],           // Updated mapping after StudentId deletion
        parent1Id: row[6],       // Updated mapping after StudentId deletion
        parent2Id: row[7]        // Updated mapping after StudentId deletion
      };

      // Add parent objects
      student.parent1 = parentMap.get(student.parent1Id);
      student.parent2 = parentMap.get(student.parent2Id);

      return student;
    }).filter(Boolean);
  }

  /**
   * Clear cache manually
   */
  clearCache() {
    this.cache.clear();
    this.cacheTimestamps.clear();
    console.log('🧹 Cache cleared');
  }
}
