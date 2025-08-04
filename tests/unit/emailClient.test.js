import { jest } from '@jest/globals';

// Mock nodemailer first
const mockTransporter = {
  sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  verify: jest.fn().mockResolvedValue(true),
};

const mockNodemailer = {
  createTransport: jest.fn().mockReturnValue(mockTransporter),
};

jest.unstable_mockModule('nodemailer', () => ({
  default: mockNodemailer,
}));

// Import after mocking
const { EmailClient } = await import('../../src/email/emailClient.js');

// Mock configuration service
const mockConfigService = {
  getEmailConfig: jest.fn().mockReturnValue({
    smtpHost: 'test-smtp.example.com',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: 'test@example.com',
    smtpPassword: 'test-password',
    defaultFromAddress: 'test@example.com',
  }),
};

describe('EmailClient', () => {
  let emailClient;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock return values
    mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });
    mockTransporter.verify.mockResolvedValue(true);
    emailClient = new EmailClient(mockConfigService);
  });

  describe('constructor', () => {
    test('should initialize with configuration service', () => {
      expect(mockConfigService.getEmailConfig).toHaveBeenCalled();
      expect(mockNodemailer.createTransport).toHaveBeenCalledWith({
        smtpHost: 'test-smtp.example.com',
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: 'test@example.com',
        smtpPassword: 'test-password',
        defaultFromAddress: 'test@example.com',
      });
    });
  });

  describe('sendEmail', () => {
    test('should send email successfully', async () => {
      const mockResponse = {
        messageId: 'test-message-id',
        response: '250 OK',
      };
      mockTransporter.sendMail.mockResolvedValue(mockResponse);

      const result = await emailClient.sendEmail(
        'recipient@test.com',
        'Test Subject',
        'Test email body'
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'recipient@test.com',
        subject: 'Test Subject',
        text: 'Test email body',
        html: 'Test email body',
      });

      expect(result).toEqual({
        success: true,
        messageId: 'test-message-id',
        response: '250 OK',
      });
    });

    test('should handle email sending errors', async () => {
      const error = new Error('SMTP connection failed');
      mockTransporter.sendMail.mockRejectedValue(error);

      const result = await emailClient.sendEmail(
        'recipient@test.com',
        'Test Subject',
        'Test email body'
      );

      expect(result).toEqual({
        success: false,
        error: 'SMTP connection failed',
      });
    });

    test('should handle multiple recipients', async () => {
      const mockResponse = {
        messageId: 'test-message-id',
        response: '250 OK',
      };
      mockTransporter.sendMail.mockResolvedValue(mockResponse);

      await emailClient.sendEmail(
        ['recipient1@test.com', 'recipient2@test.com'],
        'Test Subject',
        'Test email body'
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'recipient1@test.com, recipient2@test.com',
        subject: 'Test Subject',
        text: 'Test email body',
        html: 'Test email body',
      });
    });
  });

  describe('sendEmailWithAttachments', () => {
    test('should send email with attachments', async () => {
      const mockResponse = {
        messageId: 'test-message-id',
        response: '250 OK',
      };
      mockTransporter.sendMail.mockResolvedValue(mockResponse);

      const attachments = [
        {
          filename: 'test.pdf',
          path: '/path/to/test.pdf',
        },
      ];

      const result = await emailClient.sendEmailWithAttachments(
        'recipient@test.com',
        'Test Subject',
        'Test email body',
        attachments
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'recipient@test.com',
        subject: 'Test Subject',
        text: 'Test email body',
        html: 'Test email body',
        attachments: attachments,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('verifyConnection', () => {
    test('should verify connection successfully', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await emailClient.verifyConnection();

      expect(result).toEqual({
        success: true,
        message: 'Email server connection verified',
      });
    });

    test('should handle connection verification errors', async () => {
      const error = new Error('Connection failed');
      mockTransporter.verify.mockRejectedValue(error);

      const result = await emailClient.verifyConnection();

      expect(result).toEqual({
        success: false,
        error: 'Connection failed',
      });
    });
  });

  describe('sendNotification', () => {
    test('should send welcome notification', async () => {
      const mockResponse = {
        messageId: 'test-message-id',
        response: '250 OK',
      };
      mockTransporter.sendMail.mockResolvedValue(mockResponse);

      const result = await emailClient.sendNotification('welcome', 'user@test.com', {
        name: 'John Doe',
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'user@test.com',
        subject: 'Welcome to Tonic Music Program!',
        text: "Hello John Doe,\n\nWelcome to our music program! We're excited to have you join us.\n\nBest regards,\nTonic Music Team",
        html: "Hello John Doe,\n\nWelcome to our music program! We're excited to have you join us.\n\nBest regards,\nTonic Music Team",
      });

      expect(result.success).toBe(true);
    });

    test('should throw error for unknown notification type', async () => {
      await expect(
        emailClient.sendNotification('unknown_type', 'user@test.com', { name: 'John Doe' })
      ).rejects.toThrow('Unknown notification type: unknown_type');
    });
  });

  describe('sendBulkEmail', () => {
    test('should send bulk emails successfully', async () => {
      const mockResponse = {
        messageId: 'test-message-id',
        response: '250 OK',
      };
      mockTransporter.sendMail.mockResolvedValue(mockResponse);

      const recipients = ['user1@test.com', 'user2@test.com'];
      const result = await emailClient.sendBulkEmail(
        recipients,
        'Bulk Test Subject',
        'Bulk test email body'
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
      expect(result.totalSent).toBe(2);
      expect(result.totalFailed).toBe(0);
      expect(result.results).toHaveLength(2);
    });
  });
});
