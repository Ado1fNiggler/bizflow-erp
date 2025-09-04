// utils/validators.js
// Validation utilities for BizFlow ERP

import validator from 'validator';

/**
 * Greek-specific validators
 */
export const greekValidators = {
  /**
   * Validate Greek AFM (VAT Number)
   * @param {string} afm - The VAT number to validate
   * @returns {boolean}
   */
  validateAFM(afm) {
    if (!afm || typeof afm !== 'string') return false;
    
    // Remove spaces and convert to string
    afm = afm.replace(/\s/g, '');
    
    // AFM must be 9 digits
    if (!/^\d{9}$/.test(afm)) return false;
    
    // Luhn algorithm for Greek AFM
    const digits = afm.split('').map(Number);
    const checkDigit = digits[8];
    let sum = 0;
    
    for (let i = 0; i < 8; i++) {
      sum += digits[i] * Math.pow(2, 8 - i);
    }
    
    const modulo = sum % 11;
    const calculatedCheck = modulo === 10 ? 0 : modulo;
    
    return checkDigit === calculatedCheck;
  },

  /**
   * Validate Greek AMKA (Social Security Number)
   * @param {string} amka - The AMKA to validate
   * @returns {boolean}
   */
  validateAMKA(amka) {
    if (!amka || typeof amka !== 'string') return false;
    
    // AMKA format: DDMMYY + 5 digits (total 11 digits)
    amka = amka.replace(/\s/g, '');
    
    if (!/^\d{11}$/.test(amka)) return false;
    
    // Extract date parts
    const day = parseInt(amka.substring(0, 2));
    const month = parseInt(amka.substring(2, 4));
    const year = parseInt(amka.substring(4, 6));
    
    // Basic date validation
    if (day < 1 || day > 31) return false;
    if (month < 1 || month > 12) return false;
    
    return true;
  },

  /**
   * Validate Greek mobile phone
   * @param {string} phone - The phone number to validate
   * @returns {boolean}
   */
  validateGreekMobile(phone) {
    if (!phone) return false;
    
    // Remove spaces, dashes, and country code
    phone = phone.replace(/[\s\-]/g, '');
    phone = phone.replace(/^(\+30|0030)/, '');
    
    // Greek mobile numbers start with 69 and have 10 digits total
    return /^69\d{8}$/.test(phone);
  },

  /**
   * Validate Greek landline phone
   * @param {string} phone - The phone number to validate
   * @returns {boolean}
   */
  validateGreekLandline(phone) {
    if (!phone) return false;
    
    // Remove spaces, dashes, and country code
    phone = phone.replace(/[\s\-]/g, '');
    phone = phone.replace(/^(\+30|0030)/, '');
    
    // Greek landlines start with 2 and have 10 digits
    return /^2\d{9}$/.test(phone);
  },

  /**
   * Validate Greek postal code
   * @param {string} code - The postal code to validate
   * @returns {boolean}
   */
  validateGreekPostalCode(code) {
    if (!code) return false;
    
    // Greek postal codes are 5 digits
    return /^\d{5}$/.test(code.replace(/\s/g, ''));
  }
};

/**
 * Business validators
 */
export const businessValidators = {
  /**
   * Validate IBAN
   * @param {string} iban - The IBAN to validate
   * @returns {boolean}
   */
  validateIBAN(iban) {
    if (!iban) return false;
    return validator.isIBAN(iban.replace(/\s/g, ''));
  },

  /**
   * Validate invoice number format
   * @param {string} invoiceNo - The invoice number
   * @returns {boolean}
   */
  validateInvoiceNumber(invoiceNo) {
    if (!invoiceNo) return false;
    
    // Format: PREFIX-YEAR-NUMBER (e.g., INV-2024-00001)
    return /^[A-Z]{2,4}-\d{4}-\d{5,}$/.test(invoiceNo);
  },

  /**
   * Validate discount percentage
   * @param {number} discount - The discount percentage
   * @returns {boolean}
   */
  validateDiscount(discount) {
    return discount >= 0 && discount <= 100;
  },

  /**
   * Validate tax rate
   * @param {number} rate - The tax rate
   * @returns {boolean}
   */
  validateTaxRate(rate) {
    // Greek VAT rates: 0%, 4%, 6%, 13%, 24%
    const validRates = [0, 4, 6, 13, 24];
    return validRates.includes(rate);
  },

  /**
   * Validate payment terms
   * @param {number} days - Payment term days
   * @returns {boolean}
   */
  validatePaymentTerms(days) {
    const validTerms = [0, 7, 14, 30, 60, 90, 120];
    return validTerms.includes(days);
  }
};

/**
 * General validators
 */
export const generalValidators = {
  /**
   * Validate email
   * @param {string} email - Email address
   * @returns {boolean}
   */
  validateEmail(email) {
    if (!email) return false;
    return validator.isEmail(email);
  },

  /**
   * Validate URL
   * @param {string} url - URL to validate
   * @returns {boolean}
   */
  validateURL(url) {
    if (!url) return false;
    return validator.isURL(url);
  },

  /**
   * Validate strong password
   * @param {string} password - Password to validate
   * @returns {object}
   */
  validatePassword(password) {
    const result = {
      isValid: false,
      errors: []
    };

    if (!password) {
      result.errors.push('Ο κωδικός είναι υποχρεωτικός');
      return result;
    }

    if (password.length < 8) {
      result.errors.push('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες');
    }

    if (!/[A-Z]/.test(password)) {
      result.errors.push('Ο κωδικός πρέπει να περιέχει τουλάχιστον ένα κεφαλαίο γράμμα');
    }

    if (!/[a-z]/.test(password)) {
      result.errors.push('Ο κωδικός πρέπει να περιέχει τουλάχιστον ένα μικρό γράμμα');
    }

    if (!/\d/.test(password)) {
      result.errors.push('Ο κωδικός πρέπει να περιέχει τουλάχιστον έναν αριθμό');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      result.errors.push('Ο κωδικός πρέπει να περιέχει τουλάχιστον ένα ειδικό χαρακτήρα');
    }

    result.isValid = result.errors.length === 0;
    return result;
  },

  /**
   * Validate date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {boolean}
   */
  validateDateRange(startDate, endDate) {
    if (!startDate || !endDate) return false;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return start <= end;
  },

  /**
   * Sanitize input to prevent XSS
   * @param {string} input - Input to sanitize
   * @returns {string}
   */
  sanitizeInput(input) {
    if (!input) return '';
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  /**
   * Validate file type
   * @param {string} filename - File name
   * @param {array} allowedTypes - Allowed MIME types
   * @returns {boolean}
   */
  validateFileType(filename, allowedTypes = []) {
    if (!filename) return false;
    
    const extension = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif'
    };
    
    const fileMime = mimeTypes[extension];
    
    if (!fileMime) return false;
    
    return allowedTypes.length === 0 || allowedTypes.includes(fileMime);
  },

  /**
   * Validate file size
   * @param {number} size - File size in bytes
   * @param {number} maxSize - Maximum size in MB
   * @returns {boolean}
   */
  validateFileSize(size, maxSize = 10) {
    if (!size || size < 0) return false;
    
    const maxBytes = maxSize * 1024 * 1024;
    return size <= maxBytes;
  }
};

/**
 * Form validators
 */
export const formValidators = {
  /**
   * Validate company form
   * @param {object} data - Company data
   * @returns {object}
   */
  validateCompanyForm(data) {
    const errors = {};
    
    if (!data.name || data.name.trim().length < 2) {
      errors.name = 'Το όνομα εταιρίας είναι υποχρεωτικό';
    }
    
    if (data.vatNumber && !greekValidators.validateAFM(data.vatNumber)) {
      errors.vatNumber = 'Μη έγκυρο ΑΦΜ';
    }
    
    if (data.email && !generalValidators.validateEmail(data.email)) {
      errors.email = 'Μη έγκυρο email';
    }
    
    if (data.mobile && !greekValidators.validateGreekMobile(data.mobile)) {
      errors.mobile = 'Μη έγκυρος αριθμός κινητού';
    }
    
    if (data.postalCode && !greekValidators.validateGreekPostalCode(data.postalCode)) {
      errors.postalCode = 'Μη έγκυρος ταχυδρομικός κώδικας';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * Validate member form
   * @param {object} data - Member data
   * @returns {object}
   */
  validateMemberForm(data) {
    const errors = {};
    
    if (!data.firstName || data.firstName.trim().length < 2) {
      errors.firstName = 'Το όνομα είναι υποχρεωτικό';
    }
    
    if (!data.lastName || data.lastName.trim().length < 2) {
      errors.lastName = 'Το επώνυμο είναι υποχρεωτικό';
    }
    
    if (!data.email || !generalValidators.validateEmail(data.email)) {
      errors.email = 'Το email είναι υποχρεωτικό και πρέπει να είναι έγκυρο';
    }
    
    if (data.amka && !greekValidators.validateAMKA(data.amka)) {
      errors.amka = 'Μη έγκυρο ΑΜΚΑ';
    }
    
    if (data.mobile && !greekValidators.validateGreekMobile(data.mobile)) {
      errors.mobile = 'Μη έγκυρος αριθμός κινητού';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * Validate document form
   * @param {object} data - Document data
   * @returns {object}
   */
  validateDocumentForm(data) {
    const errors = {};
    
    if (!data.type) {
      errors.type = 'Ο τύπος παραστατικού είναι υποχρεωτικός';
    }
    
    if (!data.companyId) {
      errors.companyId = 'Η εταιρία είναι υποχρεωτική';
    }
    
    if (!data.date) {
      errors.date = 'Η ημερομηνία είναι υποχρεωτική';
    }
    
    if (!data.items || data.items.length === 0) {
      errors.items = 'Πρέπει να υπάρχει τουλάχιστον ένα προϊόν';
    }
    
    // Validate items
    if (data.items) {
      data.items.forEach((item, index) => {
        if (!item.description) {
          errors[`item_${index}_description`] = 'Η περιγραφή είναι υποχρεωτική';
        }
        
        if (!item.quantity || item.quantity <= 0) {
          errors[`item_${index}_quantity`] = 'Η ποσότητα πρέπει να είναι θετικός αριθμός';
        }
        
        if (!item.unitPrice || item.unitPrice < 0) {
          errors[`item_${index}_unitPrice`] = 'Η τιμή μονάδας δεν μπορεί να είναι αρνητική';
        }
        
        if (item.taxRate && !businessValidators.validateTaxRate(item.taxRate)) {
          errors[`item_${index}_taxRate`] = 'Μη έγκυρος συντελεστής ΦΠΑ';
        }
      });
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

// Export all validators as default
export default {
  ...greekValidators,
  ...businessValidators,
  ...generalValidators,
  ...formValidators
};