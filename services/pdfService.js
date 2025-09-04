// services/pdfService.js  
// PDF generation service for invoices and documents

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PDFService {
  constructor() {
    this.fontPath = path.join(__dirname, '../assets/fonts');
    this.templatePath = path.join(__dirname, '../assets/templates');
  }

  // Generate invoice PDF
  async generateInvoicePDF(invoice, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `${invoice.type === 'invoice' ? 'Τιμολόγιο' : 'Παραστατικό'} ${invoice.getDisplayNumber()}`,
            Author: 'BizFlow ERP',
            Subject: `${invoice.type} for ${invoice.company?.name}`,
            Keywords: 'invoice, τιμολόγιο, VAT, ΦΠΑ',
            Creator: 'BizFlow ERP System',
            Producer: 'PDFKit'
          }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        doc.on('error', reject);

        // Generate PDF content
        this._generateInvoiceHeader(doc, invoice);
        this._generateCompanyInfo(doc, invoice.company);
        this._generateInvoiceDetails(doc, invoice);
        this._generateItemsTable(doc, invoice.items);
        this._generateTotalsSection(doc, invoice);
        this._generateFooter(doc, invoice);
        this._generateMyDataInfo(doc, invoice);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Generate header section
  _generateInvoiceHeader(doc, invoice) {
    // Company logo placeholder
    const logoPath = path.join(__dirname, '../assets/images/logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 50, { width: 80 });
    }

    // Company info on the right
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('ΔΙΚΗ ΣΑΣ ΕΠΙΧΕΙΡΗΣΗ', 350, 50)
       .fontSize(10)
       .font('Helvetica')
       .text('Διεύθυνση: Οδός Παραδείγματος 123', 350, 75)
       .text('Τ.Κ. 12345, Πόλη, Ελλάδα', 350, 90)
       .text('Τηλ: +30 210 1234567', 350, 105)
       .text('Email: info@company.gr', 350, 120)
       .text('ΑΦΜ: 123456789 - ΔΟΥ: ΑΘΗΝΩΝ', 350, 135);

    // Document title
    const documentTitle = this._getDocumentTitle(invoice.type);
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text(documentTitle, 50, 180)
       .fontSize(14)
       .text(`Αριθμός: ${invoice.getDisplayNumber()}`, 50, 205);

    return doc;
  }

  // Generate customer info section
  _generateCompanyInfo(doc, company) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('ΣΤΟΙΧΕΙΑ ΠΕΛΑΤΗ:', 50, 240)
       .fontSize(10)
       .font('Helvetica')
       .text(`${company.name}`, 50, 260)
       .text(`${company.address || ''}`, 50, 275);

    if (company.city || company.postalCode) {
      doc.text(`${company.postalCode || ''} ${company.city || ''}`, 50, 290);
    }

    if (company.phone) {
      doc.text(`Τηλ: ${company.phone}`, 50, 305);
    }

    if (company.email) {
      doc.text(`Email: ${company.email}`, 50, 320);
    }

    if (company.vatNumber) {
      doc.text(`ΑΦΜ: ${company.vatNumber}`, 50, 335);
    }

    return doc;
  }

  // Generate invoice details
  _generateInvoiceDetails(doc, invoice) {
    const detailsX = 350;
    const detailsY = 240;

    doc.fontSize(10)
       .font('Helvetica');

    // Issue date
    doc.text(`Ημερομηνία έκδοσης:`, detailsX, detailsY)
       .text(this._formatDate(invoice.issueDate), detailsX + 100, detailsY);

    // Due date
    if (invoice.dueDate) {
      doc.text(`Ημερομηνία λήξης:`, detailsX, detailsY + 15)
         .text(this._formatDate(invoice.dueDate), detailsX + 100, detailsY + 15);
    }

    // Delivery date
    if (invoice.deliveryDate) {
      doc.text(`Ημερομηνία παράδοσης:`, detailsX, detailsY + 30)
         .text(this._formatDate(invoice.deliveryDate), detailsX + 100, detailsY + 30);
    }

    // Payment method
    if (invoice.paymentMethod) {
      const paymentMethodText = this._getPaymentMethodText(invoice.paymentMethod);
      doc.text(`Τρόπος πληρωμής:`, detailsX, detailsY + 45)
         .text(paymentMethodText, detailsX + 100, detailsY + 45);
    }

    // Currency
    if (invoice.currency !== 'EUR') {
      doc.text(`Νόμισμα:`, detailsX, detailsY + 60)
         .text(`${invoice.currency} (Ισοτιμία: ${invoice.exchangeRate})`, detailsX + 100, detailsY + 60);
    }

    return doc;
  }

  // Generate items table
  _generateItemsTable(doc, items) {
    const tableTop = 380;
    const tableLeft = 50;
    const tableWidth = 495;

    // Table headers
    const headers = [
      { text: 'Περιγραφή', width: 180, align: 'left' },
      { text: 'Ποσότητα', width: 60, align: 'center' },
      { text: 'Μονάδα', width: 50, align: 'center' },
      { text: 'Τιμή', width: 70, align: 'right' },
      { text: 'ΦΠΑ%', width: 45, align: 'center' },
      { text: 'Σύνολο', width: 90, align: 'right' }
    ];

    // Draw header
    this._drawTableHeader(doc, tableTop, tableLeft, headers);

    // Draw items
    let currentY = tableTop + 25;
    items.forEach((item, index) => {
      // Check if we need a new page
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
        this._drawTableHeader(doc, currentY, tableLeft, headers);
        currentY += 25;
      }

      this._drawTableRow(doc, currentY, tableLeft, headers, [
        item.description,
        this._formatNumber(item.quantity, 2),
        item.unit,
        this._formatCurrency(item.unitPrice),
        `${item.vatRate}%`,
        this._formatCurrency(item.totalAmount)
      ], index % 2 === 0);

      currentY += 20;
    });

    return { doc, lastY: currentY };
  }

  // Generate totals section
  _generateTotalsSection(doc, invoice) {
    const totalsX = 350;
    let totalsY = 600; // Will be adjusted based on table height

    // Background for totals
    doc.rect(totalsX - 10, totalsY - 10, 200, 100)
       .fillAndStroke('#f8f9fa', '#dee2e6')
       .fillColor('#000000');

    doc.fontSize(10)
       .font('Helvetica');

    // Subtotal
    doc.text('Καθαρή αξία:', totalsX, totalsY)
       .text(this._formatCurrency(invoice.subtotal), totalsX + 100, totalsY, { align: 'right', width: 80 });

    // Discount
    if (invoice.discountAmount > 0) {
      totalsY += 15;
      doc.text(`Έκπτωση (${invoice.discountPercent}%):`, totalsX, totalsY)
         .text(`-${this._formatCurrency(invoice.discountAmount)}`, totalsX + 100, totalsY, { align: 'right', width: 80 });
    }

    // VAT
    totalsY += 15;
    doc.text('ΦΠΑ:', totalsX, totalsY)
       .text(this._formatCurrency(invoice.vatAmount), totalsX + 100, totalsY, { align: 'right', width: 80 });

    // Total
    totalsY += 20;
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('ΣΥΝΟΛΟ:', totalsX, totalsY)
       .text(this._formatCurrency(invoice.totalAmount), totalsX + 100, totalsY, { align: 'right', width: 80 });

    // Amount in words (Greek)
    totalsY += 25;
    doc.fontSize(9)
       .font('Helvetica-Oblique')
       .text(`Ολογράφως: ${this._convertAmountToWords(invoice.totalAmount)} ευρώ`, 50, totalsY, { width: 500 });

    return doc;
  }

  // Generate footer
  _generateFooter(doc, invoice) {
    const footerY = 720;

    // Notes
    if (invoice.notes) {
      doc.fontSize(9)
         .font('Helvetica')
         .text('Παρατηρήσεις:', 50, footerY)
         .text(invoice.notes, 50, footerY + 12, { width: 400 });
    }

    // Payment terms
    if (invoice.paymentTerms) {
      doc.fontSize(9)
         .text('Όροι πληρωμής:', 50, footerY + 30)
         .text(invoice.paymentTerms, 50, footerY + 42, { width: 400 });
    }

    // Legal footer
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#666666')
       .text('Το παρόν έγγραφο εκδόθηκε σύμφωνα με τις διατάξεις του ν. 4308/2014 και του ν. 4174/2013', 50, 760, { width: 500, align: 'center' });

    return doc;
  }

  // Generate MyData information
  _generateMyDataInfo(doc, invoice) {
    if (invoice.mydataId) {
      const mydataY = 780;
      
      doc.fontSize(8)
         .fillColor('#000000')
         .font('Helvetica-Bold')
         .text('MYDATA:', 50, mydataY)
         .font('Helvetica')
         .text(`ID: ${invoice.mydataId}`, 90, mydataY)
         .text(`Κατάσταση: ${this._getMyDataStatusText(invoice.mydataStatus)}`, 250, mydataY);

      if (invoice.mydataSubmittedAt) {
        doc.text(`Υποβλήθηκε: ${this._formatDateTime(invoice.mydataSubmittedAt)}`, 400, mydataY);
      }
    }

    return doc;
  }

  // Helper methods
  _drawTableHeader(doc, y, x, headers) {
    doc.fillAndStroke('#e9ecef', '#dee2e6')
       .rect(x, y, 495, 20)
       .fill();

    doc.fillColor('#000000')
       .fontSize(9)
       .font('Helvetica-Bold');

    let currentX = x + 5;
    headers.forEach(header => {
      doc.text(header.text, currentX, y + 6, {
        width: header.width - 10,
        align: header.align
      });
      currentX += header.width;
    });
  }

  _drawTableRow(doc, y, x, headers, values, isEven = false) {
    if (isEven) {
      doc.fillAndStroke('#f8f9fa', '#dee2e6')
         .rect(x, y, 495, 18)
         .fill();
    }

    doc.fillColor('#000000')
       .fontSize(8)
       .font('Helvetica');

    let currentX = x + 5;
    headers.forEach((header, index) => {
      doc.text(values[index] || '', currentX, y + 4, {
        width: header.width - 10,
        align: header.align
      });
      currentX += header.width;
    });
  }

  _getDocumentTitle(type) {
    const titles = {
      'invoice': 'ΤΙΜΟΛΟΓΙΟ ΠΩΛΗΣΗΣ',
      'credit_note': 'ΠΙΣΤΩΤΙΚΟ ΣΗΜΕΙΩΜΑ',
      'debit_note': 'ΧΡΕΩΣΤΙΚΟ ΣΗΜΕΙΩΜΑ',
      'receipt': 'ΑΠΟΔΕΙΞΗ ΛΙΑΝΙΚΗΣ ΠΩΛΗΣΗΣ',
      'proforma': 'ΠΡΟΦΟΡΜΑ ΤΙΜΟΛΟΓΙΟ'
    };
    return titles[type] || 'ΠΑΡΑΣΤΑΤΙΚΟ';
  }

  _getPaymentMethodText(method) {
    const methods = {
      'cash': 'Μετρητά',
      'card': 'Κάρτα',
      'bank_transfer': 'Τραπεζική μεταφορά',
      'check': 'Επιταγή',
      'other': 'Άλλο'
    };
    return methods[method] || method;
  }

  _getMyDataStatusText(status) {
    const statuses = {
      'pending': 'Εκκρεμεί',
      'submitted': 'Υποβλήθηκε',
      'accepted': 'Έγκριση',
      'rejected': 'Απόρριψη'
    };
    return statuses[status] || status;
  }

  _formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('el-GR');
  }

  _formatDateTime(date) {
    if (!date) return '';
    return new Date(date).toLocaleString('el-GR');
  }

  _formatCurrency(amount) {
    if (!amount) return '0,00 €';
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  _formatNumber(number, decimals = 0) {
    if (!number) return '0';
    return new Intl.NumberFormat('el-GR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(number);
  }

  _convertAmountToWords(amount) {
    // Simplified Greek number to words conversion
    // In production, you might want to use a proper library
    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);
    
    // This is a placeholder - implement proper Greek number conversion
    if (integerPart === 0) {
      return 'μηδέν';
    } else if (integerPart === 1) {
      return 'ένα';
    } else {
      return `${integerPart}`;
    }
  }

  // Save PDF to file
  async savePDFToFile(pdfBuffer, filename) {
    const uploadsDir = path.join(__dirname, '../uploads/invoices');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filepath = path.join(uploadsDir, filename);
    
    return new Promise((resolve, reject) => {
      fs.writeFile(filepath, pdfBuffer, (err) => {
        if (err) reject(err);
        else resolve(filepath);
      });
    });
  }

  // Generate filename for invoice PDF
  generateInvoiceFilename(invoice) {
    const date = new Date().toISOString().slice(0, 10);
    const invoiceNumber = invoice.invoiceNumber.replace(/[^\w\-_]/g, '_');
    return `invoice_${invoiceNumber}_${date}.pdf`;
  }
}

export default new PDFService();