/**
 * Drop Request Repository Tests
 * ===============================
 *
 * Tests for drop request repository CRUD operations:
 * - Create drop request
 * - Find by ID
 * - Find by parent ID
 * - Find by status
 * - Find by registration ID
 * - Update drop request
 */

import { jest } from '@jest/globals';
import {
  DropRequestRepository,
  DropRequest,
} from '../../../src/repositories/dropRequestRepository.js';
import { DropRequestStatus } from '../../../src/utils/values/dropRequestStatus.js';

describe('DropRequestRepository', () => {
  let repository;
  let mockDbClient;
  let mockConfigService;

  beforeEach(() => {
    // Mock database client
    mockDbClient = {
      getAllRecords: jest.fn(),
      insertIntoSheet: jest.fn(),
      updateRecord: jest.fn(),
    };

    // Mock config service
    mockConfigService = {
      getConfig: jest.fn(() => ({
        environment: 'test',
        logLevel: 'info',
      })),
    };

    repository = new DropRequestRepository(mockDbClient, mockConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('DropRequest model', () => {
    test('should create drop request with defaults', () => {
      const dropRequest = new DropRequest({
        registrationId: 'reg-123',
        parentId: 'parent-456',
        reason: 'Test reason',
      });

      expect(dropRequest.id).toBeDefined();
      expect(dropRequest.registrationId).toBe('reg-123');
      expect(dropRequest.parentId).toBe('parent-456');
      expect(dropRequest.reason).toBe('Test reason');
      expect(dropRequest.status).toBe(DropRequestStatus.PENDING);
      expect(dropRequest.requestedAt).toBeDefined();
      expect(dropRequest.reviewedBy).toBeNull();
      expect(dropRequest.reviewedAt).toBeNull();
      expect(dropRequest.adminNotes).toBeNull();
    });

    test('should convert to JSON with empty strings for nulls', () => {
      const dropRequest = new DropRequest({
        id: 'drop-123',
        registrationId: 'reg-123',
        parentId: 'parent-456',
        reason: 'Test reason',
        requestedAt: '2025-01-15T10:00:00Z',
        status: DropRequestStatus.PENDING,
      });

      const json = dropRequest.toJSON();

      expect(json.id).toBe('drop-123');
      expect(json.reviewedBy).toBe('');
      expect(json.reviewedAt).toBe('');
      expect(json.adminNotes).toBe('');
    });

    test('should create from database row', () => {
      const row = [
        'drop-123',
        'reg-456',
        'parent-789',
        'Moving to a new school',
        '2025-01-15T10:00:00Z',
        DropRequestStatus.PENDING,
        '',
        '',
        '',
      ];

      const dropRequest = DropRequest.fromDatabaseRow(row);

      expect(dropRequest.id).toBe('drop-123');
      expect(dropRequest.registrationId).toBe('reg-456');
      expect(dropRequest.parentId).toBe('parent-789');
      expect(dropRequest.reason).toBe('Moving to a new school');
      expect(dropRequest.requestedAt).toBe('2025-01-15T10:00:00Z');
      expect(dropRequest.status).toBe(DropRequestStatus.PENDING);
      expect(dropRequest.reviewedBy).toBeNull();
      expect(dropRequest.reviewedAt).toBeNull();
      expect(dropRequest.adminNotes).toBeNull();
    });

    test('should handle approved drop request from database row', () => {
      const row = [
        'drop-123',
        'reg-456',
        'parent-789',
        'Moving to a new school',
        '2025-01-15T10:00:00Z',
        DropRequestStatus.APPROVED,
        'admin@example.com',
        '2025-01-16T14:30:00Z',
        'Approved per parent request',
      ];

      const dropRequest = DropRequest.fromDatabaseRow(row);

      expect(dropRequest.status).toBe(DropRequestStatus.APPROVED);
      expect(dropRequest.reviewedBy).toBe('admin@example.com');
      expect(dropRequest.reviewedAt).toBe('2025-01-16T14:30:00Z');
      expect(dropRequest.adminNotes).toBe('Approved per parent request');
    });
  });

  describe('create', () => {
    test('should create a new drop request', async () => {
      const requestData = {
        registrationId: 'reg-123',
        parentId: 'parent-456',
        reason: 'Test reason',
      };

      mockDbClient.insertIntoSheet.mockResolvedValue({});

      const result = await repository.create(requestData, 'parent@example.com');

      expect(result).toBeInstanceOf(DropRequest);
      expect(result.registrationId).toBe('reg-123');
      expect(result.parentId).toBe('parent-456');
      expect(result.reason).toBe('Test reason');
      expect(result.status).toBe(DropRequestStatus.PENDING);
      expect(mockDbClient.insertIntoSheet).toHaveBeenCalledWith(
        'drop_requests',
        expect.any(Object)
      );
    });

    test('should throw error on database failure', async () => {
      const requestData = {
        registrationId: 'reg-123',
        parentId: 'parent-456',
        reason: 'Test reason',
      };

      mockDbClient.insertIntoSheet.mockRejectedValue(new Error('Database error'));

      await expect(repository.create(requestData, 'parent@example.com')).rejects.toThrow(
        'Failed to create drop request'
      );
    });
  });

  describe('findById', () => {
    test('should find drop request by ID', async () => {
      const mockRows = [
        [
          'drop-123',
          'reg-456',
          'parent-789',
          'Test reason',
          '2025-01-15T10:00:00Z',
          DropRequestStatus.PENDING,
          '',
          '',
          '',
        ],
      ];

      mockDbClient.getAllRecords.mockResolvedValue(mockRows.map(DropRequest.fromDatabaseRow));

      const result = await repository.findById('drop-123');

      expect(result).toBeInstanceOf(DropRequest);
      expect(result.id).toBe('drop-123');
      expect(result.registrationId).toBe('reg-456');
    });

    test('should return null if not found', async () => {
      mockDbClient.getAllRecords.mockResolvedValue([]);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });

    test('should throw error on database failure', async () => {
      mockDbClient.getAllRecords.mockRejectedValue(new Error('Database error'));

      await expect(repository.findById('drop-123')).rejects.toThrow(
        'Failed to find drop request by ID'
      );
    });
  });

  describe('findByParentId', () => {
    test('should find all drop requests for a parent', async () => {
      const mockRows = [
        [
          'drop-123',
          'reg-456',
          'parent-789',
          'Reason 1',
          '2025-01-15T10:00:00Z',
          DropRequestStatus.PENDING,
          '',
          '',
          '',
        ],
        [
          'drop-124',
          'reg-457',
          'parent-789',
          'Reason 2',
          '2025-01-16T10:00:00Z',
          DropRequestStatus.APPROVED,
          'admin@example.com',
          '2025-01-17T10:00:00Z',
          'Approved',
        ],
        [
          'drop-125',
          'reg-458',
          'parent-999',
          'Reason 3',
          '2025-01-17T10:00:00Z',
          DropRequestStatus.PENDING,
          '',
          '',
          '',
        ],
      ];

      mockDbClient.getAllRecords.mockResolvedValue(mockRows.map(DropRequest.fromDatabaseRow));

      const results = await repository.findByParentId('parent-789');

      expect(results).toHaveLength(2);
      expect(results[0].parentId).toBe('parent-789');
      expect(results[1].parentId).toBe('parent-789');
    });

    test('should return empty array if no requests found', async () => {
      mockDbClient.getAllRecords.mockResolvedValue([]);

      const results = await repository.findByParentId('parent-789');

      expect(results).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    test('should find all pending drop requests', async () => {
      const mockRows = [
        [
          'drop-123',
          'reg-456',
          'parent-789',
          'Reason 1',
          '2025-01-15T10:00:00Z',
          DropRequestStatus.PENDING,
          '',
          '',
          '',
        ],
        [
          'drop-124',
          'reg-457',
          'parent-888',
          'Reason 2',
          '2025-01-16T10:00:00Z',
          DropRequestStatus.APPROVED,
          'admin@example.com',
          '2025-01-17T10:00:00Z',
          'Approved',
        ],
        [
          'drop-125',
          'reg-458',
          'parent-999',
          'Reason 3',
          '2025-01-17T10:00:00Z',
          DropRequestStatus.PENDING,
          '',
          '',
          '',
        ],
      ];

      mockDbClient.getAllRecords.mockResolvedValue(mockRows.map(DropRequest.fromDatabaseRow));

      const results = await repository.findByStatus(DropRequestStatus.PENDING);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe(DropRequestStatus.PENDING);
      expect(results[1].status).toBe(DropRequestStatus.PENDING);
    });
  });

  describe('findByRegistrationId', () => {
    test('should find drop request by registration ID', async () => {
      const mockRows = [
        [
          'drop-123',
          'reg-456',
          'parent-789',
          'Test reason',
          '2025-01-15T10:00:00Z',
          DropRequestStatus.PENDING,
          '',
          '',
          '',
        ],
      ];

      mockDbClient.getAllRecords.mockResolvedValue(mockRows.map(DropRequest.fromDatabaseRow));

      const result = await repository.findByRegistrationId('reg-456');

      expect(result).toBeInstanceOf(DropRequest);
      expect(result.registrationId).toBe('reg-456');
    });

    test('should return null if not found', async () => {
      mockDbClient.getAllRecords.mockResolvedValue([]);

      const result = await repository.findByRegistrationId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    test('should update an existing drop request', async () => {
      const existingRequest = new DropRequest({
        id: 'drop-123',
        registrationId: 'reg-456',
        parentId: 'parent-789',
        reason: 'Original reason',
        status: DropRequestStatus.PENDING,
      });

      repository.findById = jest.fn().mockResolvedValue(existingRequest);
      mockDbClient.updateRecord.mockResolvedValue({});

      const updateData = {
        status: DropRequestStatus.APPROVED,
        reviewedBy: 'admin@example.com',
        reviewedAt: '2025-01-16T14:30:00Z',
        adminNotes: 'Approved',
      };

      const result = await repository.update('drop-123', updateData, 'admin@example.com');

      expect(result.status).toBe(DropRequestStatus.APPROVED);
      expect(result.reviewedBy).toBe('admin@example.com');
      expect(mockDbClient.updateRecord).toHaveBeenCalledWith(
        'drop_requests',
        expect.any(Object),
        'admin@example.com'
      );
    });

    test('should throw error if drop request not found', async () => {
      repository.findById = jest.fn().mockResolvedValue(null);

      await expect(
        repository.update('non-existent', { status: DropRequestStatus.APPROVED }, 'admin')
      ).rejects.toThrow('Drop request not found');
    });

    test('should preserve ID during update', async () => {
      const existingRequest = new DropRequest({
        id: 'drop-123',
        registrationId: 'reg-456',
        parentId: 'parent-789',
        reason: 'Original reason',
        status: DropRequestStatus.PENDING,
      });

      repository.findById = jest.fn().mockResolvedValue(existingRequest);
      mockDbClient.updateRecord.mockResolvedValue({});

      const updateData = {
        id: 'different-id', // This should be ignored
        status: DropRequestStatus.APPROVED,
      };

      const result = await repository.update('drop-123', updateData, 'admin@example.com');

      expect(result.id).toBe('drop-123'); // Original ID preserved
    });
  });

  describe('findAll', () => {
    test('should find all drop requests', async () => {
      const mockRows = [
        [
          'drop-123',
          'reg-456',
          'parent-789',
          'Reason 1',
          '2025-01-15T10:00:00Z',
          DropRequestStatus.PENDING,
          '',
          '',
          '',
        ],
        [
          'drop-124',
          'reg-457',
          'parent-888',
          'Reason 2',
          '2025-01-16T10:00:00Z',
          DropRequestStatus.APPROVED,
          'admin@example.com',
          '2025-01-17T10:00:00Z',
          'Approved',
        ],
      ];

      mockDbClient.getAllRecords.mockResolvedValue(mockRows.map(DropRequest.fromDatabaseRow));

      const results = await repository.findAll();

      expect(results).toHaveLength(2);
      expect(results[0]).toBeInstanceOf(DropRequest);
      expect(results[1]).toBeInstanceOf(DropRequest);
    });

    test('should return empty array if no requests exist', async () => {
      mockDbClient.getAllRecords.mockResolvedValue([]);

      const results = await repository.findAll();

      expect(results).toEqual([]);
    });
  });
});
