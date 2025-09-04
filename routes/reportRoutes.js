// routes/reportRoutes.js
// Report generation and analytics routes

import express from 'express';
import { query, validationResult } from 'express-validator';
import reportService from '../services/reportService.js';
import auditService from '../services/auditService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { cache } from '../middleware/cache.js';

const router = express.Router();

// ======================
// Validation Rules
// ======================

const dateRangeValidation = [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
];

const taxReportValidation = [
  query('year').optional().isInt({ min: 2000, max: 2100 }),
  query('quarter').optional().isInt({ min: 1, max: 4 }),
  query('month').optional().isInt({ min: 1, max: 12 })
];

// ======================
// Financial Reports
// ======================

// GET /api/reports/financial - Generate financial report
router.get('/financial', authenticate, authorize(['admin', 'manager', 'accountant']), dateRangeValidation, cache(300), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      startDate,
      endDate,
      companyId,
      reportType = 'summary'
    } = req.query;

    const report = await reportService.generateFinancialReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      companyId,
      reportType
    });

    // Audit log
    await auditService.log({
      action: 'read',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Report',
      category: 'reports',
      description: 'Generated financial report',
      metadata: {
        reportType: 'financial',
        dateRange: { startDate, endDate },
        companyId
      }
    });

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Generate financial report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/financial/export - Export financial report
router.get('/financial/export', authenticate, authorize(['admin', 'manager', 'accountant']), dateRangeValidation, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      companyId,
      format = 'excel'
    } = req.query;

    const report = await reportService.generateFinancialReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      companyId,
      reportType: 'detailed'
    });

    let buffer;
    let contentType;
    let filename;

    if (format === 'pdf') {
      // TODO: Generate PDF report
      contentType = 'application/pdf';
      filename = `financial-report-${Date.now()}.pdf`;
    } else {
      buffer = await reportService.exportToExcel(report, 'financial-report.xlsx');
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `financial-report-${Date.now()}.xlsx`;
    }

    // Audit log
    await auditService.log({
      action: 'export',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Report',
      category: 'reports',
      description: 'Exported financial report',
      metadata: {
        reportType: 'financial',
        format,
        dateRange: { startDate, endDate }
      }
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Export financial report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ======================
// Customer Reports
// ======================

// GET /api/reports/customers - Generate customer report
router.get('/customers', authenticate, authorize(['admin', 'manager', 'accountant']), dateRangeValidation, cache(300), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      topN = 10
    } = req.query;

    const report = await reportService.generateCustomerReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      topN: parseInt(topN)
    });

    // Audit log
    await auditService.log({
      action: 'read',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Report',
      category: 'reports',
      description: 'Generated customer report',
      metadata: {
        reportType: 'customer',
        dateRange: { startDate, endDate },
        topN
      }
    });

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Generate customer report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/aging - Generate aging analysis report
router.get('/aging', authenticate, authorize(['admin', 'manager', 'accountant']), cache(300), async (req, res) => {
  try {
    const agingReport = await reportService.generateAgingAnalysis();

    // Audit log
    await auditService.log({
      action: 'read',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Report',
      category: 'reports',
      description: 'Generated aging analysis report',
      metadata: {
        reportType: 'aging'
      }
    });

    res.json({
      success: true,
      data: agingReport
    });

  } catch (error) {
    console.error('Generate aging report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ======================
// Tax Reports
// ======================

// GET /api/reports/tax - Generate tax report
router.get('/tax', authenticate, authorize(['admin', 'accountant']), taxReportValidation, cache(300), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      year = new Date().getFullYear(),
      quarter,
      month
    } = req.query;

    const report = await reportService.generateTaxReport({
      year: parseInt(year),
      quarter: quarter ? parseInt(quarter) : null,
      month: month ? parseInt(month) : null
    });

    // Audit log
    await auditService.log({
      action: 'read',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Report',
      category: 'reports',
      description: 'Generated tax report',
      metadata: {
        reportType: 'tax',
        year,
        quarter,
        month
      }
    });

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Generate tax report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/vat - Generate VAT report
router.get('/vat', authenticate, authorize(['admin', 'accountant']), dateRangeValidation, cache(300), async (req, res) => {
  try {
    const {
      startDate,
      endDate
    } = req.query;

    const whereClause = {
      documentDate: {
        [Op.between]: [
          startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          endDate ? new Date(endDate) : new Date()
        ]
      },
      status: {
        [Op.notIn]: ['draft', 'cancelled']
      }
    };

    const vatReport = await reportService.calculateVATAnalysis(whereClause);

    // Audit log
    await auditService.log({
      action: 'read',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Report',
      category: 'reports',
      description: 'Generated VAT report',
      metadata: {
        reportType: 'vat',
        dateRange: { startDate, endDate }
      }
    });

    res.json({
      success: true,
      data: vatReport
    });

  } catch (error) {
    console.error('Generate VAT report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ======================
// Member Reports
// ======================

// GET /api/reports/members - Generate member report
router.get('/members', authenticate, authorize(['admin', 'manager']), cache(300), async (req, res) => {
  try {
    const { includeInactive = false } = req.query;

    const report = await reportService.generateMemberReport({
      includeInactive: includeInactive === 'true'
    });

    // Audit log
    await auditService.log({
      action: 'read',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Report',
      category: 'reports',
      description: 'Generated member report',
      metadata: {
        reportType: 'member',
        includeInactive
      }
    });

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Generate member report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ======================
// Dashboard & Analytics
// ======================

// GET /api/reports/dashboard - Get dashboard statistics
router.get('/dashboard', authenticate, cache(60), async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let startDate, endDate;
    const now = new Date();

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
    }

    // Get various statistics
    const [financial, customers, members] = await Promise.all([
      reportService.generateFinancialReport({
        startDate,
        endDate,
        reportType: 'summary'
      }),
      reportService.generateCustomerReport({
        startDate,
        endDate,
        topN: 5
      }),
      reportService.generateMemberReport({
        includeInactive: false
      })
    ]);

    const dashboard = {
      period,
      dateRange: {
        startDate,
        endDate
      },
      financial: financial.summary,
      topCustomers: customers.topCustomers,
      memberStats: members.statistics,
      expiringMembers: members.expiringMembers.slice(0, 5)
    };

    res.json({
      success: true,
      data: dashboard
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/revenue-trend - Get revenue trend data
router.get('/revenue-trend', authenticate, cache(300), async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    const trendData = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const report = await reportService.generateFinancialReport({
        startDate,
        endDate,
        reportType: 'summary'
      });

      trendData.push({
        month: startDate.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' }),
        revenue: report.summary.totalRevenue,
        expenses: report.summary.totalExpenses,
        profit: report.summary.netProfit
      });
    }

    res.json({
      success: true,
      data: trendData
    });

  } catch (error) {
    console.error('Get revenue trend error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ======================
// Custom Reports
// ======================

// POST /api/reports/custom - Generate custom report
router.post('/custom', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const {
      reportName,
      entityType,
      filters,
      groupBy,
      aggregations,
      sortBy,
      sortOrder,
      limit
    } = req.body;

    // TODO: Implement custom report builder
    // This would allow users to create dynamic reports with custom filters and aggregations

    // Audit log
    await auditService.log({
      action: 'create',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Report',
      category: 'reports',
      description: 'Generated custom report',
      metadata: {
        reportName,
        entityType,
        filters,
        groupBy,
        aggregations
      }
    });

    res.json({
      success: true,
      message: 'Custom report generation will be implemented in future version'
    });

  } catch (error) {
    console.error('Generate custom report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ======================
// Scheduled Reports
// ======================

// GET /api/reports/scheduled - Get scheduled reports
router.get('/scheduled', authenticate, authorize(['admin']), async (req, res) => {
  try {
    // TODO: Implement scheduled reports listing
    
    res.json({
      success: true,
      data: [],
      message: 'Scheduled reports feature coming soon'
    });

  } catch (error) {
    console.error('Get scheduled reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/reports/schedule - Schedule a report
router.post('/schedule', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const {
      reportType,
      schedule, // daily, weekly, monthly
      recipients,
      parameters
    } = req.body;

    // TODO: Implement report scheduling with cron jobs

    // Audit log
    await auditService.log({
      action: 'create',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'ScheduledReport',
      category: 'reports',
      description: 'Scheduled new report',
      metadata: {
        reportType,
        schedule,
        recipients,
        parameters
      }
    });

    res.json({
      success: true,
      message: 'Report scheduled successfully'
    });

  } catch (error) {
    console.error('Schedule report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;