// services/emailService.js
// Email service με nodemailer και templates

import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logInfo, logError } from '../middleware/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    this.initialize();
  }

  // Αρχικοποίηση transporter
  initialize() {
    try {
      // Development configuration (Mailtrap ή άλλο)
      if (process.env.NODE_ENV === 'development') {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
          port: process.env.SMTP_PORT || 2525,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
      } else {
        // Production configuration
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        });
      }

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          logError('Email service initialization failed', error);
        } else {
          logInfo('Email service ready');
        }
      });
    } catch (error) {
      logError('Failed to initialize email service', error);
    }
  }

  // Φόρτωση και compile template
  async loadTemplate(templateName) {
    try {
      // Check cache
      if (this.templates.has(templateName)) {
        return this.templates.get(templateName);
      }

      // Load template file
      const templatePath = path.join(__dirname, '..', 'templates', 'email', `${templateName}.hbs`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      
      // Compile template
      const compiledTemplate = handlebars.compile(templateContent);
      
      // Cache it
      this.templates.set(templateName, compiledTemplate);
      
      return compiledTemplate;
    } catch (error) {
      logError(`Failed to load template: ${templateName}`, error);
      throw error;
    }
  }

  // Βοηθητική μέθοδος για δημιουργία base context
  getBaseContext(additionalContext = {}) {
    return {
      appName: process.env.APP_NAME || 'ERP System',
      appUrl: process.env.APP_URL || 'http://localhost:3000',
      year: new Date().getFullYear(),
      supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
      ...additionalContext
    };
  }

  // Αποστολή email με template
  async sendWithTemplate(to, subject, templateName, context = {}) {
    try {
      const template = await this.loadTemplate(templateName);
      const html = template(this.getBaseContext(context));
      
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'ERP System'}" <${process.env.SMTP_FROM || 'noreply@example.com'}>`,
        to,
        subject,
        html
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logInfo('Email sent successfully', {
        to,
        subject,
        templateName,
        messageId: result.messageId
      });
      
      return result;
    } catch (error) {
      logError('Failed to send email', {
        to,
        subject,
        templateName,
        error: error.message
      });
      throw error;
    }
  }

  // Αποστολή απλού email
  async send(to, subject, html, attachments = []) {
    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'ERP System'}" <${process.env.SMTP_FROM || 'noreply@example.com'}>`,
        to,
        subject,
        html,
        attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logInfo('Email sent successfully', {
        to,
        subject,
        messageId: result.messageId
      });
      
      return result;
    } catch (error) {
      logError('Failed to send email', {
        to,
        subject,
        error: error.message
      });
      throw error;
    }
  }

  // Specific email methods
  
  // Welcome email για νέους χρήστες
  async sendWelcomeEmail(user, temporaryPassword = null) {
    const context = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      temporaryPassword,
      loginUrl: `${process.env.APP_URL}/login`
    };

    return this.sendWithTemplate(
      user.email,
      'Καλώς ήρθατε στο ERP System',
      'welcome',
      context
    );
  }

  // Email επαλήθευσης
  async sendVerificationEmail(user, verificationToken) {
    const context = {
      firstName: user.firstName,
      verificationUrl: `${process.env.APP_URL}/verify-email?token=${verificationToken}`
    };

    return this.sendWithTemplate(
      user.email,
      'Επαλήθευση Email',
      'verify-email',
      context
    );
  }

  // Email επαναφοράς κωδικού
  async sendPasswordResetEmail(user, resetToken) {
    const context = {
      firstName: user.firstName,
      resetUrl: `${process.env.APP_URL}/reset-password?token=${resetToken}`,
      expiresIn: '1 ώρα'
    };

    return this.sendWithTemplate(
      user.email,
      'Επαναφορά Κωδικού Πρόσβασης',
      'password-reset',
      context
    );
  }

  // Email για νέο τιμολόγιο
  async sendInvoiceEmail(invoice, recipient, pdfBuffer) {
    const context = {
      recipientName: recipient.name || recipient.fullName,
      invoiceNumber: invoice.documentNumber,
      invoiceDate: new Date(invoice.documentDate).toLocaleDateString('el-GR'),
      totalAmount: invoice.totalAmount.toFixed(2),
      dueDate: new Date(invoice.dueDate).toLocaleDateString('el-GR'),
      viewUrl: `${process.env.APP_URL}/invoices/${invoice.id}`,
      companyName: invoice.company?.name
    };

    const attachments = [];
    if (pdfBuffer) {
      attachments.push({
        filename: `${invoice.documentNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    }

    const template = await this.loadTemplate('invoice');
    const html = template(this.getBaseContext(context));

    return this.send(
      recipient.email,
      `Τιμολόγιο ${invoice.documentNumber}`,
      html,
      attachments
    );
  }

  // Email για ληξιπρόθεσμα τιμολόγια
  async sendPaymentReminderEmail(invoice, recipient) {
    const context = {
      recipientName: recipient.name || recipient.fullName,
      invoiceNumber: invoice.documentNumber,
      invoiceDate: new Date(invoice.documentDate).toLocaleDateString('el-GR'),
      totalAmount: invoice.totalAmount.toFixed(2),
      daysOverdue: Math.floor((Date.now() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)),
      paymentUrl: `${process.env.APP_URL}/pay/${invoice.id}`,
      companyName: invoice.company?.name
    };

    return this.sendWithTemplate(
      recipient.email,
      `Υπενθύμιση Πληρωμής - ${invoice.documentNumber}`,
      'payment-reminder',
      context
    );
  }

  // Email για λήξη συνδρομής
  async sendSubscriptionExpiryEmail(company, daysUntilExpiry) {
    const context = {
      companyName: company.name,
      daysUntilExpiry,
      expiryDate: new Date(company.subscriptionEndDate).toLocaleDateString('el-GR'),
      renewUrl: `${process.env.APP_URL}/subscription/renew`,
      currentPlan: company.subscriptionPlan
    };

    return this.sendWithTemplate(
      company.email,
      'Η συνδρομή σας λήγει σύντομα',
      'subscription-expiry',
      context
    );
  }

  // Email για μηνιαία αναφορά
  async sendMonthlyReportEmail(company, reportData, pdfBuffer) {
    const context = {
      companyName: company.name,
      month: reportData.month,
      year: reportData.year,
      totalInvoices: reportData.totalInvoices,
      totalRevenue: reportData.totalRevenue.toFixed(2),
      totalPending: reportData.totalPending.toFixed(2),
      dashboardUrl: `${process.env.APP_URL}/dashboard`
    };

    const attachments = [];
    if (pdfBuffer) {
      attachments.push({
        filename: `monthly-report-${reportData.month}-${reportData.year}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    }

    const template = await this.loadTemplate('monthly-report');
    const html = template(this.getBaseContext(context));

    return this.send(
      company.email,
      `Μηνιαία Αναφορά - ${reportData.month}/${reportData.year}`,
      html,
      attachments
    );
  }

  // Bulk email για ανακοινώσεις
  async sendBulkEmail(recipients, subject, templateName, context = {}) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const personalContext = {
          ...context,
          recipientName: recipient.name || recipient.email,
          recipientEmail: recipient.email
        };
        
        const result = await this.sendWithTemplate(
          recipient.email,
          subject,
          templateName,
          personalContext
        );
        
        results.push({
          email: recipient.email,
          success: true,
          messageId: result.messageId
        });
      } catch (error) {
        results.push({
          email: recipient.email,
          success: false,
          error: error.message
        });
      }
      
      // Rate limiting - περιμένουμε λίγο μεταξύ των emails
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  // Test email connection
  async testConnection() {
    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service is working' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

// Export singleton instance
const emailService = new EmailService();
export default emailService;