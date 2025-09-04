// utils/formatters.js
// Formatting utilities for BizFlow ERP

import moment from 'moment';
import 'moment/locale/el.js'; // Greek locale

// Set default locale to Greek
moment.locale('el');

/**
 * Number formatters
 */
export const numberFormatters = {
  /**
   * Format currency (EUR)
   * @param {number} amount - Amount to format
   * @param {boolean} showSymbol - Show € symbol
   * @returns {string}
   */
  formatCurrency(amount, showSymbol = true) {
    if (amount === null || amount === undefined) return '0,00 €';
    
    const formatted = new Intl.NumberFormat('el-GR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
    
    return showSymbol ? `${formatted} €` : formatted;
  },

  /**
   * Format percentage
   * @param {number} value - Percentage value
   * @param {number} decimals - Number of decimal places
   * @returns {string}
   */
  formatPercentage(value, decimals = 2) {
    if (value === null || value === undefined) return '0%';
    
    return new Intl.NumberFormat('el-GR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value) + '%';
  },

  /**
   * Format large numbers with K, M, B suffixes
   * @param {number} num - Number to format
   * @returns {string}
   */
  formatCompactNumber(num) {
    if (num === null || num === undefined) return '0';
    
    if (num >= 1e9) {
      return (num / 1e9).toFixed(1) + 'B';
    } else if (num >= 1e6) {
      return (num / 1e6).toFixed(1) + 'M';
    } else if (num >= 1e3) {
      return (num / 1e3).toFixed(1) + 'K';
    }
    
    return num.toString();
  },

  /**
   * Format decimal number
   * @param {number} value - Value to format
   * @param {number} decimals - Number of decimal places
   * @returns {string}
   */
  formatDecimal(value, decimals = 2) {
    if (value === null || value === undefined) return '0';
    
    return new Intl.NumberFormat('el-GR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  },

  /**
   * Round to specified decimal places
   * @param {number} value - Value to round
   * @param {number} decimals - Decimal places
   * @returns {number}
   */
  roundNumber(value, decimals = 2) {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
};

/**
 * Date formatters
 */
export const dateFormatters = {
  /**
   * Format date to Greek format
   * @param {Date|string} date - Date to format
   * @param {string} format - Date format
   * @returns {string}
   */
  formatDate(date, format = 'DD/MM/YYYY') {
    if (!date) return '';
    return moment(date).format(format);
  },

  /**
   * Format date with time
   * @param {Date|string} date - Date to format
   * @returns {string}
   */
  formatDateTime(date) {
    if (!date) return '';
    return moment(date).format('DD/MM/YYYY HH:mm');
  },

  /**
   * Format relative time (e.g., "2 hours ago")
   * @param {Date|string} date - Date to format
   * @returns {string}
   */
  formatRelativeTime(date) {
    if (!date) return '';
    return moment(date).fromNow();
  },

  /**
   * Format date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {string}
   */
  formatDateRange(startDate, endDate) {
    if (!startDate || !endDate) return '';
    
    const start = moment(startDate);
    const end = moment(endDate);
    
    if (start.isSame(end, 'day')) {
      return start.format('DD/MM/YYYY');
    }
    
    if (start.isSame(end, 'month')) {
      return `${start.format('DD')} - ${end.format('DD/MM/YYYY')}`;
    }
    
    if (start.isSame(end, 'year')) {
      return `${start.format('DD/MM')} - ${end.format('DD/MM/YYYY')}`;
    }
    
    return `${start.format('DD/MM/YYYY')} - ${end.format('DD/MM/YYYY')}`;
  },

  /**
   * Get month name in Greek
   * @param {number} month - Month number (1-12)
   * @returns {string}
   */
  getMonthName(month) {
    const months = [
      'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
      'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
      'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
    ];
    return months[month - 1] || '';
  },

  /**
   * Format duration
   * @param {number} seconds - Duration in seconds
   * @returns {string}
   */
  formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0 δευτερόλεπτα';
    
    const duration = moment.duration(seconds, 'seconds');
    const parts = [];
    
    if (duration.days() > 0) {
      parts.push(`${duration.days()} ${duration.days() === 1 ? 'ημέρα' : 'ημέρες'}`);
    }
    if (duration.hours() > 0) {
      parts.push(`${duration.hours()} ${duration.hours() === 1 ? 'ώρα' : 'ώρες'}`);
    }
    if (duration.minutes() > 0) {
      parts.push(`${duration.minutes()} ${duration.minutes() === 1 ? 'λεπτό' : 'λεπτά'}`);
    }
    if (duration.seconds() > 0 && parts.length === 0) {
      parts.push(`${duration.seconds()} ${duration.seconds() === 1 ? 'δευτερόλεπτο' : 'δευτερόλεπτα'}`);
    }
    
    return parts.join(', ');
  }
};

/**
 * Text formatters
 */
export const textFormatters = {
  /**
   * Capitalize first letter
   * @param {string} text - Text to capitalize
   * @returns {string}
   */
  capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  },

  /**
   * Title case (capitalize each word)
   * @param {string} text - Text to format
   * @returns {string}
   */
  toTitleCase(text) {
    if (!text) return '';
    return text.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  },

  /**
   * Truncate text
   * @param {string} text - Text to truncate
   * @param {number} length - Maximum length
   * @param {string} suffix - Suffix to add
   * @returns {string}
   */
  truncate(text, length = 50, suffix = '...') {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length - suffix.length) + suffix;
  },

  /**
   * Format phone number
   * @param {string} phone - Phone number
   * @returns {string}
   */
  formatPhone(phone) {
    if (!phone) return '';
    
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // Greek mobile (69XXXXXXXX)
    if (cleaned.startsWith('69') && cleaned.length === 10) {
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    }
    
    // Greek landline (2XXXXXXXXX)
    if (cleaned.startsWith('2') && cleaned.length === 10) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
    
    // International format
    if (cleaned.startsWith('30')) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)} ${cleaned.slice(10)}`;
    }
    
    return phone;
  },

  /**
   * Format AFM (Greek VAT number)
   * @param {string} afm - AFM number
   * @returns {string}
   */
  formatAFM(afm) {
    if (!afm) return '';
    
    const cleaned = afm.replace(/\D/g, '');
    if (cleaned.length !== 9) return afm;
    
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  },

  /**
   * Format IBAN
   * @param {string} iban - IBAN number
   * @returns {string}
   */
  formatIBAN(iban) {
    if (!iban) return '';
    
    const cleaned = iban.replace(/\s/g, '').toUpperCase();
    const parts = [];
    
    for (let i = 0; i < cleaned.length; i += 4) {
      parts.push(cleaned.substring(i, i + 4));
    }
    
    return parts.join(' ');
  },

  /**
   * Slugify text (for URLs)
   * @param {string} text - Text to slugify
   * @returns {string}
   */
  slugify(text) {
    if (!text) return '';
    
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  },

  /**
   * Remove accents from Greek text
   * @param {string} text - Text with accents
   * @returns {string}
   */
  removeAccents(text) {
    if (!text) return '';
    
    const accentsMap = {
      'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι',
      'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω', 'Ά': 'Α',
      'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο',
      'Ύ': 'Υ', 'Ώ': 'Ω', 'ΐ': 'ι', 'ΰ': 'υ'
    };
    
    return text.replace(/[άέήίόύώΆΈΉΊΌΎΏΐΰ]/g, match => accentsMap[match] || match);
  }
};

/**
 * Business formatters
 */
export const businessFormatters = {
  /**
   * Format invoice number
   * @param {number} number - Invoice number
   * @param {string} prefix - Invoice prefix
   * @param {number} year - Invoice year
   * @returns {string}
   */
  formatInvoiceNumber(number, prefix = 'INV', year = new Date().getFullYear()) {
    const paddedNumber = String(number).padStart(5, '0');
    return `${prefix}-${year}-${paddedNumber}`;
  },

  /**
   * Format document type to Greek
   * @param {string} type - Document type
   * @returns {string}
   */
  formatDocumentType(type) {
    const types = {
      'invoice': 'Τιμολόγιο',
      'receipt': 'Απόδειξη',
      'credit_note': 'Πιστωτικό',
      'debit_note': 'Χρεωστικό',
      'order': 'Παραγγελία',
      'quote': 'Προσφορά',
      'delivery_note': 'Δελτίο Αποστολής'
    };
    
    return types[type] || type;
  },

  /**
   * Format payment status
   * @param {string} status - Payment status
   * @returns {object}
   */
  formatPaymentStatus(status) {
    const statuses = {
      'pending': { text: 'Εκκρεμεί', color: 'warning' },
      'paid': { text: 'Εξοφλημένο', color: 'success' },
      'partial': { text: 'Μερική Εξόφληση', color: 'info' },
      'overdue': { text: 'Ληξιπρόθεσμο', color: 'danger' },
      'cancelled': { text: 'Ακυρωμένο', color: 'secondary' }
    };
    
    return statuses[status] || { text: status, color: 'secondary' };
  },

  /**
   * Format company type
   * @param {string} type - Company type code
   * @returns {string}
   */
  formatCompanyType(type) {
    const types = {
      'SA': 'Ανώνυμη Εταιρία (Α.Ε.)',
      'LTD': 'Εταιρία Περιορισμένης Ευθύνης (Ε.Π.Ε.)',
      'PC': 'Ιδιωτική Κεφαλαιουχική Εταιρία (Ι.Κ.Ε.)',
      'GP': 'Ομόρρυθμη Εταιρία (Ο.Ε.)',
      'LP': 'Ετερόρρυθμη Εταιρία (Ε.Ε.)',
      'SOLE': 'Ατομική Επιχείρηση'
    };
    
    return types[type] || type;
  },

  /**
   * Format file size
   * @param {number} bytes - File size in bytes
   * @returns {string}
   */
  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
};

// Export all formatters as default
export default {
  ...numberFormatters,
  ...dateFormatters,
  ...textFormatters,
  ...businessFormatters
};