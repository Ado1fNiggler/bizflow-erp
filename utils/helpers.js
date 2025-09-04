// utils/helpers.js
// Utility helper functions for BizFlow ERP

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import 'moment/locale/el.js'; // Greek locale

// Set default locale to Greek
moment.locale('el');

// ======================
// String Utilities
// ======================

// Generate random string
export function generateRandomString(length = 10) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

// Generate unique code
export function generateUniqueCode(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = generateRandomString(4).toUpperCase();
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

// Slugify string for URLs
export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Capitalize first letter
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Title case
export function titleCase(str) {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

// Truncate text
export function truncate(text, length = 100, suffix = '...') {
  if (text.length <= length) return text;
  return text.substring(0, length).trim() + suffix;
}

// ======================
// Greek-specific Utilities
// ======================

// Convert Greek text to uppercase (handles accents)
export function greekUpperCase(text) {
  return text
    .toUpperCase()
    .replace(/Ά/g, 'Α')
    .replace(/Έ/g, 'Ε')
    .replace(/Ή/g, 'Η')
    .replace(/Ί/g, 'Ι')
    .replace(/Ό/g, 'Ο')
    .replace(/Ύ/g, 'Υ')
    .replace(/Ώ/g, 'Ω');
}

// Validate Greek VAT number (ΑΦΜ)
export function validateGreekVAT(vat) {
  if (!vat || vat.length !== 9) return false;
  
  const digits = vat.split('').map(Number);
  if (digits.some(isNaN)) return false;
  
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += digits[i] * Math.pow(2, 8 - i);
  }
  
  const checkDigit = sum % 11 % 10;
  return checkDigit === digits[8];
}

// Validate Greek postal code
export function validateGreekPostalCode(code) {
  return /^\d{5}$/.test(code);
}

// Format Greek phone number
export function formatGreekPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('30')) {
    // International format
    if (cleaned.length === 12) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    }
  } else if (cleaned.startsWith('2') || cleaned.startsWith('6')) {
    // National format
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
  }
  
  return phone; // Return original if not valid format
}

// ======================
// Number Utilities
// ======================

// Format currency (EUR)
export function formatCurrency(amount, symbol = '€') {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Format number with Greek locale
export function formatNumber(num, decimals = 2) {
  return new Intl.NumberFormat('el-GR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

// Calculate VAT
export function calculateVAT(amount, vatRate = 24) {
  const vat = amount * (vatRate / 100);
  return {
    net: amount,
    vat: Math.round(vat * 100) / 100,
    gross: Math.round((amount + vat) * 100) / 100,
    rate: vatRate
  };
}

// Round to decimal places
export function roundTo(num, decimals = 2) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Parse Greek formatted number
export function parseGreekNumber(str) {
  return parseFloat(str.replace(/\./g, '').replace(',', '.'));
}

// ======================
// Date Utilities
// ======================

// Format date in Greek
export function formatGreekDate(date, format = 'DD/MM/YYYY') {
  return moment(date).format(format);
}

// Get Greek month name
export function getGreekMonth(date) {
  return moment(date).format('MMMM');
}

// Get fiscal year (Greece: Jan 1 - Dec 31)
export function getFiscalYear(date = new Date()) {
  return moment(date).year();
}

// Get fiscal quarter
export function getFiscalQuarter(date = new Date()) {
  return Math.ceil((moment(date).month() + 1) / 3);
}

// Check if business day (excludes weekends and Greek holidays)
export function isBusinessDay(date) {
  const m = moment(date);
  const dayOfWeek = m.day();
  
  // Weekend check
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  
  // Greek public holidays (simplified - add more as needed)
  const holidays = [
    '01-01', // New Year
    '06-01', // Epiphany
    '25-03', // Independence Day
    '01-05', // Labour Day
    '15-08', // Assumption
    '28-10', // Ohi Day
    '25-12', // Christmas
    '26-12'  // Boxing Day
  ];
  
  const dateStr = m.format('DD-MM');
  return !holidays.includes(dateStr);
}

// Calculate business days between dates
export function businessDaysBetween(startDate, endDate) {
  let count = 0;
  const current = moment(startDate);
  const end = moment(endDate);
  
  while (current.isSameOrBefore(end)) {
    if (isBusinessDay(current)) count++;
    current.add(1, 'day');
  }
  
  return count;
}

// ======================
// Validation Utilities
// ======================

// Validate email
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validate IBAN (Greek)
export function validateGreekIBAN(iban) {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  if (!/^GR\d{25}$/.test(cleaned)) return false;
  
  // IBAN validation algorithm
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, char => (char.charCodeAt(0) - 55).toString());
  const bigInt = BigInt(numeric);
  
  return bigInt % 97n === 1n;
}

// Validate strong password
export function validatePassword(password) {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return re.test(password);
}

// ======================
// Security Utilities
// ======================

// Hash password
export async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Compare password
export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Generate secure token
export function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Hash string with SHA256
export function hashSHA256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Encrypt data
export function encrypt(text, key = process.env.ENCRYPTION_KEY) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

// Decrypt data
export function decrypt(text, key = process.env.ENCRYPTION_KEY) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// ======================
// File Utilities
// ======================

// Get file extension
export function getFileExtension(filename) {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

// Generate unique filename
export function generateUniqueFilename(originalName) {
  const ext = getFileExtension(originalName);
  const timestamp = Date.now();
  const random = generateRandomString(6);
  return `${timestamp}-${random}.${ext}`;
}

// Format file size
export function formatFileSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Validate file type
export function validateFileType(filename, allowedTypes) {
  const ext = getFileExtension(filename).toLowerCase();
  return allowedTypes.includes(ext);
}

// ======================
// Array Utilities
// ======================

// Chunk array
export function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Remove duplicates
export function uniqueArray(array, key) {
  if (key) {
    return [...new Map(array.map(item => [item[key], item])).values()];
  }
  return [...new Set(array)];
}

// Group by key
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {});
}

// Sort by multiple keys
export function sortBy(array, ...keys) {
  return array.sort((a, b) => {
    for (const key of keys) {
      if (a[key] < b[key]) return -1;
      if (a[key] > b[key]) return 1;
    }
    return 0;
  });
}

// ======================
// Object Utilities
// ======================

// Deep clone object
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Merge objects deeply
export function deepMerge(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();
  
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  
  return deepMerge(target, ...sources);
}

// Check if object
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// Pick properties from object
export function pick(obj, keys) {
  return keys.reduce((result, key) => {
    if (obj.hasOwnProperty(key)) {
      result[key] = obj[key];
    }
    return result;
  }, {});
}

// Omit properties from object
export function omit(obj, keys) {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

// ======================
// Business Logic Utilities
// ======================

// Generate invoice number
export function generateInvoiceNumber(prefix = 'INV', sequence = 1, year = null) {
  const y = year || new Date().getFullYear();
  const seq = String(sequence).padStart(6, '0');
  return `${prefix}-${y}-${seq}`;
}

// Calculate due date
export function calculateDueDate(issueDate, terms = 30) {
  return moment(issueDate).add(terms, 'days').toDate();
}

// Check if overdue
export function isOverdue(dueDate) {
  return moment().isAfter(moment(dueDate));
}

// Calculate age in days
export function ageInDays(date) {
  return moment().diff(moment(date), 'days');
}

// Format percentage
export function formatPercentage(value, decimals = 2) {
  return `${roundTo(value, decimals)}%`;
}

// ======================
// Export all utilities
// ======================

export default {
  // String
  generateRandomString,
  generateUniqueCode,
  slugify,
  capitalize,
  titleCase,
  truncate,
  
  // Greek
  greekUpperCase,
  validateGreekVAT,
  validateGreekPostalCode,
  formatGreekPhone,
  
  // Number
  formatCurrency,
  formatNumber,
  calculateVAT,
  roundTo,
  parseGreekNumber,
  
  // Date
  formatGreekDate,
  getGreekMonth,
  getFiscalYear,
  getFiscalQuarter,
  isBusinessDay,
  businessDaysBetween,
  
  // Validation
  validateEmail,
  validateGreekIBAN,
  validatePassword,
  
  // Security
  hashPassword,
  comparePassword,
  generateToken,
  hashSHA256,
  encrypt,
  decrypt,
  
  // File
  getFileExtension,
  generateUniqueFilename,
  formatFileSize,
  validateFileType,
  
  // Array
  chunkArray,
  uniqueArray,
  groupBy,
  sortBy,
  
  // Object
  deepClone,
  deepMerge,
  pick,
  omit,
  
  // Business
  generateInvoiceNumber,
  calculateDueDate,
  isOverdue,
  ageInDays,
  formatPercentage
};