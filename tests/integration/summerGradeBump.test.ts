/**
 * Summer Grade-Bump End-to-End Integration Test
 * ==============================================
 *
 * Pins the contract that `userRepository.getStudents('summer')` bumps each
 * student's grade by +1 and drops anyone whose bumped grade would exceed
 * `MAX_GRADE` — and that this transform flows all the way through the
 * parent registration tab endpoint into the API response.
 *
 * Unlike `registrationController.test.ts` (which mocks `entityQueryService`
 * at the service layer), this file mocks ONLY the data layer
 * (`googleSheetsDbClient`). The real `EntityQueryService`, `UserRepository`,
 * and controller code all run. That makes this a true end-to-end pin:
 * if a future change accidentally drops the `period` argument anywhere in
 * the controller → service → repository chain, the bump will stop firing
 * and these tests will fail.
 *
 * Scope is deliberately narrow: the bump itself, the MAX_GRADE drop, and
 * confirmation that non-summer trimesters do NOT bump. The endpoint also
 * returns instructors/classes/availability/registrations, but those are
 * not the subject under test — they're mocked to empty.
 */

import { jest } from '@jest/globals';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Module-level mocks: only the data layer + the external services that have
// no bearing on the grade-bump (email, configuration). Everything else runs.
// ---------------------------------------------------------------------------

const mockConfigService = {
  getGoogleSheetsAuth: jest.fn().mockReturnValue({
    clientEmail: 'test-service-account@test-project.iam.gserviceaccount.com',
    privateKey: 'test-private-key',
  }),
  getGoogleSheetsConfig: jest.fn().mockReturnValue({
    spreadsheetId: 'test-spreadsheet-id',
  }),
  getServerConfig: jest.fn().mockReturnValue({
    port: 3001,
    nodeEnv: 'test',
    isDevelopment: false,
    isTest: true,
    isProduction: false,
  }),
  getEmailConfig: jest.fn().mockReturnValue({
    smtpHost: 'test-smtp.example.com',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: 'test@example.com',
    smtpPassword: 'test-password',
    defaultFromAddress: 'test@example.com',
  }),
  getLoggingConfig: jest.fn().mockReturnValue({
    enableLogging: false,
    logLevel: 'error',
  }),
  getBaseUrl: jest.fn().mockReturnValue('http://localhost:3001'),
  isTest: jest.fn().mockReturnValue(true),
  isDevelopment: jest.fn().mockReturnValue(false),
  // Method consulted by the registration repo when filtering registrations
  // by classId; we have no rock-band classes in fixtures so the empty list
  // is correct.
  getRockBandClassIds: jest.fn().mockReturnValue([]),
};

jest.unstable_mockModule('../../src/services/configurationService.js', () => ({
  configService: mockConfigService,
}));

jest.unstable_mockModule('../../src/email/emailClient.js', () => ({
  EmailClient: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
  })),
}));

// ---------------------------------------------------------------------------
// Sheet-level fixtures: the data the (mocked) dbClient yields for each sheet.
// `userRepository.getStudents` calls fetchAll for the students sheet (and
// also fetches parents for enrichment); the controller also calls into
// `getRegistrations`/`getInstructors`/`getClasses` for the same response,
// which we leave empty so the test focuses on the student transform.
// ---------------------------------------------------------------------------

// Parent owns all four students below.
const PARENT_ID = 'PARENT1';

// Fixture students with varied grades to exercise every branch of the bump:
//  - grade 3 → bumped to 4
//  - grade 6 → bumped to 7
//  - grade 8 → AT MAX_GRADE → bumped to 9 → DROPPED
//  - grade '' (blank/non-numeric) → no bump, surfaces as-is
const STUDENT_ROWS = [
  {
    id: 'STUDENT-G3',
    lastName: 'Doe',
    firstName: 'Alice',
    lastNickname: '',
    firstNickname: '',
    grade: '3',
    parent1Id: PARENT_ID,
    parent2Id: '',
  },
  {
    id: 'STUDENT-G6',
    lastName: 'Doe',
    firstName: 'Bob',
    lastNickname: '',
    firstNickname: '',
    grade: '6',
    parent1Id: PARENT_ID,
    parent2Id: '',
  },
  {
    id: 'STUDENT-G8',
    lastName: 'Doe',
    firstName: 'Carla',
    lastNickname: '',
    firstNickname: '',
    grade: '8',
    parent1Id: PARENT_ID,
    parent2Id: '',
  },
  {
    id: 'STUDENT-BLANK',
    lastName: 'Doe',
    firstName: 'Dan',
    lastNickname: '',
    firstNickname: '',
    grade: '',
    parent1Id: PARENT_ID,
    parent2Id: '',
  },
];

const PARENT_ROWS = [
  {
    id: PARENT_ID,
    lastName: 'Doe',
    firstName: 'Jane',
    email: 'jane@example.com',
    phone: '5551234567',
    accessCode: '5551234567',
  },
];

/**
 * Build a sheet-name → row-array map. The mocked dbClient looks up the
 * sheet key on each `getAllRecords` call and returns the appropriate rows.
 * Per the real client's contract, rows are mapped through the provided
 * mapper function before being returned.
 */
function buildSheetData(overrides: Record<string, Record<string, unknown>[]> = {}) {
  return {
    students: STUDENT_ROWS,
    parents: PARENT_ROWS,
    instructors: [],
    classes: [],
    admins: [],
    rooms: [],
    registrations_fall: [],
    registrations_winter: [],
    registrations_spring: [],
    registrations_summer: [],
    ...overrides,
  } as Record<string, Record<string, unknown>[]>;
}

let sheetData = buildSheetData();

jest.unstable_mockModule('../../src/database/googleSheetsDbClient.js', () => ({
  GoogleSheetsDbClient: jest.fn().mockImplementation(() => ({
    spreadsheetId: 'test-sheet-id',
    getAllRecords: jest
      .fn()
      .mockImplementation(
        async (sheetKey: string, mapper?: (r: Record<string, unknown>) => unknown) => {
          const rows = sheetData[sheetKey] ?? [];
          if (mapper) {
            return rows.map(r => mapper(r));
          }
          return rows;
        }
      ),
    updateRecord: jest.fn().mockResolvedValue({}),
    insertIntoSheet: jest.fn().mockResolvedValue({}),
    deleteRecord: jest.fn().mockResolvedValue({}),
    appendRecord: jest.fn().mockResolvedValue({}),
    clearSheetCache: jest.fn(),
    clearAllCache: jest.fn(),
  })),
  dataSheetForTrimester: (trimester: string) => `registrations_${trimester}`,
  auditSheetForTrimester: (trimester: string) => `registrations_${trimester}_audit`,
}));

// Import the app AFTER all module-level mocks are set up.
const { app } = await import('../../src/app.js');
const { serviceContainer, ServiceKeys } = await import(
  '../../src/infrastructure/container/serviceContainer.js'
);

// Initialize the service container WITHOUT running migrations. The
// migration runner needs an actual googleapis sheets client that's not
// part of our dbClient mock surface; for this end-to-end test we only
// need the entity/service wiring.
await serviceContainer.initialize();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Summer grade-bump end-to-end (GET /api/parent/tabs/registration/:trimester)', () => {
  beforeEach(() => {
    sheetData = buildSheetData();
    jest.clearAllMocks();
    // The userRepository is a singleton inside the service container and
    // caches enriched students for 5 minutes — long enough to leak between
    // tests. Clear the cache so each test sees fresh fixture data.
    const userRepository = serviceContainer.get(ServiceKeys.userRepository) as {
      _enrichedStudentsCache: unknown;
      _enrichedStudentsCacheTime: number | null;
    };
    userRepository._enrichedStudentsCache = null;
    userRepository._enrichedStudentsCacheTime = null;
  });

  test('summer: returns students with grade incremented by 1; 8th-grader is dropped', async () => {
    const response = await request(app)
      .get(`/api/parent/tabs/registration/summer?parentId=${PARENT_ID}`)
      .set('x-access-code', '5551234567')
      .expect(200);

    expect(response.body.success).toBe(true);

    const students: Array<{ id: string; grade: string }> = response.body.data.students;

    // The 8th-grader (STUDENT-G8) has been dropped: they've aged out for summer.
    const ids = students.map(s => s.id);
    expect(ids).not.toContain('STUDENT-G8');

    // The remaining numeric-grade students show their bumped grade.
    const byId = Object.fromEntries(students.map(s => [s.id, s]));
    expect(byId['STUDENT-G3']?.grade).toBe('4');
    expect(byId['STUDENT-G6']?.grade).toBe('7');

    // Non-numeric (blank) grades are surfaced as-is, no bump applied.
    expect(byId['STUDENT-BLANK']?.grade).toBe('');
  });

  test('fall: grades are unchanged (no bump fires for non-summer trimesters)', async () => {
    const response = await request(app)
      .get(`/api/parent/tabs/registration/fall?parentId=${PARENT_ID}`)
      .set('x-access-code', '5551234567')
      .expect(200);

    expect(response.body.success).toBe(true);

    const students: Array<{ id: string; grade: string }> = response.body.data.students;
    const byId = Object.fromEntries(students.map(s => [s.id, s]));

    // All four students surface with their stored grades — no bump, no drop.
    expect(students.map(s => s.id).sort()).toEqual(
      ['STUDENT-BLANK', 'STUDENT-G3', 'STUDENT-G6', 'STUDENT-G8'].sort()
    );
    expect(byId['STUDENT-G3']?.grade).toBe('3');
    expect(byId['STUDENT-G6']?.grade).toBe('6');
    expect(byId['STUDENT-G8']?.grade).toBe('8');
    expect(byId['STUDENT-BLANK']?.grade).toBe('');
  });

  test('defensive: parent with no students returns an empty list and no errors', async () => {
    // Override only the students fixture; everything else stays empty.
    sheetData = buildSheetData({ students: [] });

    const response = await request(app)
      .get(`/api/parent/tabs/registration/summer?parentId=${PARENT_ID}`)
      .set('x-access-code', '5551234567')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.students).toEqual([]);
  });
});
