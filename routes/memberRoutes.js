// routes/memberRoutes.js
// Member management routes

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import Member from '../models/Member.js';
import Company from '../models/Company.js';
import Document from '../models/Document.js';
import auditService from '../services/auditService.js';
import emailService from '../services/emailService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { cache } from '../middleware/cache.js';
import ExcelJS from 'exceljs';

const router = express.Router();

// ======================
// Validation Rules
// ======================

const memberValidation = [
  body('firstName').notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('lastName').notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('vatNumber').optional().matches(/^\d{9}$/),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/),
  body('memberCategory').optional().isIn(['regular', 'honorary', 'student', 'corporate', 'lifetime'])
];

// ======================
// Routes
// ======================

// GET /api/members - Get all members
router.get('/', authenticate, cache(60), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      status,
      expiring,
      sortBy = 'lastName',
      sortOrder = 'ASC'
    } = req.query;

    // Build where clause
    const where = {};
    
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { vatNumber: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { memberCode: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (category) {
      where.memberCategory = category;
    }
    
    if (status) {
      where.status = status;
    }
    
    // Filter expiring members
    if (expiring === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      where.memberUntil = {
        [Op.between]: [new Date(), thirtyDaysFromNow]
      };
      where.status = 'active';
    }

    // Get members with pagination
    const offset = (page - 1) * limit;
    const { count, rows } = await Member.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      include: [{
        model: Company,
        as: 'company',
        attributes: ['id', 'name']
      }],
      attributes: [
        'id', 'memberCode', 'firstName', 'lastName', 'vatNumber',
        'email', 'phone', 'memberCategory', 'status', 'memberSince',
        'memberUntil', 'subscriptionPaid', 'companyId'
      ]
    });

    // Calculate statistics
    const stats = await Member.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'active' THEN 1 END")), 'active'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'inactive' THEN 1 END")), 'inactive'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN subscriptionPaid = true THEN 1 END")), 'paid']
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
        total: parseInt(stats?.dataValues.total) || 0,
        active: parseInt(stats?.dataValues.active) || 0,
        inactive: parseInt(stats?.dataValues.inactive) || 0,
        paid: parseInt(stats?.dataValues.paid) || 0
      }
    });

  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/members/expiring - Get expiring memberships
router.get('/expiring', authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const expiringMembers = await Member.getExpiringMembers(parseInt(days));
    
    const membersWithDays = expiringMembers.map(member => ({
      ...member.toJSON(),
      daysUntilExpiry: member.getDaysUntilExpiry(),
      needsRenewal: member.needsRenewal()
    }));

    res.json({
      success: true,
      data: membersWithDays,
      count: membersWithDays.length
    });

  } catch (error) {
    console.error('Get expiring members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/members/:id - Get single member
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const member = await Member.findByPk(id, {
      include: [
        {
          model: Company,
          as: 'company'
        },
        {
          model: Document,
          as: 'documents',
          limit: 10,
          order: [['createdAt', 'DESC']],
          attributes: ['id', 'documentType', 'documentNumber', 'total', 'status', 'documentDate']
        }
      ]
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Add calculated fields
    const memberData = {
      ...member.toJSON(),
      fullName: member.getFullName(),
      isActive: member.isActive(),
      daysUntilExpiry: member.getDaysUntilExpiry(),
      needsRenewal: member.needsRenewal(),
      isExpired: member.isExpired(),
      calculatedFee: member.calculateSubscriptionFee()
    };

    // Audit log
    await auditService.log({
      action: 'read',
      userId: req.user.id,
      entityType: 'Member',
      entityId: member.id,
      entityName: member.getFullName(),
      description: 'Viewed member details'
    });

    res.json({
      success: true,
      data: memberData
    });

  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/members - Create new member
router.post('/', authenticate, authorize(['admin', 'manager']), memberValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check for duplicate VAT number
    if (req.body.vatNumber) {
      const existing = await Member.findOne({
        where: { vatNumber: req.body.vatNumber }
      });
      
      if (existing) {
        return res.status(409).json({
          error: 'Member with this VAT number already exists'
        });
      }
    }

    // Check for duplicate email
    if (req.body.email) {
      const existing = await Member.findOne({
        where: { email: req.body.email }
      });
      
      if (existing) {
        return res.status(409).json({
          error: 'Member with this email already exists'
        });
      }
    }

    // Create member
    const member = await Member.create({
      ...req.body,
      createdBy: req.user.id
    });

    // Send welcome email
    if (member.email) {
      await emailService.sendWelcomeMemberEmail({
        to: member.email,
        name: member.getFullName(),
        memberCode: member.memberCode
      });
    }

    // Audit log
    await auditService.log({
      action: 'create',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Member',
      entityId: member.id,
      entityName: member.getFullName(),
      description: 'Created new member',
      newValues: member.toJSON()
    });

    res.status(201).json({
      success: true,
      data: member
    });

  } catch (error) {
    console.error('Create member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/members/:id - Update member
router.put('/:id', authenticate, authorize(['admin', 'manager']), memberValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    const member = await Member.findByPk(id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Store old values for audit
    const oldValues = member.toJSON();

    // Check VAT number uniqueness if changed
    if (req.body.vatNumber && req.body.vatNumber !== member.vatNumber) {
      const existing = await Member.findOne({
        where: { 
          vatNumber: req.body.vatNumber,
          id: { [Op.ne]: id }
        }
      });
      
      if (existing) {
        return res.status(409).json({
          error: 'Another member with this VAT number exists'
        });
      }
    }

    // Check email uniqueness if changed
    if (req.body.email && req.body.email !== member.email) {
      const existing = await Member.findOne({
        where: { 
          email: req.body.email,
          id: { [Op.ne]: id }
        }
      });
      
      if (existing) {
        return res.status(409).json({
          error: 'Another member with this email exists'
        });
      }
    }

    // Update member
    await member.update({
      ...req.body,
      updatedBy: req.user.id
    });

    // Audit log with changes
    const changes = auditService.logChanges(oldValues, member.toJSON());
    await auditService.log({
      action: 'update',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Member',
      entityId: member.id,
      entityName: member.getFullName(),
      description: 'Updated member',
      ...changes
    });

    res.json({
      success: true,
      data: member
    });

  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/members/:id - Delete member
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const member = await Member.findByPk(id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Check for related documents
    const documentCount = await Document.count({
      where: { memberId: id }
    });

    if (documentCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete member with existing documents',
        documentCount
      });
    }

    const memberName = member.getFullName();

    // Soft delete
    await member.destroy();

    // Audit log
    await auditService.logSecurityEvent('MEMBER_DELETED', 'medium', {
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Member',
      entityId: id,
      entityName: memberName,
      oldValues: member.toJSON()
    });

    res.json({
      success: true,
      message: 'Member deleted successfully'
    });

  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/members/:id/renew - Renew membership
router.post('/:id/renew', authenticate, authorize(['admin', 'manager', 'accountant']), async (req, res) => {
  try {
    const { id } = req.params;
    const { months = 12, paid = false, paymentMethod, notes } = req.body;

    const member = await Member.findByPk(id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Renew membership
    await member.renewMembership(months);
    
    if (paid) {
      member.subscriptionPaid = true;
      member.lastPaymentDate = new Date();
      await member.save();
    }

    // Send renewal confirmation email
    if (member.email) {
      await emailService.sendRenewalConfirmationEmail({
        to: member.email,
        name: member.getFullName(),
        expiryDate: member.memberUntil
      });
    }

    // Audit log
    await auditService.log({
      action: 'update',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Member',
      entityId: member.id,
      entityName: member.getFullName(),
      description: 'Renewed membership',
      metadata: {
        months,
        paid,
        paymentMethod,
        notes,
        newExpiryDate: member.memberUntil
      }
    });

    res.json({
      success: true,
      data: member,
      message: `Membership renewed until ${member.memberUntil.toLocaleDateString()}`
    });

  } catch (error) {
    console.error('Renew membership error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/members/:id/send-reminder - Send renewal reminder
router.post('/:id/send-reminder', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;

    const member = await Member.findByPk(id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (!member.email) {
      return res.status(400).json({ error: 'Member has no email address' });
    }

    // Send reminder email
    await emailService.sendRenewalReminderEmail({
      to: member.email,
      name: member.getFullName(),
      expiryDate: member.memberUntil,
      daysUntilExpiry: member.getDaysUntilExpiry()
    });

    // Audit log
    await auditService.log({
      action: 'email',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Member',
      entityId: member.id,
      entityName: member.getFullName(),
      description: 'Sent renewal reminder email'
    });

    res.json({
      success: true,
      message: 'Reminder email sent successfully'
    });

  } catch (error) {
    console.error('Send reminder error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/members/:id/documents - Get member documents
router.get('/:id/documents', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      type,
      status
    } = req.query;

    const where = { memberId: id };
    
    if (type) {
      where.documentType = type;
    }
    
    if (status) {
      where.status = status;
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await Document.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['documentDate', 'DESC']],
      attributes: [
        'id', 'documentType', 'documentNumber', 'documentDate',
        'total', 'status'
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
    console.error('Get member documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/members/import - Bulk import members
router.post('/import', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { members } = req.body;

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: 'No members to import' });
    }

    const results = {
      success: [],
      errors: []
    };

    for (const memberData of members) {
      try {
        // Check for existing member
        const existing = await Member.findOne({
          where: {
            [Op.or]: [
              { vatNumber: memberData.vatNumber },
              { email: memberData.email }
            ]
          }
        });

        if (existing) {
          results.errors.push({
            data: memberData,
            error: 'Member already exists'
          });
          continue;
        }

        const member = await Member.create({
          ...memberData,
          createdBy: req.user.id
        });

        results.success.push(member);

      } catch (error) {
        results.errors.push({
          data: memberData,
          error: error.message
        });
      }
    }

    // Audit log
    await auditService.log({
      action: 'import',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Member',
      description: 'Bulk member import',
      metadata: {
        total: members.length,
        success: results.success.length,
        errors: results.errors.length
      }
    });

    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Import members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/members/export - Export members to Excel
router.get('/export', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { status, category } = req.query;

    const where = {};
    if (status) where.status = status;
    if (category) where.memberCategory = category;

    const members = await Member.findAll({
      where,
      include: [{
        model: Company,
        as: 'company',
        attributes: ['name']
      }],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Members');

    // Add headers
    worksheet.columns = [
      { header: 'Κωδικός', key: 'memberCode', width: 15 },
      { header: 'Επώνυμο', key: 'lastName', width: 20 },
      { header: 'Όνομα', key: 'firstName', width: 20 },
      { header: 'ΑΦΜ', key: 'vatNumber', width: 12 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Τηλέφωνο', key: 'phone', width: 15 },
      { header: 'Κατηγορία', key: 'memberCategory', width: 15 },
      { header: 'Κατάσταση', key: 'status', width: 12 },
      { header: 'Εταιρία', key: 'companyName', width: 25 },
      { header: 'Μέλος από', key: 'memberSince', width: 12 },
      { header: 'Λήξη', key: 'memberUntil', width: 12 }
    ];

    // Add data
    members.forEach(member => {
      worksheet.addRow({
        memberCode: member.memberCode,
        lastName: member.lastName,
        firstName: member.firstName,
        vatNumber: member.vatNumber,
        email: member.email,
        phone: member.phone,
        memberCategory: member.memberCategory,
        status: member.status,
        companyName: member.company?.name,
        memberSince: member.memberSince,
        memberUntil: member.memberUntil
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Audit log
    await auditService.log({
      action: 'export',
      userId: req.user.id,
      userName: req.user.name,
      entityType: 'Member',
      description: 'Exported members to Excel',
      metadata: { count: members.length }
    });

    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=members-${Date.now()}.xlsx`);
    res.send(buffer);

  } catch (error) {
    console.error('Export members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;