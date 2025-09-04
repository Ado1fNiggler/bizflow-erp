// services/backupService.js
// Backup and restore service για PostgreSQL και file system

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import unzipper from 'unzipper';
import cron from 'node-cron';
// import AWS from 'aws-sdk'; // Optional - only if AWS backup is configured
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sequelize from '../config/database.js';
import { logInfo, logError, logWarning } from '../middleware/logger.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '..', '..', 'backups');
    this.s3 = null;
    this.cronJobs = new Map();
    this.initialize();
  }

  // Αρχικοποίηση
  async initialize() {
    try {
      // Create backup directory if not exists
      await fs.mkdir(this.backupDir, { recursive: true });
      
      // Initialize S3 if configured (optional)
      // Uncomment if you want to use AWS S3 for backups
      /*
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        const AWS = await import('aws-sdk');
        this.s3 = new AWS.default.S3({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION || 'eu-central-1'
        });
        logInfo('S3 backup storage initialized');
      }
      */
      
      // Schedule automatic backups
      this.scheduleBackups();
      
      logInfo('Backup service initialized');
    } catch (error) {
      logError('Failed to initialize backup service', error);
    }
  }

  // Προγραμματισμός αυτόματων backups
  scheduleBackups() {
    // Daily backup at 2 AM
    const dailyBackup = cron.schedule('0 2 * * *', async () => {
      logInfo('Starting scheduled daily backup');
      try {
        const result = await this.createFullBackup('scheduled-daily');
        await this.cleanOldBackups(7); // Keep 7 days
        logInfo('Scheduled daily backup completed', result);
      } catch (error) {
        logError('Scheduled daily backup failed', error);
      }
    });
    
    // Weekly full backup on Sunday at 3 AM
    const weeklyBackup = cron.schedule('0 3 * * 0', async () => {
      logInfo('Starting scheduled weekly backup');
      try {
        const result = await this.createFullBackup('scheduled-weekly');
        await this.uploadToCloud(result.filename);
        await this.cleanOldBackups(30, 'weekly'); // Keep 30 days of weekly
        logInfo('Scheduled weekly backup completed', result);
      } catch (error) {
        logError('Scheduled weekly backup failed', error);
      }
    });
    
    this.cronJobs.set('daily', dailyBackup);
    this.cronJobs.set('weekly', weeklyBackup);
    
    // Start cron jobs
    this.cronJobs.forEach(job => job.start());
  }

  // Δημιουργία πλήρους backup
  async createFullBackup(type = 'manual') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${type}-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);
    
    try {
      // Create backup directory
      await fs.mkdir(backupPath, { recursive: true });
      
      // 1. Backup database
      const dbBackupFile = await this.backupDatabase(backupPath);
      
      // 2. Backup uploads directory
      const uploadsBackupFile = await this.backupUploads(backupPath);
      
      // 3. Backup configuration (without sensitive data)
      const configBackupFile = await this.backupConfig(backupPath);
      
      // 4. Create metadata file
      const metadata = {
        timestamp,
        type,
        version: process.env.APP_VERSION || '1.0.0',
        database: {
          type: 'postgresql',
          file: path.basename(dbBackupFile)
        },
        uploads: {
          file: path.basename(uploadsBackupFile)
        },
        config: {
          file: path.basename(configBackupFile)
        },
        stats: await this.getBackupStats()
      };
      
      await fs.writeFile(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      // 5. Create archive
      const archiveFile = `${backupPath}.zip`;
      await this.createArchive(backupPath, archiveFile);
      
      // 6. Clean up temporary directory
      await this.removeDirectory(backupPath);
      
      // 7. Calculate checksum
      const checksum = await this.calculateChecksum(archiveFile);
      
      const result = {
        filename: path.basename(archiveFile),
        path: archiveFile,
        size: (await fs.stat(archiveFile)).size,
        checksum,
        timestamp,
        type,
        metadata
      };
      
      // Log backup info
      await this.logBackup(result);
      
      return result;
    } catch (error) {
      logError('Full backup failed', error);
      // Clean up on error
      await this.removeDirectory(backupPath).catch(() => {});
      throw error;
    }
  }

  // Backup database (PostgreSQL or SQLite)
  async backupDatabase(backupPath) {
    const outputFile = path.join(backupPath, 'database.sql');
    
    // Check if using SQLite
    if (process.env.USE_SQLITE === 'true') {
      try {
        // For SQLite, just copy the database file
        const sqliteFile = path.join(__dirname, '..', 'database.sqlite');
        const sqliteBackupFile = path.join(backupPath, 'database.sqlite');
        
        // Check if SQLite file exists
        await fs.access(sqliteFile);
        await fs.copyFile(sqliteFile, sqliteBackupFile);
        
        // Also create SQL dump for compatibility
        await fs.writeFile(outputFile, '-- SQLite database backup\n-- Original file: database.sqlite\n');
        
        logInfo('SQLite database backup completed', { file: sqliteBackupFile });
        return sqliteBackupFile;
      } catch (error) {
        logError('SQLite backup failed', error);
        throw error;
      }
    } else {
      // PostgreSQL backup
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      };
      
      // Set PGPASSWORD environment variable
      const env = { ...process.env, PGPASSWORD: dbConfig.password };
      
      const command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -f ${outputFile} --verbose --no-owner --no-acl`;
      
      try {
        const { stdout, stderr } = await execAsync(command, { env });
        if (stderr && !stderr.includes('dump complete')) {
          logWarning('Database backup warnings', { stderr });
        }
        logInfo('PostgreSQL database backup completed', { file: outputFile });
        return outputFile;
      } catch (error) {
        logError('PostgreSQL backup failed', error);
        throw error;
      }
    }
  }

  // Backup uploads directory
  async backupUploads(backupPath) {
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    const outputFile = path.join(backupPath, 'uploads.tar.gz');
    
    try {
      // Check if uploads directory exists
      await fs.access(uploadsDir);
      
      // Create tar.gz archive
      const command = `tar -czf ${outputFile} -C ${path.dirname(uploadsDir)} ${path.basename(uploadsDir)}`;
      await execAsync(command);
      
      logInfo('Uploads backup completed', { file: outputFile });
      return outputFile;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logWarning('Uploads directory not found, skipping');
        // Create empty file
        await fs.writeFile(outputFile, '');
        return outputFile;
      }
      throw error;
    }
  }

  // Backup configuration files
  async backupConfig(backupPath) {
    const outputFile = path.join(backupPath, 'config.json');
    
    const config = {
      app: {
        name: process.env.APP_NAME,
        url: process.env.APP_URL,
        version: process.env.APP_VERSION
      },
      features: {
        emailEnabled: !!process.env.SMTP_HOST,
        s3Enabled: !!process.env.AWS_ACCESS_KEY_ID,
        backupEnabled: true
      },
      // Don't include sensitive data
      timestamp: new Date().toISOString()
    };
    
    await fs.writeFile(outputFile, JSON.stringify(config, null, 2));
    return outputFile;
  }

  // Create zip archive
  async createArchive(sourceDir, outputFile) {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(outputFile);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });
      
      output.on('close', () => {
        logInfo(`Archive created: ${archive.pointer()} bytes`);
        resolve();
      });
      
      archive.on('error', reject);
      
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  // Restore από backup
  async restoreFromBackup(backupFile, options = {}) {
    const tempDir = path.join(this.backupDir, 'temp-restore-' + Date.now());
    
    try {
      // 1. Extract archive
      await fs.mkdir(tempDir, { recursive: true });
      await this.extractArchive(backupFile, tempDir);
      
      // 2. Read metadata
      const metadataPath = path.join(tempDir, 'metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      
      // 3. Restore database
      if (options.database !== false) {
        const dbFile = path.join(tempDir, metadata.database.file);
        await this.restoreDatabase(dbFile);
      }
      
      // 4. Restore uploads
      if (options.uploads !== false) {
        const uploadsFile = path.join(tempDir, metadata.uploads.file);
        await this.restoreUploads(uploadsFile);
      }
      
      // 5. Clean up
      await this.removeDirectory(tempDir);
      
      logInfo('Restore completed successfully', { backup: backupFile });
      
      return {
        success: true,
        metadata,
        restoredComponents: {
          database: options.database !== false,
          uploads: options.uploads !== false
        }
      };
    } catch (error) {
      logError('Restore failed', error);
      await this.removeDirectory(tempDir).catch(() => {});
      throw error;
    }
  }

  // Extract zip archive
  async extractArchive(archiveFile, outputDir) {
    return new Promise((resolve, reject) => {
      require('fs').createReadStream(archiveFile)
        .pipe(unzipper.Extract({ path: outputDir }))
        .on('close', resolve)
        .on('error', reject);
    });
  }

  // Restore PostgreSQL database
  async restoreDatabase(sqlFile) {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    };
    
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    
    try {
      // Drop existing connections
      await sequelize.query(`
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = '${dbConfig.database}' 
        AND pid <> pg_backend_pid()
      `);
      
      // Restore database
      const command = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -f ${sqlFile}`;
      
      const { stdout, stderr } = await execAsync(command, { env });
      
      if (stderr && !stderr.includes('ERROR')) {
        logWarning('Database restore warnings', { stderr });
      }
      
      logInfo('Database restored successfully');
    } catch (error) {
      logError('Database restore failed', error);
      throw error;
    }
  }

  // Restore uploads
  async restoreUploads(tarFile) {
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    
    try {
      // Backup existing uploads
      const backupName = `uploads-backup-${Date.now()}`;
      await execAsync(`mv ${uploadsDir} ${uploadsDir}-${backupName}`).catch(() => {});
      
      // Extract new uploads
      const command = `tar -xzf ${tarFile} -C ${path.dirname(uploadsDir)}`;
      await execAsync(command);
      
      logInfo('Uploads restored successfully');
    } catch (error) {
      logError('Uploads restore failed', error);
      throw error;
    }
  }

  // Upload backup to cloud (S3)
  async uploadToCloud(filename) {
    if (!this.s3) {
      logWarning('S3 not configured, skipping cloud upload');
      return null;
    }
    
    const filePath = path.join(this.backupDir, filename);
    const fileContent = await fs.readFile(filePath);
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET || 'erp-backups',
      Key: `backups/${filename}`,
      Body: fileContent,
      ServerSideEncryption: 'AES256'
    };
    
    try {
      const result = await this.s3.upload(params).promise();
      logInfo('Backup uploaded to S3', { location: result.Location });
      return result.Location;
    } catch (error) {
      logError('S3 upload failed', error);
      throw error;
    }
  }

  // Download backup from cloud
  async downloadFromCloud(filename, destination) {
    if (!this.s3) {
      throw new Error('S3 not configured');
    }
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET || 'erp-backups',
      Key: `backups/${filename}`
    };
    
    try {
      const data = await this.s3.getObject(params).promise();
      const outputPath = destination || path.join(this.backupDir, filename);
      await fs.writeFile(outputPath, data.Body);
      
      logInfo('Backup downloaded from S3', { file: outputPath });
      return outputPath;
    } catch (error) {
      logError('S3 download failed', error);
      throw error;
    }
  }

  // Clean old backups
  async cleanOldBackups(daysToKeep = 7, type = null) {
    try {
      const files = await fs.readdir(this.backupDir);
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
      
      for (const file of files) {
        if (!file.startsWith('backup-')) continue;
        if (type && !file.includes(type)) continue;
        
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath);
          logInfo('Old backup deleted', { file });
        }
      }
    } catch (error) {
      logError('Failed to clean old backups', error);
    }
  }

  // Get backup statistics
  async getBackupStats() {
    try {
      const stats = await sequelize.query(`
        SELECT 
          (SELECT COUNT(*) FROM users) as users,
          (SELECT COUNT(*) FROM companies) as companies,
          (SELECT COUNT(*) FROM members) as members,
          (SELECT COUNT(*) FROM documents) as documents
      `, { type: sequelize.QueryTypes.SELECT });
      
      return stats[0];
    } catch (error) {
      logWarning('Could not get database stats', error);
      return {
        users: 0,
        companies: 0,
        members: 0,
        documents: 0
      };
    }
  }

  // Calculate file checksum
  async calculateChecksum(filePath) {
    const crypto = require('crypto');
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  // Log backup information
  async logBackup(backupInfo) {
    const logFile = path.join(this.backupDir, 'backup.log');
    const logEntry = `${new Date().toISOString()} - ${JSON.stringify(backupInfo)}\n`;
    await fs.appendFile(logFile, logEntry);
  }

  // Remove directory recursively
  async removeDirectory(dir) {
    await fs.rm(dir, { recursive: true, force: true });
  }

  // List available backups
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];
      
      for (const file of files) {
        if (!file.startsWith('backup-') || !file.endsWith('.zip')) continue;
        
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        
        backups.push({
          filename: file,
          size: stats.size,
          created: stats.mtime,
          type: file.includes('scheduled') ? 'automatic' : 'manual'
        });
      }
      
      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      logError('Failed to list backups', error);
      return [];
    }
  }

  // Stop scheduled backups
  stopScheduledBackups() {
    this.cronJobs.forEach(job => job.stop());
    logInfo('Scheduled backups stopped');
  }
}

// Export singleton instance
const backupService = new BackupService();
export default backupService;