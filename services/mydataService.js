// services/mydataService.js
// MyDATA integration service for AADE compliance

import axios from 'axios';
import crypto from 'crypto';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import auditService from './auditService.js';

class MyDataService {
  constructor() {
    // MyDATA endpoints
    this.endpoints = {
      production: 'https://mydata-rest.aade.gr',
      sandbox: 'https://mydataapidev.aade.gr'
    };
    
    this.environment = process.env.MYDATA_ENVIRONMENT || 'sandbox';
    this.baseURL = this.endpoints[this.environment];
    
    // Credentials
    this.userId = process.env.MYDATA_USER_ID;
    this.subscriptionKey = process.env.MYDATA_SUBSCRIPTION_KEY;
    
    // XML Builder configuration
    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
      suppressEmptyNode: true
    });
    
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
      parseNodeValue: true
    });
    
    // Initialize axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': this.subscriptionKey,
        'aade-userid': this.userId
      }
    });
    
    // Request/Response interceptors for logging
    this.setupInterceptors();
  }

  // Setup axios interceptors for logging
  setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        console.log(`MyDATA Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('MyDATA Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log(`MyDATA Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.error('MyDATA Response Error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  // Submit invoice to MyDATA
  async submitInvoice(invoice) {
    try {
      // Validate invoice data
      this.validateInvoiceData(invoice);

      // Convert invoice to MyDATA format
      const mydataInvoice = this.convertInvoiceToMyDataFormat(invoice);

      // Submit to MyDATA
      const response = await this.client.post('/SendInvoices', {
        invoicesDoc: {
          invoice: [mydataInvoice]
        }
      });

      // Parse response
      const result = this.parseSubmissionResponse(response.data);

      // Update invoice with MyDATA info
      await invoice.update({
        mydataId: result.mark || result.uid,
        mydataStatus: result.statusCode === 'Success' ? 'submitted' : 'rejected',
        mydataSubmittedAt: new Date(),
        metadata: {
          ...invoice.metadata,
          mydataResponse: result
        }
      });

      // Audit log
      await auditService.log({
        action: 'mydata_submit',
        status: result.statusCode === 'Success' ? 'success' : 'failure',
        category: 'mydata',
        entityType: 'Invoice',
        entityId: invoice.id,
        description: `MyDATA submission ${result.statusCode}`,
        metadata: {
          mydataId: result.mark || result.uid,
          statusCode: result.statusCode,
          errors: result.errors
        }
      });

      return {
        success: result.statusCode === 'Success',
        mydataId: result.mark || result.uid,
        status: result.statusCode,
        errors: result.errors || [],
        response: result
      };

    } catch (error) {
      console.error('MyDATA submission error:', error);

      // Update invoice status
      await invoice.update({
        mydataStatus: 'rejected',
        metadata: {
          ...invoice.metadata,
          mydataError: error.message
        }
      });

      // Audit log
      await auditService.logSecurityEvent('MYDATA_SUBMISSION_ERROR', 'medium', {
        invoiceId: invoice.id,
        error: error.message
      });

      throw error;
    }
  }

  // Convert invoice to MyDATA XML format
  convertInvoiceToMyDataFormat(invoice) {
    const issuer = this.getIssuerInfo();
    const counterpart = this.getCounterpartInfo(invoice.company);
    
    return {
      '@_xmlns': 'http://www.aade.gr/myDATA/invoice/v1.0',
      '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@_xsi:schemaLocation': 'https://www.aade.gr/myDATA/invoice/v1.0/InvoicesDoc-v0.6.xsd',
      
      issuer: issuer,
      counterpart: counterpart,
      
      invoiceHeader: {
        series: invoice.series,
        aa: this.extractInvoiceNumber(invoice.invoiceNumber),
        issueDate: this.formatDateForMyData(invoice.issueDate),
        invoiceType: this.getMyDataInvoiceType(invoice.type),
        vatPaymentSuspension: false,
        currency: invoice.currency
      },
      
      paymentMethods: invoice.paymentMethod ? {
        paymentMethodDetails: {
          type: this.getMyDataPaymentMethod(invoice.paymentMethod),
          amount: invoice.totalAmount
        }
      } : undefined,
      
      invoiceDetails: this.convertInvoiceItems(invoice.items),
      
      invoiceSummary: {
        totalNetValue: invoice.subtotal,
        totalVatAmount: invoice.vatAmount,
        totalWithheldAmount: 0,
        totalFeesAmount: 0,
        totalStampDutyAmount: 0,
        totalOtherTaxesAmount: 0,
        totalDeductionsAmount: invoice.discountAmount,
        totalGrossValue: invoice.totalAmount,
        
        incomeClassification: this.getIncomeClassifications(invoice.items),
        expensesClassification: undefined
      }
    };
  }

  // Convert invoice items to MyDATA format
  convertInvoiceItems(items) {
    return items.map((item, index) => ({
      lineNumber: index + 1,
      netValue: item.netAmount,
      vatCategory: this.getMyDataVatCategory(item.vatCategory),
      vatAmount: item.vatAmount,
      vatExemptionCategory: item.vatExemptionReason ? this.getVatExemptionCategory(item.vatExemptionReason) : undefined,
      deductionsAmount: item.discountAmount || 0,
      lineComments: item.description,
      
      // Income classification
      incomeClassification: item.incomeClassification ? [{
        classificationType: item.incomeClassification,
        classificationCategory: this.getClassificationCategory(item.incomeClassification),
        amount: item.netAmount
      }] : undefined
    }));
  }

  // Get issuer information (your company)
  getIssuerInfo() {
    return {
      vatNumber: process.env.COMPANY_VAT_NUMBER,
      country: 'GR',
      branch: 0,
      name: process.env.COMPANY_NAME,
      address: {
        street: process.env.COMPANY_ADDRESS,
        number: process.env.COMPANY_ADDRESS_NUMBER || '',
        postalCode: process.env.COMPANY_POSTAL_CODE,
        city: process.env.COMPANY_CITY
      }
    };
  }

  // Get counterpart information (customer)
  getCounterpartInfo(company) {
    return {
      vatNumber: company.vatNumber,
      country: company.country || 'GR',
      branch: 0,
      name: company.name,
      address: {
        street: company.address || '',
        number: company.addressNumber || '',
        postalCode: company.postalCode || '',
        city: company.city || ''
      }
    };
  }

  // Helper methods for MyDATA mappings
  getMyDataInvoiceType(type) {
    const typeMap = {
      'invoice': '1.1',          // Τιμολόγιο Πώλησης
      'credit_note': '5.1',      // Πιστωτικό Τιμολόγιο
      'debit_note': '5.2',       // Χρεωστικό Τιμολόγιο
      'receipt': '11.1',         // ΑΛΠ
      'proforma': '1.1'          // Treated as regular invoice
    };
    return typeMap[type] || '1.1';
  }

  getMyDataVatCategory(vatCategory) {
    const vatMap = {
      'normal': 1,        // 24%
      'reduced': 2,       // 13%
      'super_reduced': 3, // 6%
      'exempt': 4,        // 0% - Απαλλαγή
      'reverse': 6        // Αντίστροφη φόρτωση
    };
    return vatMap[vatCategory] || 1;
  }

  getMyDataPaymentMethod(method) {
    const methodMap = {
      'cash': 3,           // Μετρητά
      'card': 7,           // Πιστωτική/Χρεωστική κάρτα
      'bank_transfer': 1,  // Επαγ. Εντολή Πληρωμής
      'check': 2,          // Επιταγή
      'other': 5           // Άλλο
    };
    return methodMap[method] || 5;
  }

  getIncomeClassifications(items) {
    const classifications = [];
    
    items.forEach(item => {
      if (item.incomeClassification) {
        const existing = classifications.find(c => 
          c.classificationType === item.incomeClassification
        );
        
        if (existing) {
          existing.amount += item.netAmount;
        } else {
          classifications.push({
            classificationType: item.incomeClassification,
            classificationCategory: this.getClassificationCategory(item.incomeClassification),
            amount: item.netAmount
          });
        }
      }
    });
    
    return classifications.length > 0 ? classifications : undefined;
  }

  getClassificationCategory(classificationType) {
    // Most income classifications are category_1_1 (Έσοδα από πώληση αγαθών και υπηρεσιών)
    if (classificationType.startsWith('E3_561') || classificationType.startsWith('E3_598')) {
      return 'category_1_1';
    }
    return 'category_1_1'; // Default
  }

  getVatExemptionCategory(reason) {
    // Common VAT exemption categories
    if (reason.includes('άρθρο 3')) return 1;
    if (reason.includes('άρθρο 5')) return 2;
    if (reason.includes('άρθρο 13')) return 3;
    if (reason.includes('άρθρο 14')) return 4;
    if (reason.includes('άρθρο 16')) return 5;
    return 30; // Other
  }

  // Utility methods
  validateInvoiceData(invoice) {
    if (!invoice.company?.vatNumber) {
      throw new Error('Customer VAT number is required for MyDATA submission');
    }
    
    if (!invoice.items || invoice.items.length === 0) {
      throw new Error('Invoice must have at least one item for MyDATA submission');
    }
    
    if (!process.env.COMPANY_VAT_NUMBER) {
      throw new Error('Company VAT number not configured');
    }
  }

  extractInvoiceNumber(invoiceNumber) {
    // Extract numeric part from invoice number (e.g., "A000123" -> 123)
    const match = invoiceNumber.match(/\d+/);
    return match ? parseInt(match[0]) : 1;
  }

  formatDateForMyData(date) {
    // Format: YYYY-MM-DD
    return new Date(date).toISOString().split('T')[0];
  }

  parseSubmissionResponse(responseData) {
    // Parse MyDATA response and extract relevant information
    if (responseData.response) {
      const response = responseData.response;
      
      if (response.index && response.index.length > 0) {
        const indexItem = response.index[0];
        return {
          statusCode: indexItem.invoiceType ? 'Success' : 'Error',
          mark: indexItem.mark,
          uid: indexItem.invoiceUid,
          errors: indexItem.errors || []
        };
      }
    }
    
    return {
      statusCode: 'Error',
      errors: ['Invalid response format']
    };
  }

  // Cancel invoice in MyDATA
  async cancelInvoice(invoice) {
    try {
      if (!invoice.mydataId) {
        throw new Error('Invoice not submitted to MyDATA');
      }

      const response = await this.client.post('/CancelInvoice', {
        mark: invoice.mydataId
      });

      // Update invoice status
      await invoice.update({
        status: 'cancelled',
        mydataStatus: 'cancelled',
        metadata: {
          ...invoice.metadata,
          mydataCancelled: new Date().toISOString()
        }
      });

      // Audit log
      await auditService.log({
        action: 'mydata_cancel',
        status: 'success',
        category: 'mydata',
        entityType: 'Invoice',
        entityId: invoice.id,
        description: 'Invoice cancelled in MyDATA'
      });

      return {
        success: true,
        message: 'Invoice cancelled successfully in MyDATA'
      };

    } catch (error) {
      console.error('MyDATA cancellation error:', error);
      throw error;
    }
  }

  // Get invoice status from MyDATA
  async getInvoiceStatus(mydataId) {
    try {
      const response = await this.client.get(`/RequestDocs`, {
        params: {
          mark: mydataId
        }
      });

      return this.parseStatusResponse(response.data);

    } catch (error) {
      console.error('MyDATA status check error:', error);
      throw error;
    }
  }

  parseStatusResponse(responseData) {
    // Parse status response from MyDATA
    if (responseData.invoicesDoc && responseData.invoicesDoc.invoice) {
      const invoice = responseData.invoicesDoc.invoice[0];
      return {
        status: invoice.invoiceHeader?.invoiceType ? 'accepted' : 'pending',
        details: invoice
      };
    }
    
    return {
      status: 'unknown',
      details: responseData
    };
  }

  // Test connection to MyDATA
  async testConnection() {
    try {
      const response = await this.client.get('/RequestDocs', {
        params: {
          dateFrom: new Date().toISOString().split('T')[0],
          dateTo: new Date().toISOString().split('T')[0]
        }
      });

      return {
        success: true,
        environment: this.environment,
        message: 'MyDATA connection successful'
      };

    } catch (error) {
      return {
        success: false,
        environment: this.environment,
        error: error.message
      };
    }
  }

  // Bulk submit invoices
  async bulkSubmitInvoices(invoices) {
    const results = [];

    for (const invoice of invoices) {
      try {
        const result = await this.submitInvoice(invoice);
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          success: result.success,
          mydataId: result.mydataId,
          errors: result.errors
        });
      } catch (error) {
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          success: false,
          error: error.message
        });
      }
    }

    return {
      submitted: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  // Get transmission logs
  async getTransmissionLogs(dateFrom, dateTo) {
    try {
      const response = await this.client.get('/RequestTransmittedDocs', {
        params: {
          dateFrom: this.formatDateForMyData(dateFrom),
          dateTo: this.formatDateForMyData(dateTo)
        }
      });

      return response.data;

    } catch (error) {
      console.error('MyDATA transmission logs error:', error);
      throw error;
    }
  }
}

export default new MyDataService();