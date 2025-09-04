// routes/invoiceRoutes.js
// Invoice management routes

import express from 'express';
import { body, validationResult, param, query } from 'express-validator';
import { Op } from 'sequelize';
import { Invoice, InvoiceItem, Company, sequelize } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import auditService from '../services/auditService.js';
import pdfService from '../services/pdfService.js';

const router = express.Router();

// ======================
// Validation Rules
// ======================

const invoiceValidation = [
  body('companyId').isUUID().withMessage('Valid company ID required'),
  body('type').isIn(['invoice', 'credit_note', 'debit_note', 'receipt', 'proforma']),
  body('issueDate').isISO8601().toDate(),
  body('dueDate').optional().isISO8601().toDate(),
  body('vatCategory').isIn(['normal', 'reduced', 'super_reduced', 'exempt', 'reverse']),
  body('currency').isLength({ min: 3, max: 3 }),
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.description').notEmpty().withMessage('Item description required'),
  body('items.*.quantity').isFloat({ min: 0.0001 }).withMessage('Valid quantity required'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Valid unit price required'),
  body('items.*.vatCategory').isIn(['normal', 'reduced', 'super_reduced', 'exempt', 'reverse'])
];

const updateInvoiceValidation = [
  param('id').isUUID().withMessage('Valid invoice ID required'),
  ...invoiceValidation.slice(1) // Skip companyId validation for updates
];

const invoiceQueryValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
  query('type').optional().isIn(['invoice', 'credit_note', 'debit_note', 'receipt', 'proforma']),
  query('companyId').optional().isUUID()
];

// ======================
// Routes
// ======================

// GET /api/invoices - List invoices with filtering and pagination
router.get('/', authenticate, invoiceQueryValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      status,
      type,
      companyId,
      search,
      sortBy = 'issueDate',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (companyId) where.companyId = companyId;
    
    if (search) {
      where[Op.or] = [
        { invoiceNumber: { [Op.iLike]: `%${search}%` } },
        { referenceNumber: { [Op.iLike]: `%${search}%` } },
        { notes: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Fetch invoices
    const { rows: invoices, count: totalCount } = await Invoice.findAndCountAll({
      where,
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'vatNumber', 'email']
        },
        {
          model: InvoiceItem,
          as: 'items',
          attributes: ['id', 'description', 'quantity', 'unitPrice', 'totalAmount']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    // Calculate totals
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invoices/:id - Get single invoice
router.get('/:id', authenticate, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'vatNumber', 'email', 'phone', 'address']
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

    res.json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/invoices - Create new invoice
router.post('/', authenticate, invoiceValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      companyId,
      type = 'invoice',
      series = 'A',
      issueDate,
      dueDate,
      deliveryDate,
      vatCategory = 'normal',
      currency = 'EUR',
      exchangeRate = 1,
      paymentMethod,
      paymentTerms,
      notes,
      internalNotes,
      referenceNumber,
      parentInvoiceId,
      items
    } = req.body;

    // Verify company exists
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(400).json({ error: 'Company not found' });
    }

    // Create invoice
    const invoice = await Invoice.create({
      companyId,
      type,
      series,
      issueDate,
      dueDate,
      deliveryDate,
      vatCategory,
      currency,
      exchangeRate,
      paymentMethod,
      paymentTerms,
      notes,
      internalNotes,
      referenceNumber,
      parentInvoiceId,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    // Create invoice items
    let totalSubtotal = 0;
    let totalVatAmount = 0;
    let totalDiscountAmount = 0;

    for (let i = 0; i < items.length; i++) {
      const itemData = {
        ...items[i],
        invoiceId: invoice.id,
        sortOrder: i + 1
      };

      const invoiceItem = InvoiceItem.build(itemData);
      invoiceItem.calculateAmounts();
      await invoiceItem.save();

      totalSubtotal += parseFloat(invoiceItem.totalPrice);
      totalVatAmount += parseFloat(invoiceItem.vatAmount);
      totalDiscountAmount += parseFloat(invoiceItem.discountAmount);
    }

    // Update invoice totals
    const netAmount = totalSubtotal - totalDiscountAmount;
    const totalAmount = netAmount + totalVatAmount;

    await invoice.update({
      subtotal: totalSubtotal,
      vatAmount: totalVatAmount,
      discountAmount: totalDiscountAmount,
      totalAmount
    });

    // Audit log
    await auditService.log({
      action: 'create',
      status: 'success',
      category: 'invoices',
      entityType: 'Invoice',
      entityId: invoice.id,
      userId: req.user.id,
      userName: req.user.name,
      description: `Created ${type} ${invoice.getDisplayNumber()}`,
      metadata: {
        companyId,
        totalAmount,
        itemCount: items.length
      },
      ipAddress: req.ip
    });

    // Fetch complete invoice with relations
    const completeInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        { model: Company, as: 'company' },
        { model: InvoiceItem, as: 'items', order: [['sortOrder', 'ASC']] }
      ]
    });

    res.status(201).json({
      success: true,
      data: completeInvoice,
      message: 'Invoice created successfully'
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/invoices/:id - Update invoice
router.put('/:id', authenticate, updateInvoiceValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const invoice = await Invoice.findByPk(req.params.id, {
      include: [{ model: InvoiceItem, as: 'items' }]
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check if invoice can be edited
    if (!invoice.canEdit()) {
      return res.status(400).json({
        error: 'Invoice cannot be edited in current status'
      });
    }

    const { items, ...invoiceData } = req.body;

    // Update invoice basic data
    await invoice.update({
      ...invoiceData,
      updatedBy: req.user.id
    });

    // Update items if provided
    if (items) {
      // Delete existing items
      await InvoiceItem.destroy({
        where: { invoiceId: invoice.id }
      });

      // Create new items
      let totalSubtotal = 0;
      let totalVatAmount = 0;
      let totalDiscountAmount = 0;

      for (let i = 0; i < items.length; i++) {
        const itemData = {
          ...items[i],
          invoiceId: invoice.id,
          sortOrder: i + 1
        };

        const invoiceItem = InvoiceItem.build(itemData);
        invoiceItem.calculateAmounts();
        await invoiceItem.save();

        totalSubtotal += parseFloat(invoiceItem.totalPrice);
        totalVatAmount += parseFloat(invoiceItem.vatAmount);
        totalDiscountAmount += parseFloat(invoiceItem.discountAmount);
      }

      // Update invoice totals
      const netAmount = totalSubtotal - totalDiscountAmount;
      const totalAmount = netAmount + totalVatAmount;

      await invoice.update({
        subtotal: totalSubtotal,
        vatAmount: totalVatAmount,
        discountAmount: totalDiscountAmount,
        totalAmount
      });
    }

    // Audit log
    await auditService.log({
      action: 'update',
      status: 'success',
      category: 'invoices',
      entityType: 'Invoice',
      entityId: invoice.id,
      userId: req.user.id,
      userName: req.user.name,
      description: `Updated ${invoice.type} ${invoice.getDisplayNumber()}`,
      ipAddress: req.ip
    });

    // Fetch updated invoice
    const updatedInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        { model: Company, as: 'company' },
        { model: InvoiceItem, as: 'items', order: [['sortOrder', 'ASC']] }
      ]
    });

    res.json({
      success: true,
      data: updatedInvoice,
      message: 'Invoice updated successfully'
    });

  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/invoices/:id - Delete invoice
router.delete('/:id', authenticate, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const invoice = await Invoice.findByPk(req.params.id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check if invoice can be deleted
    if (!invoice.canCancel()) {
      return res.status(400).json({
        error: 'Invoice cannot be deleted in current status'
      });
    }

    // Soft delete
    await invoice.destroy();

    // Audit log
    await auditService.log({
      action: 'delete',
      status: 'success',
      category: 'invoices',
      entityType: 'Invoice',
      entityId: invoice.id,
      userId: req.user.id,
      userName: req.user.name,
      description: `Deleted ${invoice.type} ${invoice.getDisplayNumber()}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });

  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/invoices/:id/send - Send invoice to customer
router.post('/:id/send', authenticate, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const invoice = await Invoice.findByPk(req.params.id, {
      include: [{ model: Company, as: 'company' }]
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status !== 'draft') {
      return res.status(400).json({
        error: 'Only draft invoices can be sent'
      });
    }

    // Update status
    await invoice.update({
      status: 'sent',
      updatedBy: req.user.id
    });

    // TODO: Send email to customer
    // TODO: Generate PDF
    // TODO: Submit to MyData

    // Audit log
    await auditService.log({
      action: 'send',
      status: 'success',
      category: 'invoices',
      entityType: 'Invoice',
      entityId: invoice.id,
      userId: req.user.id,
      userName: req.user.name,
      description: `Sent ${invoice.type} ${invoice.getDisplayNumber()}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Invoice sent successfully'
    });

  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invoices/:id/pdf - Generate and download invoice PDF
router.get('/:id/pdf', authenticate, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'vatNumber', 'email', 'phone', 'address', 'city', 'postalCode']
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

    // Generate PDF
    const pdfBuffer = await pdfService.generateInvoicePDF(invoice);
    
    // Generate filename
    const filename = pdfService.generateInvoiceFilename(invoice);

    // Audit log
    await auditService.log({
      action: 'pdf_generated',
      status: 'success',
      category: 'invoices',
      entityType: 'Invoice',
      entityId: invoice.id,
      userId: req.user.id,
      userName: req.user.name,
      description: `Generated PDF for ${invoice.type} ${invoice.getDisplayNumber()}`,
      ipAddress: req.ip
    });

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Generate invoice PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// GET /api/invoices/stats - Get invoice statistics
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Total invoices by status
    const statusStats = await Invoice.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total']
      ],
      group: ['status'],
      raw: true
    });

    // Monthly revenue
    const monthlyRevenue = await Invoice.findAll({
      attributes: [
        [sequelize.fn('DATE_PART', 'month', sequelize.col('issue_date')), 'month'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'revenue']
      ],
      where: {
        issueDate: {
          [Op.gte]: new Date(currentYear, 0, 1),
          [Op.lt]: new Date(currentYear + 1, 0, 1)
        },
        status: { [Op.ne]: 'cancelled' }
      },
      group: [sequelize.fn('DATE_PART', 'month', sequelize.col('issue_date'))],
      order: [[sequelize.fn('DATE_PART', 'month', sequelize.col('issue_date')), 'ASC']],
      raw: true
    });

    // Overdue invoices
    const overdueCount = await Invoice.count({
      where: {
        dueDate: { [Op.lt]: new Date() },
        status: { [Op.notIn]: ['paid', 'cancelled'] }
      }
    });

    res.json({
      success: true,
      data: {
        statusStats,
        monthlyRevenue,
        overdueCount,
        currentYear,
        currentMonth
      }
    });

  } catch (error) {
    console.error('Invoice stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;