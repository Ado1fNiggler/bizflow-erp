// routes/documentRoutes.js
// Document (invoices, receipts, etc.) management routes

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import Document from '../models/Document.js';
import DocumentItem from '../models/DocumentItem.js';
import Company from '../models/Company.js';
import auditService from '../services/auditService.js';
import pdfService from '../services/pdfService.js';
import emailService from '../services/emailService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { cache } from '../middleware/cache.js';

const router = express.Router();

// ======================
// Validation Rules
// ======================

const documentValidation = [
  body('documentType').isIn(['invoice', 'receipt', 'credit_note', 'debit_note', 'quote', 'order', 'delivery_note', 'proforma']),
  body('companyId').isUUID(),
  body('documentDate').isISO8601(),
  body('items').isArray().notEmpty(),
  body('items.*.description').notEmpty(),
  body('items.*.quantity').isFloat({ min: 0 }),
  body('items.*.unitPrice').isFloat({ min: 0 })
];

const documentItemValidation = [
  body('description').notEmpty(),
  body('quantity').isFloat({ min: 0 }),
  body('unitPrice').isFloat({ min: 0 }),
  body('vatRate').isFloat({ min: 0, max: 100 })
];

// ======================
// Routes
// ======================

// GET /api/documents - Get all documents
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      status,
      companyId,
      startDate,
      endDate,
      sortBy = 'documentDate',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const where = {};
    
    if (search) {
      where[Op.or] = [
        { documentNumber: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { '$company.name$': { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (type) {
      where.documentType = type;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (companyId) {
      where.companyId = companyId;
    }
    
    if (startDate || endDate) {
      where.documentDate = {};
      if (startDate) where.documentDate[Op.gte] = startDate;
      if (endDate) where.documentDate[Op.lte] = endDate;
    }

    // Get documents with pagination
    const offset = (page - 1) * limit;
    const { count, rows } = await Document.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      include: [{
        model: Company,
        as: 'company',
        attributes: ['id', 'name', 'vatNumber']
      }],
      attributes: [
        'id', 'documentType', 'documentNumber', 'documentDate',
        'dueDate', 'companyId', 'total', 'balanceDue', 'status',
        'mydataStatus', 'createdAt'
      ]
    });

    // Calculate summary statistics
    const stats = await Document.findOne({
      where,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
        [sequelize.fn('SUM', sequelize.col('total')), 'totalAmount'],
        [sequelize.fn('SUM', sequelize.col('balanceDue')), 'totalDue'],
        [sequelize.fn('SUM', sequelize.col('vatAmount')), 'totalVat']
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
      summary: {
        count: parseInt(stats?.dataValues.totalCount) || 0,
        totalAmount: parseFloat(stats?.dataValues.totalAmount) || 0,
        totalDue: parseFloat(stats?.dataValues.totalDue) || 0,
        totalVat: parseFloat(stats?.dataValues.totalVat) || 0
      }
    });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/documents/:id - Get single document
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id, {
      include: [
        {
          model: Company,
          as: 'company'
        },
        {
          model: DocumentItem,
          as: 'items',
          order: [['sortOrder', 'ASC'], ['lineNumber', 'ASC']]
        }
      ]
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Audit log
    await auditService.log({
      action: 'read',
      userId: req.user.id,
      entityType: 'Document',
      entityId: document.id,
      entityName: document.documentNumber,
      description: 'Viewed document details'
    });

    res.json({
      success: true,
      data: document
    });

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/documents - Create new document
router.post('/', authenticate, authorize(['admin', 'manager', 'accountant']), documentValidation, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, ...documentData } = req.body;

    // Create document
    const document = await Document.create({
      ...documentData,
      createdBy: req.user.id,
      status: documentData.status || 'draft'
    }, { transaction: t });

    // Create document items
    if (items && items.length > 0) {
      const documentItems = items.map((item, index) => ({
        ...item,
        documentId: document.id,
        lineNumber: index + 1,
        sortOrder: item.sortOrder || index
      }));

      await DocumentItem.bulkCreate(documentItems, { transaction: t });
    }

    // Recalculate totals
    await document.calculateTotals();
    await document.save({ transaction: t });

    await t.commit();

    // Reload with associations
    const fullDocument = await Document.findByPk(document.id, {
      include: [
        { model: Company, as: 'company' },
        { model: DocumentItem, as: 'items' }
      ]
    });

    // Audit log
    await auditService.log({
      action: 'create',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Document',
      entityId: document.id,
      entityName: document.documentNumber,
      description: `Created new ${document.documentType}`,
      newValues: fullDocument.toJSON()
    });

    res.status(201).json({
      success: true,
      data: fullDocument
    });

  } catch (error) {
    await t.rollback();
    console.error('Create document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/documents/:id - Update document
router.put('/:id', authenticate, authorize(['admin', 'manager', 'accountant']), async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { items, ...documentData } = req.body;

    const document = await Document.findByPk(id, {
      include: [{ model: DocumentItem, as: 'items' }]
    });

    if (!document) {
      await t.rollback();
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if document can be edited
    if (!document.canBeEdited()) {
      await t.rollback();
      return res.status(400).json({ 
        error: 'Document cannot be edited',
        reason: document.mydataMark ? 'Submitted to myDATA' : 'Document is locked or finalized'
      });
    }

    // Store old values for audit
    const oldValues = document.toJSON();

    // Update document
    await document.update({
      ...documentData,
      updatedBy: req.user.id
    }, { transaction: t });

    // Update items if provided
    if (items) {
      // Delete existing items
      await DocumentItem.destroy({
        where: { documentId: id },
        transaction: t
      });

      // Create new items
      const documentItems = items.map((item, index) => ({
        ...item,
        documentId: id,
        lineNumber: index + 1,
        sortOrder: item.sortOrder || index
      }));

      await DocumentItem.bulkCreate(documentItems, { transaction: t });
    }

    // Recalculate totals
    await document.calculateTotals();
    await document.save({ transaction: t });

    await t.commit();

    // Reload with associations
    const fullDocument = await Document.findByPk(id, {
      include: [
        { model: Company, as: 'company' },
        { model: DocumentItem, as: 'items' }
      ]
    });

    // Audit log with changes
    const changes = auditService.logChanges(oldValues, fullDocument.toJSON());
    await auditService.log({
      action: 'update',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Document',
      entityId: document.id,
      entityName: document.documentNumber,
      description: `Updated ${document.documentType}`,
      ...changes
    });

    res.json({
      success: true,
      data: fullDocument
    });

  } catch (error) {
    await t.rollback();
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/documents/:id - Delete/Cancel document
router.delete('/:id', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if document can be cancelled
    if (!document.canBeCancelled()) {
      return res.status(400).json({ 
        error: 'Document cannot be cancelled',
        reason: 'Document is already cancelled or submitted to myDATA'
      });
    }

    // Cancel instead of delete for finalized documents
    if (['paid', 'sent', 'partial'].includes(document.status)) {
      await document.update({
        status: 'cancelled',
        updatedBy: req.user.id
      });

      // Audit log
      await auditService.log({
        action: 'cancel',
        userId: req.user.id,
        userName: req.user.name,
        entityType: 'Document',
        entityId: document.id,
        entityName: document.documentNumber,
        description: `Cancelled ${document.documentType}`
      });

      return res.json({
        success: true,
        message: 'Document cancelled successfully'
      });
    }

    // Soft delete for draft documents
    await document.destroy();

    // Audit log
    await auditService.logSecurityEvent('DOCUMENT_DELETED', 'medium', {
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Document',
      entityId: document.id,
      entityName: document.documentNumber,
      documentType: document.documentType,
      oldValues: document.toJSON()
    });

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/documents/:id/finalize - Finalize document
router.post('/:id/finalize', authenticate, authorize(['admin', 'manager', 'accountant']), async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id, {
      include: [
        { model: Company, as: 'company' },
        { model: DocumentItem, as: 'items' }
      ]
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft documents can be finalized' });
    }

    // Update status
    await document.update({
      status: 'pending',
      updatedBy: req.user.id
    });

    // Generate PDF
    const pdf = await pdfService.generateDocumentPDF(document);
    
    // Save PDF URL (assume upload to storage)
    await document.update({
      pdfUrl: `/documents/${document.id}/pdf`
    });

    // Audit log
    await auditService.log({
      action: 'approve',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Document',
      entityId: document.id,
      entityName: document.documentNumber,
      description: `Finalized ${document.documentType}`
    });

    res.json({
      success: true,
      data: document,
      message: 'Document finalized successfully'
    });

  } catch (error) {
    console.error('Finalize document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/documents/:id/send - Send document via email
router.post('/:id/send', authenticate, authorize(['admin', 'manager', 'accountant']), async (req, res) => {
  try {
    const { id } = req.params;
    const { email, cc, message } = req.body;

    const document = await Document.findByPk(id, {
      include: [
        { model: Company, as: 'company' },
        { model: DocumentItem, as: 'items' }
      ]
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.status === 'draft') {
      return res.status(400).json({ error: 'Cannot send draft documents' });
    }

    // Generate PDF if not exists
    let pdfBuffer;
    if (document.pdfUrl) {
      // TODO: Fetch from storage
      pdfBuffer = await pdfService.generateDocumentPDF(document);
    } else {
      pdfBuffer = await pdfService.generateDocumentPDF(document);
    }

    // Send email
    await emailService.sendDocumentEmail({
      to: email || document.company.email,
      cc,
      document,
      message,
      attachment: {
        filename: `${document.documentType}-${document.documentNumber}.pdf`,
        content: pdfBuffer
      }
    });

    // Update document
    await document.update({
      status: 'sent',
      sentAt: new Date(),
      emailedTo: email || document.company.email
    });

    // Audit log
    await auditService.log({
      action: 'email',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Document',
      entityId: document.id,
      entityName: document.documentNumber,
      description: `Sent ${document.documentType} via email`,
      metadata: { to: email, cc }
    });

    res.json({
      success: true,
      message: 'Document sent successfully'
    });

  } catch (error) {
    console.error('Send document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/documents/:id/pdf - Download document PDF
router.get('/:id/pdf', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id, {
      include: [
        { model: Company, as: 'company' },
        { model: DocumentItem, as: 'items' }
      ]
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Generate PDF
    const pdfBuffer = await pdfService.generateDocumentPDF(document);

    // Update printed timestamp
    await document.update({
      printedAt: new Date()
    });

    // Audit log
    await auditService.log({
      action: 'print',
      userId: req.user.id,
      entityType: 'Document',
      entityId: document.id,
      entityName: document.documentNumber,
      description: `Downloaded ${document.documentType} PDF`
    });

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.documentType}-${document.documentNumber}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Download PDF error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/documents/:id/duplicate - Duplicate document
router.post('/:id/duplicate', authenticate, authorize(['admin', 'manager', 'accountant']), async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    const originalDocument = await Document.findByPk(id, {
      include: [{ model: DocumentItem, as: 'items' }]
    });

    if (!originalDocument) {
      await t.rollback();
      return res.status(404).json({ error: 'Document not found' });
    }

    // Create new document
    const documentData = originalDocument.toJSON();
    delete documentData.id;
    delete documentData.documentNumber;
    delete documentData.createdAt;
    delete documentData.updatedAt;
    delete documentData.mydataMark;
    delete documentData.mydataUid;
    delete documentData.mydataStatus;

    const newDocument = await Document.create({
      ...documentData,
      status: 'draft',
      documentDate: new Date(),
      createdBy: req.user.id,
      relatedDocumentId: id
    }, { transaction: t });

    // Duplicate items
    if (originalDocument.items && originalDocument.items.length > 0) {
      const newItems = originalDocument.items.map(item => {
        const itemData = item.toJSON();
        delete itemData.id;
        delete itemData.createdAt;
        delete itemData.updatedAt;
        return {
          ...itemData,
          documentId: newDocument.id
        };
      });

      await DocumentItem.bulkCreate(newItems, { transaction: t });
    }

    await t.commit();

    // Reload with associations
    const fullDocument = await Document.findByPk(newDocument.id, {
      include: [
        { model: Company, as: 'company' },
        { model: DocumentItem, as: 'items' }
      ]
    });

    // Audit log
    await auditService.log({
      action: 'create',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Document',
      entityId: newDocument.id,
      entityName: newDocument.documentNumber,
      description: `Duplicated ${originalDocument.documentType}`,
      metadata: { originalId: id, originalNumber: originalDocument.documentNumber }
    });

    res.status(201).json({
      success: true,
      data: fullDocument,
      message: 'Document duplicated successfully'
    });

  } catch (error) {
    await t.rollback();
    console.error('Duplicate document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/documents/:id/payment - Record payment
router.post('/:id/payment', authenticate, authorize(['admin', 'manager', 'accountant']), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, paymentDate, notes } = req.body;

    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const paymentAmount = parseFloat(amount);
    const currentPaid = parseFloat(document.paidAmount) || 0;
    const total = parseFloat(document.total);

    if (paymentAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be positive' });
    }

    if (currentPaid + paymentAmount > total) {
      return res.status(400).json({ error: 'Payment exceeds document total' });
    }

    // Update document
    const newPaidAmount = currentPaid + paymentAmount;
    const newBalance = total - newPaidAmount;
    const newStatus = newBalance === 0 ? 'paid' : 'partial';

    await document.update({
      paidAmount: newPaidAmount,
      balanceDue: newBalance,
      status: newStatus,
      paymentMethod: paymentMethod || document.paymentMethod,
      updatedBy: req.user.id
    });

    // TODO: Create payment record in payments table

    // Audit log
    await auditService.log({
      action: 'update',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Document',
      entityId: document.id,
      entityName: document.documentNumber,
      description: `Payment recorded for ${document.documentType}`,
      metadata: {
        amount: paymentAmount,
        paymentMethod,
        paymentDate,
        notes,
        newStatus,
        totalPaid: newPaidAmount,
        remainingBalance: newBalance
      }
    });

    res.json({
      success: true,
      data: document,
      message: `Payment of €${paymentAmount.toFixed(2)} recorded successfully`
    });

  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;