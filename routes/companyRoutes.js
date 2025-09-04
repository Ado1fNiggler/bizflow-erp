// routes/companyRoutes.js
// Company management routes

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import Company from '../models/Company.js';
import Document from '../models/Document.js';
import auditService from '../services/auditService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { cache } from '../middleware/cache.js';

const router = express.Router();

// ======================
// Validation Rules
// ======================

const companyValidation = [
  body('name').notEmpty().trim().isLength({ min: 2, max: 255 }),
  body('vatNumber').optional().matches(/^[A-Z]{2}?\d{9}$/),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/),
  body('companyType').optional().isIn(['client', 'supplier', 'both'])
];

// ======================
// Routes
// ======================

// GET /api/companies - Get all companies
router.get('/', authenticate, cache(60), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      status,
      sortBy = 'name',
      sortOrder = 'ASC'
    } = req.query;

    // Build where clause
    const where = {};
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { legalName: { [Op.iLike]: `%${search}%` } },
        { vatNumber: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (type) {
      where.companyType = type;
    }
    
    if (status) {
      where.status = status;
    }

    // Get companies with pagination
    const offset = (page - 1) * limit;
    const { count, rows } = await Company.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      attributes: [
        'id', 'code', 'name', 'legalName', 'vatNumber', 
        'companyType', 'status', 'email', 'phone', 
        'balance', 'creditLimit', 'createdAt'
      ]
    });

    // Calculate statistics
    const stats = await Company.findOne({
      where,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.col('balance')), 'totalBalance'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'active' THEN 1 END")), 'activeCount']
      ]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      },
      stats: {
        total: stats?.dataValues.total || 0,
        active: stats?.dataValues.activeCount || 0,
        totalBalance: parseFloat(stats?.dataValues.totalBalance) || 0
      }
    });

  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/companies/:id - Get single company
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findByPk(id, {
      include: [
        {
          model: Document,
          as: 'documents',
          limit: 10,
          order: [['createdAt', 'DESC']],
          attributes: ['id', 'documentType', 'documentNumber', 'total', 'status', 'documentDate']
        }
      ]
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get financial summary
    const financialSummary = await Document.findOne({
      where: { companyId: id },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalDocuments'],
        [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue'],
        [sequelize.fn('SUM', sequelize.col('balanceDue')), 'totalDue'],
        [sequelize.fn('AVG', sequelize.col('total')), 'averageValue']
      ]
    });

    // Audit log
    await auditService.log({
      action: 'read',
      userId: req.user.id,
      entityType: 'Company',
      entityId: company.id,
      entityName: company.name,
      description: 'Viewed company details'
    });

    res.json({
      success: true,
      data: {
        ...company.toJSON(),
        financialSummary: financialSummary?.dataValues || {}
      }
    });

  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/companies - Create new company
router.post('/', authenticate, authorize(['admin', 'manager']), companyValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check for duplicate VAT number
    if (req.body.vatNumber) {
      const existing = await Company.findOne({
        where: { vatNumber: req.body.vatNumber }
      });
      
      if (existing) {
        return res.status(409).json({
          error: 'Company with this VAT number already exists'
        });
      }
    }

    // Create company
    const company = await Company.create({
      ...req.body,
      createdBy: req.user.id
    });

    // Audit log
    await auditService.log({
      action: 'create',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Company',
      entityId: company.id,
      entityName: company.name,
      description: 'Created new company',
      newValues: company.toJSON()
    });

    res.status(201).json({
      success: true,
      data: company
    });

  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/companies/:id - Update company
router.put('/:id', authenticate, authorize(['admin', 'manager']), companyValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    const company = await Company.findByPk(id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Store old values for audit
    const oldValues = company.toJSON();

    // Check VAT number uniqueness if changed
    if (req.body.vatNumber && req.body.vatNumber !== company.vatNumber) {
      const existing = await Company.findOne({
        where: { 
          vatNumber: req.body.vatNumber,
          id: { [Op.ne]: id }
        }
      });
      
      if (existing) {
        return res.status(409).json({
          error: 'Another company with this VAT number exists'
        });
      }
    }

    // Update company
    await company.update({
      ...req.body,
      updatedBy: req.user.id
    });

    // Audit log with changes
    const changes = auditService.logChanges(oldValues, company.toJSON());
    await auditService.log({
      action: 'update',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Company',
      entityId: company.id,
      entityName: company.name,
      description: 'Updated company',
      ...changes
    });

    res.json({
      success: true,
      data: company
    });

  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/companies/:id - Delete company
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findByPk(id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check for related documents
    const documentCount = await Document.count({
      where: { companyId: id }
    });

    if (documentCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete company with existing documents',
        documentCount
      });
    }

    // Soft delete
    await company.destroy();

    // Audit log
    await auditService.logSecurityEvent('COMPANY_DELETED', 'medium', {
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Company',
      entityId: company.id,
      entityName: company.name,
      oldValues: company.toJSON()
    });

    res.json({
      success: true,
      message: 'Company deleted successfully'
    });

  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/companies/:id/restore - Restore deleted company
router.post('/:id/restore', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findByPk(id, {
      paranoid: false
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (!company.deletedAt) {
      return res.status(400).json({ error: 'Company is not deleted' });
    }

    await company.restore();

    // Audit log
    await auditService.log({
      action: 'restore',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Company',
      entityId: company.id,
      entityName: company.name,
      description: 'Restored deleted company'
    });

    res.json({
      success: true,
      data: company
    });

  } catch (error) {
    console.error('Restore company error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/companies/:id/documents - Get company documents
router.get('/:id/documents', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      type,
      status,
      startDate,
      endDate
    } = req.query;

    // Build where clause
    const where = { companyId: id };
    
    if (type) {
      where.documentType = type;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (startDate || endDate) {
      where.documentDate = {};
      if (startDate) where.documentDate[Op.gte] = startDate;
      if (endDate) where.documentDate[Op.lte] = endDate;
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await Document.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['documentDate', 'DESC']],
      attributes: [
        'id', 'documentType', 'documentNumber', 'documentDate',
        'dueDate', 'total', 'balanceDue', 'status'
      ]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get company documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/companies/:id/balance - Get company balance
router.get('/:id/balance', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const balance = await Document.findOne({
      where: {
        companyId: id,
        status: { [Op.notIn]: ['draft', 'cancelled'] }
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN \"documentType\" IN ('invoice', 'debit_note') THEN total ELSE 0 END")), 'totalDebits'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN \"documentType\" IN ('credit_note', 'payment') THEN total ELSE 0 END")), 'totalCredits'],
        [sequelize.fn('SUM', sequelize.col('balanceDue')), 'totalDue'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN \"balanceDue\" > 0 THEN 1 END")), 'unpaidDocuments']
      ]
    });

    const currentBalance = (balance?.dataValues.totalDebits || 0) - (balance?.dataValues.totalCredits || 0);

    res.json({
      success: true,
      data: {
        currentBalance,
        totalDebits: parseFloat(balance?.dataValues.totalDebits) || 0,
        totalCredits: parseFloat(balance?.dataValues.totalCredits) || 0,
        totalDue: parseFloat(balance?.dataValues.totalDue) || 0,
        unpaidDocuments: parseInt(balance?.dataValues.unpaidDocuments) || 0
      }
    });

  } catch (error) {
    console.error('Get company balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/companies/import - Bulk import companies
router.post('/import', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { companies } = req.body;

    if (!Array.isArray(companies) || companies.length === 0) {
      return res.status(400).json({ error: 'No companies to import' });
    }

    const results = {
      success: [],
      errors: []
    };

    for (const companyData of companies) {
      try {
        // Check for existing company
        const existing = await Company.findOne({
          where: {
            [Op.or]: [
              { vatNumber: companyData.vatNumber },
              { code: companyData.code }
            ]
          }
        });

        if (existing) {
          results.errors.push({
            data: companyData,
            error: 'Company already exists'
          });
          continue;
        }

        const company = await Company.create({
          ...companyData,
          createdBy: req.user.id
        });

        results.success.push(company);

      } catch (error) {
        results.errors.push({
          data: companyData,
          error: error.message
        });
      }
    }

    // Audit log
    await auditService.log({
      action: 'import',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Company',
      description: 'Bulk company import',
      metadata: {
        total: companies.length,
        success: results.success.length,
        errors: results.errors.length
      }
    });

    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Import companies error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;