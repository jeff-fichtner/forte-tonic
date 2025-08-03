import nodemailer from 'nodemailer';
import { configService } from '../../core/services/configurationService.js';

/**
 *
 */
export class EmailClient {
  /**
   *
   */
  constructor(configurationService = configService) {
    this.configService = configurationService;
    this.transporter = null;
    this.#initializeTransporter();
  }

  /**
   *
   */
  #initializeTransporter() {
    try {
      const emailConfig = this.configService.getEmailConfig();

      // Create reusable transporter object using SMTP transport
      this.transporter = nodemailer.createTransport(emailConfig);
      console.log('📧 Email client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize email client:', error);
      this.transporter = null;
    }
  }

  /**
   *
   */
  async sendEmail(to, subject, text, html = null, from = null) {
    if (!this.transporter) {
      throw new Error('Email client not properly initialized');
    }

    try {
      const emailConfig = this.configService.getEmailConfig();

      const mailOptions = {
        from: from || emailConfig.defaultFromAddress,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject: subject,
        text: text,
        html: html || text, // Use HTML if provided, otherwise fallback to text
      };

      console.log(`📧 Sending email to ${mailOptions.to} with subject: ${subject}`);

      const info = await this.transporter.sendMail(mailOptions);

      console.log('✅ Email sent successfully:', info.messageId);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
      };
    } catch (error) {
      // Note: This error may be expected during testing when simulating email sending failures
      console.error('❌ Failed to send email (may be expected during testing):', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   *
   */
  async sendEmailWithAttachments(to, subject, text, attachments = [], html = null, from = null) {
    if (!this.transporter) {
      throw new Error('Email client not properly initialized');
    }

    try {
      const emailConfig = this.configService.getEmailConfig();

      const mailOptions = {
        from: from || emailConfig.defaultFromAddress,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject: subject,
        text: text,
        html: html || text,
        attachments: attachments, // Array of attachment objects
      };

      console.log(`📧 Sending email with ${attachments.length} attachment(s) to ${mailOptions.to}`);

      const info = await this.transporter.sendMail(mailOptions);

      console.log('✅ Email with attachments sent successfully:', info.messageId);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
      };
    } catch (error) {
      console.error(
        '❌ Failed to send email with attachments (may be expected during testing):',
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   *
   */
  async sendBulkEmail(recipients, subject, text, html = null, from = null) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendEmail(recipient, subject, text, html, from);
        results.push({
          recipient,
          ...result,
        });

        // Add small delay between emails to avoid overwhelming the SMTP server
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          recipient,
          success: false,
          error: error.message,
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    console.log(`📊 Bulk email complete: ${successful}/${recipients.length} sent successfully`);

    return {
      totalSent: successful,
      totalFailed: recipients.length - successful,
      results: results,
    };
  }

  /**
   *
   */
  async verifyConnection() {
    if (!this.transporter) {
      return {
        success: false,
        error: 'Email client not initialized',
      };
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email server connection verified');
      return {
        success: true,
        message: 'Email server connection verified',
      };
    } catch (error) {
      // Note: This error may be expected during testing when simulating connection failures
      console.error('❌ Email server connection failed (may be expected during testing):', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   *
   */
  async sendNotification(type, recipient, data) {
    const templates = {
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

    const template = templates[type];
    if (!template) {
      throw new Error(`Unknown notification type: ${type}`);
    }

    return await this.sendEmail(recipient, template.subject, template.text);
  }
}
