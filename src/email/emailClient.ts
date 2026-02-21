import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { ConfigurationService, EmailConfig, configService } from '../services/configurationService.js';
import { createLogger, Logger } from '../utils/logger.js';

type NotificationTemplateName = 'welcome' | 'registration_confirmation' | 'reminder';

interface NotificationData {
  name: string;
  className?: string;
  instructor?: string;
  time?: string;
  room?: string;
}

interface NotificationTemplate {
  subject: string;
  text: string;
}

interface SendMailInfo {
  messageId: string;
  response: string;
}

interface EmailSendSuccess {
  success: true;
  messageId: string;
  response: string;
}

interface EmailSendFailure {
  success: false;
  error: string;
}

type EmailSendResult = EmailSendSuccess | EmailSendFailure;

type BulkEmailRecipientResult = EmailSendResult & {
  recipient: string;
};

interface BulkEmailResult {
  totalSent: number;
  totalFailed: number;
  results: BulkEmailRecipientResult[];
}

interface VerifySuccess {
  success: true;
  message: string;
}

interface VerifyFailure {
  success: false;
  error: string;
}

type VerifyResult = VerifySuccess | VerifyFailure;

interface Attachment {
  filename?: string | false;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
  cid?: string;
  encoding?: string;
  contentDisposition?: 'attachment' | 'inline';
  href?: string;
}

/** SMTP email client with templated notifications */
export class EmailClient {
  private configService: ConfigurationService;
  private logger: Logger;
  private transporter: Transporter | null;

  /** Initialize email client with configuration service */
  constructor(configurationService: ConfigurationService = configService) {
    this.configService = configurationService;
    this.logger = createLogger(configurationService);
    this.transporter = null;
    this.#initializeTransporter();
  }

  /** Configure the nodemailer SMTP transport from app settings */
  #initializeTransporter(): void {
    try {
      const emailConfig: EmailConfig = this.configService.getEmailConfig();

      // Check if email is actually configured
      if (!emailConfig.smtpHost || !emailConfig.smtpUser) {
        this.logger.info('⚠️ Email client not configured (SMTP credentials missing)');
        this.transporter = null;
        return;
      }

      // Create reusable transporter object using SMTP transport
      this.transporter = nodemailer.createTransport({
        host: emailConfig.smtpHost,
        port: emailConfig.smtpPort,
        secure: emailConfig.smtpSecure,
        auth: {
          user: emailConfig.smtpUser,
          pass: emailConfig.smtpPassword,
        },
      });
      this.logger.info('📧 Email client initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize email client:', error);
      this.transporter = null;
    }
  }

  /** Send a single email */
  async sendEmail(
    to: string | string[],
    subject: string,
    text: string,
    html: string | null = null,
    from: string | null = null,
  ): Promise<EmailSendResult> {
    if (!this.transporter) {
      throw new Error('Email client not properly initialized');
    }

    try {
      const emailConfig: EmailConfig = this.configService.getEmailConfig();

      const mailOptions: SendMailOptions = {
        from: from || emailConfig.defaultFromAddress,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject: subject,
        text: text,
        html: html || text, // Use HTML if provided, otherwise fallback to text
      };

      this.logger.info(`📧 Sending email to ${mailOptions.to as string} with subject: ${subject}`);

      const info: SendMailInfo = await this.transporter.sendMail(mailOptions);

      this.logger.info('✅ Email sent successfully:', info.messageId);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
      };
    } catch (error) {
      // Note: This error may be expected during testing when simulating email sending failures
      this.logger.error('❌ Failed to send email (may be expected during testing):', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /** Send an email with file attachments */
  async sendEmailWithAttachments(
    to: string | string[],
    subject: string,
    text: string,
    attachments: Attachment[] = [],
    html: string | null = null,
    from: string | null = null,
  ): Promise<EmailSendResult> {
    if (!this.transporter) {
      throw new Error('Email client not properly initialized');
    }

    try {
      const emailConfig: EmailConfig = this.configService.getEmailConfig();

      const mailOptions: SendMailOptions = {
        from: from || emailConfig.defaultFromAddress,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject: subject,
        text: text,
        html: html || text,
        attachments: attachments, // Array of attachment objects
      };

      this.logger.info(
        `📧 Sending email with ${attachments.length} attachment(s) to ${mailOptions.to as string}`
      );

      const info: SendMailInfo = await this.transporter.sendMail(mailOptions);

      this.logger.info('✅ Email with attachments sent successfully:', info.messageId);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
      };
    } catch (error) {
      this.logger.error(
        '❌ Failed to send email with attachments (may be expected during testing):',
        error
      );
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /** Send an email to multiple recipients with per-recipient tracking */
  async sendBulkEmail(
    recipients: string[],
    subject: string,
    text: string,
    html: string | null = null,
    from: string | null = null,
  ): Promise<BulkEmailResult> {
    const results: BulkEmailRecipientResult[] = [];

    for (const recipient of recipients) {
      try {
        const result: EmailSendResult = await this.sendEmail(recipient, subject, text, html, from);
        results.push({
          recipient,
          ...result,
        });

        // Add small delay between emails to avoid overwhelming the SMTP server
        await new Promise<void>(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          recipient,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    const successful: number = results.filter(r => r.success).length;
    this.logger.info(
      `📊 Bulk email complete: ${successful}/${recipients.length} sent successfully`
    );

    return {
      totalSent: successful,
      totalFailed: recipients.length - successful,
      results: results,
    };
  }

  /** Verify SMTP server connectivity */
  async verifyConnection(): Promise<VerifyResult> {
    if (!this.transporter) {
      return {
        success: false,
        error: 'Email client not initialized',
      };
    }

    try {
      await this.transporter.verify();
      this.logger.info('✅ Email server connection verified');
      return {
        success: true,
        message: 'Email server connection verified',
      };
    } catch (error) {
      // Note: This error may be expected during testing when simulating connection failures
      this.logger.error(
        '❌ Email server connection failed (may be expected during testing):',
        error
      );
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /** Send a notification using a named template */
  async sendNotification(
    type: NotificationTemplateName,
    recipient: string,
    data: NotificationData,
  ): Promise<EmailSendResult> {
    const templates: Record<NotificationTemplateName, NotificationTemplate> = {
      welcome: {
        subject: 'Welcome to Tonic Music Program!',
        text: `Hello ${data.name},\n\nWelcome to our music program! We're excited to have you join us.\n\nBest regards,\nTonic Music Team`,
      },
      registration_confirmation: {
        subject: 'Class Registration Confirmed',
        text: `Hello ${data.name},\n\nYour registration for ${data.className} has been confirmed.\n\nClass Details:\n- Instructor: ${data.instructor}\n- Time: ${data.time}\n- Room: ${data.room}\n\nSee you in class!\n\nBest regards,\nTonic Music Team`,
      },
      reminder: {
        subject: 'Class Reminder',
        text: `Hello ${data.name},\n\nThis is a reminder that you have ${data.className} today at ${data.time}.\n\nSee you soon!\n\nBest regards,\nTonic Music Team`,
      },
    };

    const template: NotificationTemplate | undefined = templates[type];
    if (!template) {
      throw new Error(`Unknown notification type: ${type}`);
    }

    return await this.sendEmail(recipient, template.subject, template.text);
  }
}
