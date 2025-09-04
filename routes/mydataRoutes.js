// routes/mydataRoutes.js
// MyDATA integration routes for AADE compliance

import express from 'express';
import { body, validationResult, param, query } from 'express-validator';
import { Invoice, InvoiceItem, Company } from '../models/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import mydataService from '../services/mydataService.js';
import auditService from '../services/auditService.js';

const router = express.Router();

// ======================
// Validation Rules
// ======================

const dateRangeValidation = [
  query('dateFrom').isISO8601().toDate(),
  query('dateTo').isISO8601().toDate().custom((dateTo, { req }) => {
    if (new Date(dateTo) <= new Date(req.query.dateFrom)) {
      throw new Error('dateTo must be after dateFrom');
    }
    return true;
  })
];

// ======================
// Routes
// ======================

// POST /api/mydata/submit/:id - Submit single invoice to MyDATA
router.post('/submit/:id', authenticate, requireRole(['admin', 'manager', 'accountant']), 
  param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Find invoice with all necessary data
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'vatNumber', 'country', 'address', 'city', 'postalCode']
        },
        {
          model: InvoiceItem,
          as: 'items',
          order: [['sortOrder', 'ASC']]
        }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check if invoice is in valid status for submission
    if (invoice.status === 'draft') {
      return res.status(400).json({
        error: 'Cannot submit draft invoice. Please finalize the invoice first.'
      });
    }

    if (invoice.mydataStatus === 'submitted' || invoice.mydataStatus === 'accepted') {
      return res.status(400).json({
        error: 'Invoice already submitted to MyDATA',
        mydataId: invoice.mydataId,
        status: invoice.mydataStatus
      });
    }

    // Submit to MyDATA
    const result = await mydataService.submitInvoice(invoice);

    // Audit log
    await auditService.log({
      action: 'mydata_submit',
      status: result.success ? 'success' : 'failure',
      category: 'mydata',
      entityType: 'Invoice',
      entityId: invoice.id,
      userId: req.user.id,
      userName: req.user.name,
      description: `MyDATA submission for invoice ${invoice.getDisplayNumber()}`,
      metadata: {
        mydataId: result.mydataId,
        errors: result.errors
      },
      ipAddress: req.ip
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Invoice submitted to MyDATA successfully',
        mydataId: result.mydataId,
        status: result.status
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'MyDATA submission failed',
        errors: result.errors,
        response: result.response
      });
    }

  } catch (error) {
    console.error('MyDATA submission error:', error);
    
    // Security audit for failed submissions
    await auditService.logSecurityEvent('MYDATA_SUBMISSION_ERROR', 'medium', {
      userId: req.user?.id,
      invoiceId: req.params.id,
      error: error.message,
      ipAddress: req.ip
    });

    res.status(500).json({ 
      error: 'MyDATA submission failed',
      message: error.message 
    });
  }
});

// POST /api/mydata/bulk-submit - Submit multiple invoices to MyDATA
router.post('/bulk-submit', authenticate, requireRole(['admin', 'manager']), 
  body('invoiceIds').isArray({ min: 1 }).withMessage('At least one invoice ID required'),
  body('invoiceIds.*').isUUID().withMessage('Valid invoice IDs required'),
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { invoiceIds } = req.body;

    // Find all invoices with necessary data
    const invoices = await Invoice.findAll({
      where: {
        id: invoiceIds,
        status: ['sent', 'paid'], // Only allow finalized invoices
        mydataStatus: ['pending', 'rejected'] // Only pending or previously rejected
      },
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'vatNumber', 'country', 'address', 'city', 'postalCode']
        },
        {
          model: InvoiceItem,
          as: 'items',
          order: [['sortOrder', 'ASC']]
        }
      ]
    });

    if (invoices.length === 0) {
      return res.status(400).json({
        error: 'No eligible invoices found for MyDATA submission'
      });
    }

    // Bulk submit to MyDATA
    const results = await mydataService.bulkSubmitInvoices(invoices);

    // Audit log
    await auditService.log({
      action: 'mydata_bulk_submit',
      status: 'success',
      category: 'mydata',
      userId: req.user.id,
      userName: req.user.name,
      description: `Bulk MyDATA submission: ${results.submitted} successful, ${results.failed} failed`,
      metadata: {
        totalInvoices: invoices.length,
        submitted: results.submitted,
        failed: results.failed,
        results: results.results
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Bulk MyDATA submission completed',
      summary: {
        total: invoices.length,
        submitted: results.submitted,
        failed: results.failed
      },
      results: results.results
    });

  } catch (error) {
    console.error('MyDATA bulk submission error:', error);
    res.status(500).json({ 
      error: 'Bulk MyDATA submission failed',
      message: error.message 
    });
  }
});

// DELETE /api/mydata/cancel/:id - Cancel invoice in MyDATA
router.delete('/cancel/:id', authenticate, requireRole(['admin', 'manager']),
  param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const invoice = await Invoice.findByPk(req.params.id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.mydataId || invoice.mydataStatus !== 'submitted') {
      return res.status(400).json({
        error: 'Invoice not submitted to MyDATA or already processed'
      });
    }

    // Cancel in MyDATA
    const result = await mydataService.cancelInvoice(invoice);

    // Audit log
    await auditService.log({
      action: 'mydata_cancel',
      status: 'success',
      category: 'mydata',
      entityType: 'Invoice',
      entityId: invoice.id,
      userId: req.user.id,
      userName: req.user.name,
      description: `Cancelled invoice ${invoice.getDisplayNumber()} in MyDATA`,
      metadata: {
        mydataId: invoice.mydataId
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('MyDATA cancellation error:', error);
    res.status(500).json({ 
      error: 'MyDATA cancellation failed',
      message: error.message 
    });
  }
});

// GET /api/mydata/status/:id - Get MyDATA status for invoice
router.get('/status/:id', authenticate, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const invoice = await Invoice.findByPk(req.params.id, {
      attributes: ['id', 'invoiceNumber', 'mydataId', 'mydataStatus', 'mydataSubmittedAt']
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.mydataId) {
      return res.json({
        invoiceNumber: invoice.invoiceNumber,
        mydataStatus: 'not_submitted',
        message: 'Invoice not submitted to MyDATA'
      });
    }

    // Get current status from MyDATA
    const status = await mydataService.getInvoiceStatus(invoice.mydataId);

    // Update local status if different
    if (status.status !== invoice.mydataStatus) {
      await invoice.update({
        mydataStatus: status.status === 'accepted' ? 'accepted' : invoice.mydataStatus
      });
    }

    res.json({
      invoiceNumber: invoice.invoiceNumber,
      mydataId: invoice.mydataId,
      mydataStatus: status.status,
      submittedAt: invoice.mydataSubmittedAt,
      details: status.details
    });

  } catch (error) {
    console.error('MyDATA status check error:', error);
    res.status(500).json({ 
      error: 'Failed to check MyDATA status',
      message: error.message 
    });
  }
});

// GET /api/mydata/logs - Get MyDATA transmission logs
router.get('/logs', authenticate, requireRole(['admin', 'manager', 'accountant']),
  dateRangeValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { dateFrom, dateTo } = req.query;

    // Get transmission logs from MyDATA
    const logs = await mydataService.getTransmissionLogs(dateFrom, dateTo);

    // Also get local invoice data for correlation
    const localInvoices = await Invoice.findAll({
      where: {
        mydataSubmittedAt: {
          $gte: dateFrom,
          $lte: dateTo
        }
      },
      attributes: ['id', 'invoiceNumber', 'mydataId', 'mydataStatus', 'mydataSubmittedAt'],
      order: [['mydataSubmittedAt', 'DESC']]
    });

    res.json({
      success: true,
      period: {
        from: dateFrom,
        to: dateTo
      },
      mydataLogs: logs,
      localInvoices: localInvoices
    });

  } catch (error) {
    console.error('MyDATA logs error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve MyDATA logs',
      message: error.message 
    });
  }
});

// GET /api/mydata/test - Test MyDATA connection
router.get('/test', authenticate, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const result = await mydataService.testConnection();

    // Audit log
    await auditService.log({
      action: 'mydata_test',
      status: result.success ? 'success' : 'failure',
      category: 'mydata',
      userId: req.user.id,
      userName: req.user.name,
      description: 'MyDATA connection test',
      metadata: {
        environment: result.environment,
        success: result.success,
        error: result.error
      },
      ipAddress: req.ip
    });

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        environment: result.environment,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'MyDATA connection failed',
        environment: result.environment,
        error: result.error
      });
    }

  } catch (error) {
    console.error('MyDATA connection test error:', error);
    res.status(500).json({ 
      error: 'MyDATA connection test failed',
      message: error.message 
    });
  }
});

// GET /api/mydata/pending - Get invoices pending MyDATA submission
router.get('/pending', authenticate, requireRole(['admin', 'manager', 'accountant']), async (req, res) => {
  try {
    const pendingInvoices = await Invoice.findAll({
      where: {
        status: ['sent', 'paid'],
        mydataStatus: ['pending', 'rejected']
      },
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'vatNumber']
        }
      ],
      order: [['issueDate', 'DESC']],
      limit: 100
    });

    const summary = {
      total: pendingInvoices.length,
      pending: pendingInvoices.filter(inv => inv.mydataStatus === 'pending').length,
      rejected: pendingInvoices.filter(inv => inv.mydataStatus === 'rejected').length
    };

    res.json({
      success: true,
      summary,
      invoices: pendingInvoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate,
        totalAmount: inv.totalAmount,
        status: inv.status,
        mydataStatus: inv.mydataStatus,
        company: {
          id: inv.company.id,
          name: inv.company.name,
          vatNumber: inv.company.vatNumber
        }
      }))
    });

  } catch (error) {
    console.error('Get pending MyDATA invoices error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve pending invoices',
      message: error.message 
    });
  }
});

// GET /api/mydata/stats - MyDATA statistics
router.get('/stats', authenticate, requireRole(['admin', 'manager', 'accountant']), async (req, res) => {
  try {
    const stats = await Invoice.findAll({
      attributes: [
        'mydataStatus',
        [Invoice.sequelize.fn('COUNT', Invoice.sequelize.col('id')), 'count'],
        [Invoice.sequelize.fn('SUM', Invoice.sequelize.col('total_amount')), 'total']
      ],
      where: {
        mydataStatus: ['pending', 'submitted', 'accepted', 'rejected']
      },
      group: ['mydataStatus'],
      raw: true
    });

    const formattedStats = {
      pending: { count: 0, total: 0 },
      submitted: { count: 0, total: 0 },
      accepted: { count: 0, total: 0 },
      rejected: { count: 0, total: 0 }
    };

    stats.forEach(stat => {
      if (formattedStats[stat.mydataStatus]) {
        formattedStats[stat.mydataStatus] = {
          count: parseInt(stat.count),
          total: parseFloat(stat.total || 0)
        };
      }
    });

    res.json({
      success: true,
      stats: formattedStats,
      lastUpdate: new Date().toISOString()
    });

  } catch (error) {
    console.error('MyDATA stats error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve MyDATA statistics',
      message: error.message 
    });
  }
});

export default router;