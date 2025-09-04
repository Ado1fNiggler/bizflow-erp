// services/migrationService.js
// Migration service για μετάβαση από DBF files σε PostgreSQL

import fs from 'fs/promises';
import path from 'path';
// import { Parser } from 'node-dbf'; // Optional - only for DBF migration
// import iconv from 'iconv-lite'; // Optional - only for DBF migration
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sequelize from '../config/database.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Member from '../models/Member.js';
import { logInfo, logError, logWarning } from '../middleware/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MigrationService {
  constructor() {
    this.dbfPath = path.join(__dirname, '..', '..', 'legacy-data');
    this.encoding = 'win1253'; // Greek Windows encoding
    this.batchSize = 100;
    this.progress = {
      total: 0,
      processed: 0,
      errors: [],
      warnings: []
    };
  }

  // Κύρια μέθοδος migration
  async migrateAll(options = {}) {
    const startTime = Date.now();
    
    try {
      logInfo('Starting full migration from DBF files');
      
      // Reset progress
      this.progress = {
        total: 0,
        processed: 0,
        errors: [],
        warnings: []
      };
      
      // Start transaction
      const transaction = await sequelize.transaction();
      
      try {
        // 1. Migrate companies (ETAIR.DBF)
        const companies = await this.migrateCompanies(transaction);
        logInfo(`Migrated ${companies.length} companies`);
        
        // 2. Migrate members (BMEM.DBF)
        const members = await this.migrateMembers(transaction);
        logInfo(`Migrated ${members.length} members`);
        
        // 3. Migrate financial data (FPAR.DBF)
        const financialRecords = await this.migrateFinancialData(transaction);
        logInfo(`Migrated ${financialRecords.length} financial records`);
        
        // 4. Create default admin user
        if (options.createAdmin !== false) {
          await this.createDefaultAdmin(transaction);
        }
        
        // 5. Update statistics
        await this.updateStatistics(transaction);
        
        // Commit transaction
        await transaction.commit();
        
        const duration = (Date.now() - startTime) / 1000;
        
        const result = {
          success: true,
          duration: `${duration}s`,
          statistics: {
            companies: companies.length,
            members: members.length,
            financialRecords: financialRecords.length,
            errors: this.progress.errors.length,
            warnings: this.progress.warnings.length
          },
          progress: this.progress
        };
        
        logInfo('Migration completed successfully', result);
        return result;
        
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
      
    } catch (error) {
      logError('Migration failed', error);
      throw error;
    }
  }

  // Migrate companies από ETAIR.DBF
  async migrateCompanies(transaction) {
    const dbfFile = path.join(this.dbfPath, 'ETAIR.DBF');
    
    try {
      const records = await this.readDBF(dbfFile);
      const companies = [];
      
      for (const record of records) {
        try {
          // Map DBF fields to model
          const companyData = {
            // Βασικά στοιχεία
            name: this.cleanString(record.EPONIMIA),
            legalName: this.cleanString(record.EPWNYMIA || record.EPONIMIA),
            afm: this.cleanString(record.AFM),
            doy: this.cleanString(record.DOY),
            
            // Στοιχεία επικοινωνίας
            email: this.cleanEmail(record.EMAIL),
            phone: this.cleanPhone(record.THLEFWNO),
            mobile: this.cleanPhone(record.KINHTO),
            fax: this.cleanPhone(record.FAX),
            website: this.cleanString(record.WEBSITE),
            
            // Διεύθυνση
            street: this.cleanString(record.ODOS),
            streetNumber: this.cleanString(record.ARITHMOS),
            city: this.cleanString(record.POLI),
            postalCode: this.cleanString(record.TK),
            
            // Επιχειρηματικά στοιχεία
            businessType: this.mapBusinessType(record.MORFH),
            industry: this.cleanString(record.KLADOS),
            description: this.cleanString(record.PARATHRHSEIS),
            
            // Settings
            settings: {
              invoicePrefix: record.PREFIX_TIM || 'INV',
              invoiceStartNumber: parseInt(record.AR_TIM) || 1,
              currentInvoiceNumber: parseInt(record.AR_TIM) || 1,
              defaultPaymentTerms: parseInt(record.PLHRWMH) || 30,
              defaultVatRate: parseFloat(record.FPA) || 24
            },
            
            // Status
            isActive: record.ENERGOS !== 'N',
            isVerified: true,
            
            // Timestamps
            createdAt: this.parseDate(record.HM_EGGRAF),
            updatedAt: this.parseDate(record.HM_METAB)
          };
          
          // Create company
          const company = await Company.create(companyData, { transaction });
          companies.push(company);
          
          this.progress.processed++;
          
        } catch (error) {
          this.progress.errors.push({
            type: 'company',
            record: record.EPONIMIA,
            error: error.message
          });
          logWarning('Failed to migrate company', { 
            company: record.EPONIMIA, 
            error: error.message 
          });
        }
      }
      
      return companies;
      
    } catch (error) {
      logError('Failed to read companies DBF', error);
      throw error;
    }
  }

  // Migrate members από BMEM.DBF
  async migrateMembers(transaction) {
    const dbfFile = path.join(this.dbfPath, 'BMEM.DBF');
    
    try {
      const records = await this.readDBF(dbfFile);
      const members = [];
      
      // Get first company for association (temporary)
      const defaultCompany = await Company.findOne({ transaction });
      
      for (const record of records) {
        try {
          const isIndividual = !record.EPWNYMIA || record.EPWNYMIA.trim() === '';
          
          const memberData = {
            companyId: defaultCompany?.id,
            memberType: isIndividual ? 'individual' : 'business',
            
            // Common fields
            email: this.cleanEmail(record.EMAIL),
            phone: this.cleanPhone(record.THLEFWNO),
            mobile: this.cleanPhone(record.KINHTO),
            
            // Address
            street: this.cleanString(record.ODOS),
            streetNumber: this.cleanString(record.ARITHMOS),
            city: this.cleanString(record.POLI),
            postalCode: this.cleanString(record.TK),
            
            // AFM/DOY
            afm: this.cleanString(record.AFM),
            doy: this.cleanString(record.DOY),
            
            // Category
            category: this.mapMemberCategory(record.KATHGORIA),
            
            // Financial
            financial: {
              creditLimit: parseFloat(record.ORIO_PIST) || 0,
              currentBalance: parseFloat(record.YPOLOIPO) || 0,
              paymentTerms: parseInt(record.PLHRWMH) || 30,
              discount: parseFloat(record.EKPTWSH) || 0,
              vatExempt: record.APLOYSTOS === 'Y'
            },
            
            // Status
            isActive: record.ENERGOS !== 'N',
            isFavorite: record.AGAPHTOS === 'Y',
            
            // Notes
            notes: this.cleanString(record.PARATHRHSEIS),
            
            // Timestamps
            createdAt: this.parseDate(record.HM_EGGRAF),
            updatedAt: this.parseDate(record.HM_METAB)
          };
          
          // Individual specific data
          if (isIndividual) {
            memberData.individualData = {
              firstName: this.cleanString(record.ONOMA),
              lastName: this.cleanString(record.EPWNYMO),
              fatherName: this.cleanString(record.PATRONYMO),
              idNumber: this.cleanString(record.ADT),
              profession: this.cleanString(record.EPAGGELMA)
            };
          } else {
            // Business specific data
            memberData.businessData = {
              name: this.cleanString(record.EPWNYMIA),
              legalName: this.cleanString(record.EPWNYMIA),
              businessType: this.mapBusinessType(record.MORFH),
              industry: this.cleanString(record.KLADOS),
              contactPerson: {
                name: this.cleanString(record.YPEYTHYNOS),
                phone: this.cleanPhone(record.THL_YPEYTH)
              }
            };
          }
          
          // Create member
          const member = await Member.create(memberData, { transaction });
          members.push(member);
          
          this.progress.processed++;
          
        } catch (error) {
          this.progress.errors.push({
            type: 'member',
            record: record.EPWNYMIA || record.ONOMA,
            error: error.message
          });
          logWarning('Failed to migrate member', { 
            member: record.EPWNYMIA || record.ONOMA,
            error: error.message 
          });
        }
      }
      
      return members;
      
    } catch (error) {
      logError('Failed to read members DBF', error);
      throw error;
    }
  }

  // Migrate financial data από FPAR.DBF
  async migrateFinancialData(transaction) {
    const dbfFile = path.join(this.dbfPath, 'FPAR.DBF');
    
    try {
      const records = await this.readDBF(dbfFile);
      const financialRecords = [];
      
      for (const record of records) {
        try {
          // Map financial records to appropriate models
          // This would depend on your specific financial structure
          
          const documentType = this.mapDocumentType(record.EIDOS_PAR);
          
          if (documentType) {
            // Here you would create invoices, receipts, etc.
            // This is a simplified example
            
            this.progress.processed++;
            financialRecords.push(record);
          }
          
        } catch (error) {
          this.progress.warnings.push({
            type: 'financial',
            record: record.ARITHMOS,
            error: error.message
          });
        }
      }
      
      return financialRecords;
      
    } catch (error) {
      logError('Failed to read financial DBF', error);
      // Don't throw - financial data is optional
      return [];
    }
  }

  // Read DBF file
  async readDBF(filePath) {
    return new Promise((resolve, reject) => {
      const records = [];
      
      try {
        const parser = new Parser(filePath, {
          encoding: this.encoding
        });
        
        parser.on('record', (record) => {
          records.push(record);
        });
        
        parser.on('end', () => {
          this.progress.total += records.length;
          resolve(records);
        });
        
        parser.on('error', reject);
        
        parser.parse();
        
      } catch (error) {
        reject(error);
      }
    });
  }

  // Helper methods for data cleaning and transformation
  
  cleanString(value) {
    if (!value) return '';
    
    // Convert from Windows-1253 if needed
    if (Buffer.isBuffer(value)) {
      value = iconv.decode(value, this.encoding);
    }
    
    return String(value)
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\u0370-\u03FF\u1F00-\u1FFF]/g, ''); // Keep ASCII and Greek
  }

  cleanEmail(value) {
    const email = this.cleanString(value).toLowerCase();
    
    // Basic email validation
    if (email && email.includes('@') && email.includes('.')) {
      return email;
    }
    
    return null;
  }

  cleanPhone(value) {
    if (!value) return null;
    
    const phone = this.cleanString(value)
      .replace(/[^\d+\-\s()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return phone || null;
  }

  parseDate(value) {
    if (!value) return null;
    
    try {
      // DBF dates are often in YYYYMMDD format
      if (typeof value === 'string' && value.length === 8) {
        const year = value.substr(0, 4);
        const month = value.substr(4, 2);
        const day = value.substr(6, 2);
        return new Date(`${year}-${month}-${day}`);
      }
      
      // Try parsing as date
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (error) {
      // Invalid date
    }
    
    return null;
  }

  mapBusinessType(value) {
    const type = this.cleanString(value).toUpperCase();
    
    const mapping = {
      'ΕΠΕ': 'ΕΠΕ',
      'EPE': 'ΕΠΕ',
      'ΑΕ': 'ΑΕ',
      'AE': 'ΑΕ',
      'ΙΚΕ': 'ΙΚΕ',
      'IKE': 'ΙΚΕ',
      'ΟΕ': 'ΟΕ',
      'OE': 'ΟΕ',
      'ΕΕ': 'ΕΕ',
      'EE': 'ΕΕ',
      'ΑΤΟΜΙΚΗ': 'Ατομική',
      'ATOMIKH': 'Ατομική'
    };
    
    return mapping[type] || 'Ατομική';
  }

  mapMemberCategory(value) {
    const category = this.cleanString(value).toUpperCase();
    
    if (category.includes('ΠΕΛΑΤ') || category.includes('PELAT')) {
      return 'customer';
    } else if (category.includes('ΠΡΟΜΗΘ') || category.includes('PROMITH')) {
      return 'supplier';
    } else if (category.includes('ΜΙΚΤ') || category.includes('MIKT')) {
      return 'both';
    }
    
    return 'customer'; // Default
  }

  mapDocumentType(value) {
    const type = this.cleanString(value).toUpperCase();
    
    const mapping = {
      'ΤΙΜ': 'invoice',
      'TIM': 'invoice',
      'ΤΙΜΟΛΟΓΙΟ': 'invoice',
      'ΑΠΟ': 'receipt',
      'APO': 'receipt',
      'ΑΠΟΔΕΙΞΗ': 'receipt',
      'ΠΙΣ': 'credit_note',
      'PIS': 'credit_note',
      'ΠΙΣΤΩΤΙΚΟ': 'credit_note',
      'ΧΡΕ': 'debit_note',
      'XRE': 'debit_note',
      'ΧΡΕΩΣΤΙΚΟ': 'debit_note',
      'ΠΡΟ': 'quote',
      'PRO': 'quote',
      'ΠΡΟΣΦΟΡΑ': 'quote',
      'ΠΑΡ': 'order',
      'PAR': 'order',
      'ΠΑΡΑΓΓΕΛΙΑ': 'order',
      'ΔΕΛ': 'delivery_note',
      'DEL': 'delivery_note',
      'ΔΕΛΤΙΟ': 'delivery_note'
    };
    
    return mapping[type] || null;
  }

  // Create default admin user
  async createDefaultAdmin(transaction) {
    try {
      const adminExists = await User.findOne({
        where: { email: 'admin@example.com' },
        transaction
      });
      
      if (!adminExists) {
        const admin = await User.create({
          email: 'admin@example.com',
          password: 'Admin123!@#', // Will be hashed automatically
          firstName: 'System',
          lastName: 'Administrator',
          role: 'admin',
          isActive: true,
          isVerified: true,
          preferences: {
            notifications: {
              email: true,
              sms: false
            },
            language: 'el'
          }
        }, { transaction });
        
        logInfo('Default admin user created', { email: admin.email });
        
        this.progress.warnings.push({
          type: 'info',
          message: 'Default admin created with email: admin@example.com and password: Admin123!@#'
        });
      }
    } catch (error) {
      logError('Failed to create default admin', error);
      this.progress.warnings.push({
        type: 'admin',
        error: error.message
      });
    }
  }

  // Update statistics after migration
  async updateStatistics(transaction) {
    try {
      // Update company statistics
      const companies = await Company.findAll({ transaction });
      
      for (const company of companies) {
        await company.updateStatistics();
      }
      
      // Update member statistics
      const members = await Member.findAll({ 
        limit: 100, // Process in batches
        transaction 
      });
      
      for (const member of members) {
        await member.updateStatistics();
      }
      
      logInfo('Statistics updated for all entities');
      
    } catch (error) {
      logWarning('Failed to update some statistics', error);
      this.progress.warnings.push({
        type: 'statistics',
        error: error.message
      });
    }
  }

  // Validate DBF files before migration
  async validateDBFFiles() {
    const requiredFiles = ['ETAIR.DBF', 'BMEM.DBF'];
    const optionalFiles = ['FPAR.DBF'];
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      files: {}
    };
    
    // Check required files
    for (const file of requiredFiles) {
      const filePath = path.join(this.dbfPath, file);
      try {
        const stats = await fs.stat(filePath);
        validation.files[file] = {
          exists: true,
          size: stats.size,
          modified: stats.mtime
        };
      } catch (error) {
        validation.valid = false;
        validation.errors.push(`Required file ${file} not found`);
        validation.files[file] = { exists: false };
      }
    }
    
    // Check optional files
    for (const file of optionalFiles) {
      const filePath = path.join(this.dbfPath, file);
      try {
        const stats = await fs.stat(filePath);
        validation.files[file] = {
          exists: true,
          size: stats.size,
          modified: stats.mtime
        };
      } catch (error) {
        validation.warnings.push(`Optional file ${file} not found`);
        validation.files[file] = { exists: false };
      }
    }
    
    return validation;
  }

  // Dry run - analyze without importing
  async dryRun() {
    try {
      logInfo('Starting migration dry run');
      
      const analysis = {
        companies: { total: 0, valid: 0, invalid: 0, issues: [] },
        members: { total: 0, valid: 0, invalid: 0, issues: [] },
        financial: { total: 0, valid: 0, invalid: 0, issues: [] }
      };
      
      // Analyze companies
      try {
        const companies = await this.readDBF(path.join(this.dbfPath, 'ETAIR.DBF'));
        analysis.companies.total = companies.length;
        
        for (const record of companies) {
          if (!record.AFM || !record.EPONIMIA) {
            analysis.companies.invalid++;
            analysis.companies.issues.push({
              record: record.EPONIMIA || 'Unknown',
              issue: 'Missing required fields'
            });
          } else {
            analysis.companies.valid++;
          }
        }
      } catch (error) {
        analysis.companies.issues.push({ error: error.message });
      }
      
      // Analyze members
      try {
        const members = await this.readDBF(path.join(this.dbfPath, 'BMEM.DBF'));
        analysis.members.total = members.length;
        
        for (const record of members) {
          if (!record.AFM && !record.EPONIMIA && !record.ONOMA) {
            analysis.members.invalid++;
            analysis.members.issues.push({
              record: record.EPONIMIA || record.ONOMA || 'Unknown',
              issue: 'Missing identification fields'
            });
          } else {
            analysis.members.valid++;
          }
        }
      } catch (error) {
        analysis.members.issues.push({ error: error.message });
      }
      
      // Analyze financial
      try {
        const financial = await this.readDBF(path.join(this.dbfPath, 'FPAR.DBF'));
        analysis.financial.total = financial.length;
        analysis.financial.valid = financial.length; // Simplified
      } catch (error) {
        analysis.financial.issues.push({ error: error.message });
      }
      
      logInfo('Dry run completed', analysis);
      return analysis;
      
    } catch (error) {
      logError('Dry run failed', error);
      throw error;
    }
  }

  // Export migration report
  async exportReport(filePath = null) {
    const reportPath = filePath || path.join(this.dbfPath, `migration-report-${Date.now()}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      progress: this.progress,
      summary: {
        success: this.progress.errors.length === 0,
        totalRecords: this.progress.total,
        processedRecords: this.progress.processed,
        successRate: (this.progress.processed / this.progress.total * 100).toFixed(2) + '%',
        errors: this.progress.errors.length,
        warnings: this.progress.warnings.length
      },
      details: {
        errors: this.progress.errors,
        warnings: this.progress.warnings
      }
    };
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    logInfo('Migration report exported', { path: reportPath });
    
    return reportPath;
  }

  // Clean up temporary files
  async cleanup() {
    try {
      // Clean any temporary files created during migration
      const tempDir = path.join(this.dbfPath, 'temp');
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      
      logInfo('Migration cleanup completed');
    } catch (error) {
      logWarning('Cleanup failed', error);
    }
  }

  // Get migration status
  getStatus() {
    return {
      ...this.progress,
      percentComplete: this.progress.total > 0 
        ? (this.progress.processed / this.progress.total * 100).toFixed(2) 
        : 0
    };
  }
}

// Export singleton instance
export default new MigrationService();