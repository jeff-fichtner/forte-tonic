import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RegistrationRepository } from '../../src/repositories/registrationRepository.js';
import { RegistrationId } from '../../src/utils/values/registrationId.js';

describe('RegistrationRepository', () => {
  let repository;
  let mockDbClient;
  let mockLogger;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    // Create mock database client
    mockDbClient = {
      spreadsheetId: 'test-spreadsheet-id',
      cache: {
        delete: jest.fn(),
      },
      clearCache: jest.fn(),
      sheets: {
        spreadsheets: {
          values: {
            get: jest.fn(),
          },
          batchUpdate: jest.fn(),
        },
      },
    };

    repository = new RegistrationRepository(mockDbClient);
  });

  describe('delete', () => {
    it('should successfully delete a registration from Google Sheets', async () => {
      const registrationId = new RegistrationId('550e8400-e29b-41d4-a716-446655440000');

      // Mock existing registration data
      const mockRegistrations = [
        {
          id: { getValue: () => '550e8400-e29b-41d4-a716-446655440000' },
          studentId: { getValue: () => '12345' },
          day: 'Monday',
          time: '10:00',
        },
      ];

      // Mock sheet data response
      const mockSheetData = {
        data: {
          values: [
            ['Id', 'StudentId', 'Day', 'Time'], // Header row
            ['550e8400-e29b-41d4-a716-446655440000', '12345', 'Monday', '10:00'], // Data row
            ['550e8400-e29b-41d4-a716-446655440001', '67890', 'Tuesday', '11:00'], // Other row
          ],
        },
      };

      // Setup mocks
      mockDbClient.sheets.spreadsheets.values.get.mockResolvedValue(mockSheetData);
      mockDbClient.sheets.spreadsheets.batchUpdate.mockResolvedValue({ status: 200 });

      // Mock the getById method to return the registration
      repository.getById = jest.fn().mockResolvedValue(mockRegistrations[0]);
      repository.clearCache = jest.fn();

      // Execute delete
      const result = await repository.delete(registrationId);

      // Verify result
      expect(result).toBe(true);

      // Verify getById was called to check existence
      expect(repository.getById).toHaveBeenCalledWith(registrationId);

      // Verify sheet data was fetched
      expect(mockDbClient.sheets.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'registrations!A:Z',
      });

      // Verify batchUpdate was called with correct parameters
      expect(mockDbClient.sheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: 1484108306, // The correct sheetId for registrations
                  dimension: 'ROWS',
                  startIndex: 1, // Row 2 (0-based: 1)
                  endIndex: 2, // Row 2 (exclusive end: 2)
                },
              },
            },
          ],
        },
      });

      // Verify cache was cleared
      expect(repository.clearCache).toHaveBeenCalled();
      expect(mockDbClient.clearCache).toHaveBeenCalledWith('registrations');
    });

    it('should throw error if registration not found in cached data', async () => {
      const registrationId = new RegistrationId('550e8400-e29b-41d4-a716-446655440002');

      // Mock getById to return null (not found)
      repository.getById = jest.fn().mockResolvedValue(null);

      // Execute and expect error
      await expect(repository.delete(registrationId)).rejects.toThrow(
        'Registration with ID 550e8400-e29b-41d4-a716-446655440002 not found'
      );

      // Verify getById was called
      expect(repository.getById).toHaveBeenCalledWith(registrationId);

      // Verify no sheet operations were performed
      expect(mockDbClient.sheets.spreadsheets.values.get).not.toHaveBeenCalled();
      expect(mockDbClient.sheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
    });

    it('should throw error if registration not found in sheet data', async () => {
      const registrationId = new RegistrationId('550e8400-e29b-41d4-a716-446655440003');

      // Mock existing registration in cache
      const mockRegistration = {
        id: { getValue: () => '550e8400-e29b-41d4-a716-446655440003' },
        studentId: { getValue: () => '12345' },
      };

      // Mock sheet data without the target registration
      const mockSheetData = {
        data: {
          values: [
            ['Id', 'StudentId', 'Day', 'Time'], // Header row
            ['550e8400-e29b-41d4-a716-446655440004', '11111', 'Monday', '10:00'],
            ['550e8400-e29b-41d4-a716-446655440005', '22222', 'Tuesday', '11:00'],
          ],
        },
      };

      // Setup mocks
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      mockDbClient.sheets.spreadsheets.values.get.mockResolvedValue(mockSheetData);

      // Execute and expect error
      await expect(repository.delete(registrationId)).rejects.toThrow(
        'Registration with ID 550e8400-e29b-41d4-a716-446655440003 not found in sheet'
      );

      // Verify sheet data was fetched
      expect(mockDbClient.sheets.spreadsheets.values.get).toHaveBeenCalled();

      // Verify no delete operation was performed
      expect(mockDbClient.sheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
    });

    it('should handle Google Sheets API errors gracefully', async () => {
      const registrationId = new RegistrationId('550e8400-e29b-41d4-a716-446655440006');

      // Mock existing registration
      const mockRegistration = {
        id: { getValue: () => '550e8400-e29b-41d4-a716-446655440006' },
        studentId: { getValue: () => '12345' },
      };

      // Mock sheet data
      const mockSheetData = {
        data: {
          values: [
            ['Id', 'StudentId', 'Day', 'Time'],
            ['550e8400-e29b-41d4-a716-446655440006', '12345', 'Monday', '10:00'],
          ],
        },
      };

      // Setup mocks - batchUpdate fails
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      mockDbClient.sheets.spreadsheets.values.get.mockResolvedValue(mockSheetData);
      mockDbClient.sheets.spreadsheets.batchUpdate.mockRejectedValue(
        new Error('Google Sheets API error')
      );

      // Execute and expect error
      await expect(repository.delete(registrationId)).rejects.toThrow('Google Sheets API error');

      // Verify all expected calls were made up to the error
      expect(repository.getById).toHaveBeenCalled();
      expect(mockDbClient.sheets.spreadsheets.values.get).toHaveBeenCalled();
      expect(mockDbClient.sheets.spreadsheets.batchUpdate).toHaveBeenCalled();
    });

    it('should accept string ID and convert to RegistrationId', async () => {
      const stringId = '550e8400-e29b-41d4-a716-446655440007';

      // Mock existing registration
      const mockRegistration = {
        id: { getValue: () => '550e8400-e29b-41d4-a716-446655440007' },
        studentId: { getValue: () => '12345' },
      };

      // Mock sheet data
      const mockSheetData = {
        data: {
          values: [
            ['Id', 'StudentId', 'Day', 'Time'],
            ['550e8400-e29b-41d4-a716-446655440007', '12345', 'Monday', '10:00'],
          ],
        },
      };

      // Setup mocks
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      mockDbClient.sheets.spreadsheets.values.get.mockResolvedValue(mockSheetData);
      mockDbClient.sheets.spreadsheets.batchUpdate.mockResolvedValue({ status: 200 });
      repository.clearCache = jest.fn();

      // Execute delete with string ID
      const result = await repository.delete(stringId);

      // Verify result
      expect(result).toBe(true);

      // Verify getById was called with a RegistrationId object
      expect(repository.getById).toHaveBeenCalledWith(
        expect.objectContaining({
          getValue: expect.any(Function),
        })
      );
    });

    it('should handle empty sheet data gracefully', async () => {
      const registrationId = new RegistrationId('550e8400-e29b-41d4-a716-446655440008');

      // Mock existing registration
      const mockRegistration = {
        id: { getValue: () => '550e8400-e29b-41d4-a716-446655440008' },
        studentId: { getValue: () => '12345' },
      };

      // Mock empty sheet data
      const mockSheetData = {
        data: {
          values: [
            ['Id', 'StudentId', 'Day', 'Time'], // Only header row
          ],
        },
      };

      // Setup mocks
      repository.getById = jest.fn().mockResolvedValue(mockRegistration);
      mockDbClient.sheets.spreadsheets.values.get.mockResolvedValue(mockSheetData);

      // Execute and expect error
      await expect(repository.delete(registrationId)).rejects.toThrow(
        'Registration with ID 550e8400-e29b-41d4-a716-446655440008 not found in sheet'
      );
    });
  });
});
