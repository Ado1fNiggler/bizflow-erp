// services/reportService.js
// Service για δημιουργία αναφορών και στατιστικών

import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import Company from '../models/Company.js';
import Document from '../models/Document.js';
import DocumentItem from '../models/DocumentItem.js';
import Member from '../models/Member.js';
import pdfService from './pdfService.js';
import emailService from './emailService.js';
import ExcelJS from 'exceljs';
import moment from 'moment';

class ReportService {
  constructor() {
    this.defaultDateRange = {
      startDate: moment().startOf('month').toDate(),
      endDate: moment().endOf('month').toDate()
    };
  }

  // ======================
  // Financial Reports
  // ======================
  
  async generateFinancialReport(options = {}) {
    const {
      startDate = this.defaultDateRange.startDate,
      endDate = this.defaultDateRange.endDate,
      companyId = null,
      reportType = 'summary'
    } = options;

    try {
      // Συλλογή δεδομένων
      const whereClause = {
        documentDate: {
          [Op.between]: [startDate, endDate]
        },
        status: {
          [Op.notIn]: ['draft', 'cancelled']
        }
      };

      if (companyId) {
        whereClause.companyId = companyId;
      }

      // Έσοδα
      const revenues = await Document.findAll({
        where: {
          ...whereClause,
          documentType: {
            [Op.in]: ['invoice', 'receipt']
          }
        },
        include: [{
          model: Company,
          attributes: ['name', 'vatNumber']
        }]
      });

      // Έξοδα
      const expenses = await Document.findAll({
        where: {
          ...whereClause,
          documentType: {
            [Op.in]: ['supplier_invoice', 'expense']
          }
        }
      });

      // Υπολογισμοί
      const totalRevenue = revenues.reduce((sum, doc) => sum + parseFloat(doc.total || 0), 0);
      const totalExpenses = expenses.reduce((sum, doc) => sum + parseFloat(doc.total || 0), 0);
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // VAT Analysis
      const vatAnalysis = await this.calculateVATAnalysis(whereClause);

      const report = {
        period: {
          startDate: moment(startDate).format('DD/MM/YYYY'),
          endDate: moment(endDate).format('DD/MM/YYYY')
        },
        summary: {
          totalRevenue,
          totalExpenses,
          netProfit,
          profitMargin: profitMargin.toFixed(2),
          documentCount: revenues.length + expenses.length
        },
        revenues: {
          total: totalRevenue,
          count: revenues.length,
          averageValue: revenues.length > 0 ? (totalRevenue / revenues.length).toFixed(2) : 0,
          documents: reportType === 'detailed' ? revenues : []
        },
        expenses: {
          total: totalExpenses,
          count: expenses.length,
          averageValue: expenses.length > 0 ? (totalExpenses / expenses.length).toFixed(2) : 0,
          documents: reportType === 'detailed' ? expenses : []
        },
        vat: vatAnalysis,
        generatedAt: new Date()
      };

      return report;
    } catch (error) {
      console.error('Error generating financial report:', error);
      throw error;
    }
  }

  async calculateVATAnalysis(whereClause) {
    const documents = await Document.findAll({
      where: whereClause,
      attributes: [
        'documentType',
        [sequelize.fn('SUM', sequelize.col('vatAmount')), 'totalVat'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['documentType']
    });

    const vatCollected = documents
      .filter(d => ['invoice', 'receipt'].includes(d.documentType))
      .reduce((sum, d) => sum + parseFloat(d.dataValues.totalVat || 0), 0);

    const vatPaid = documents
      .filter(d => ['supplier_invoice', 'expense'].includes(d.documentType))
      .reduce((sum, d) => sum + parseFloat(d.dataValues.totalVat || 0), 0);

    return {
      collected: vatCollected,
      paid: vatPaid,
      balance: vatCollected - vatPaid,
      details: documents
    };
  }

  // ======================
  // Customer Reports
  // ======================

  async generateCustomerReport(options = {}) {
    const {
      startDate = this.defaultDateRange.startDate,
      endDate = this.defaultDateRange.endDate,
      topN = 10
    } = options;

    try {
      const customerStats = await Company.findAll({
        attributes: [
          'id',
          'name',
          'vatNumber',
          [sequelize.fn('COUNT', sequelize.col('Document.id')), 'documentCount'],
          [sequelize.fn('SUM', sequelize.col('Document.total')), 'totalRevenue'],
          [sequelize.fn('SUM', sequelize.col('Document.balanceDue')), 'totalDue']
        ],
        include: [{
          model: Document,
          attributes: [],
          where: {
            documentDate: {
              [Op.between]: [startDate, endDate]
            },
            documentType: {
              [Op.in]: ['invoice', 'receipt']
            },
            status: {
              [Op.notIn]: ['draft', 'cancelled']
            }
          },
          required: false
        }],
        group: ['Company.id'],
        order: [[sequelize.literal('totalRevenue'), 'DESC']],
        limit: topN,
        subQuery: false
      });

      // Customer aging analysis
      const agingAnalysis = await this.generateAgingAnalysis();

      return {
        period: {
          startDate: moment(startDate).format('DD/MM/YYYY'),
          endDate: moment(endDate).format('DD/MM/YYYY')
        },
        topCustomers: customerStats.map(c => ({
          id: c.id,
          name: c.name,
          vatNumber: c.vatNumber,
          documentCount: parseInt(c.dataValues.documentCount) || 0,
          totalRevenue: parseFloat(c.dataValues.totalRevenue) || 0,
          totalDue: parseFloat(c.dataValues.totalDue) || 0
        })),
        aging: agingAnalysis,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating customer report:', error);
      throw error;
    }
  }

  async generateAgingAnalysis() {
    const now = moment();
    
    const aging = await Document.findAll({
      attributes: [
        [sequelize.literal(`
          CASE
            WHEN "dueDate" >= CURRENT_DATE THEN 'current'
            WHEN "dueDate" >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30'
            WHEN "dueDate" >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60'
            WHEN "dueDate" >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90'
            ELSE 'over90'
          END
        `), 'agingBucket'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('balanceDue')), 'totalDue']
      ],
      where: {
        balanceDue: {
          [Op.gt]: 0
        },
        status: {
          [Op.notIn]: ['paid', 'cancelled']
        }
      },
      group: ['agingBucket']
    });

    return aging.map(a => ({
      bucket: a.dataValues.agingBucket,
      count: parseInt(a.dataValues.count) || 0,
      totalDue: parseFloat(a.dataValues.totalDue) || 0
    }));
  }

  // ======================
  // Tax Reports
  // ======================

  async generateTaxReport(options = {}) {
    const {
      year = new Date().getFullYear(),
      quarter = null,
      month = null
    } = options;

    try {
      let startDate, endDate;

      if (month) {
        startDate = moment().year(year).month(month - 1).startOf('month').toDate();
        endDate = moment().year(year).month(month - 1).endOf('month').toDate();
      } else if (quarter) {
        startDate = moment().year(year).quarter(quarter).startOf('quarter').toDate();
        endDate = moment().year(year).quarter(quarter).endOf('quarter').toDate();
      } else {
        startDate = moment().year(year).startOf('year').toDate();
        endDate = moment().year(year).endOf('year').toDate();
      }

      // Συλλογή δεδομένων για ΦΠΑ
      const vatData = await this.calculateVATAnalysis({
        documentDate: {
          [Op.between]: [startDate, endDate]
        },
        status: {
          [Op.notIn]: ['draft', 'cancelled']
        }
      });

      // Παρακρατήσεις
      const withholdings = await Document.findAll({
        attributes: [
          [sequelize.fn('SUM', sequelize.col('withholdingTaxAmount')), 'totalWithholding']
        ],
        where: {
          documentDate: {
            [Op.between]: [startDate, endDate]
          },
          withholdingTaxAmount: {
            [Op.gt]: 0
          },
          status: {
            [Op.notIn]: ['draft', 'cancelled']
          }
        }
      });

      // Κατηγοριοποίηση εσόδων/εξόδων για Ε3
      const incomeCategories = await DocumentItem.findAll({
        attributes: [
          'incomeCategory',
          [sequelize.fn('SUM', sequelize.col('netAmount')), 'total']
        ],
        include: [{
          model: Document,
          attributes: [],
          where: {
            documentDate: {
              [Op.between]: [startDate, endDate]
            },
            documentType: {
              [Op.in]: ['invoice', 'receipt']
            },
            status: {
              [Op.notIn]: ['draft', 'cancelled']
            }
          }
        }],
        group: ['incomeCategory'],
        having: sequelize.where(sequelize.col('incomeCategory'), {
          [Op.ne]: null
        })
      });

      return {
        period: {
          year,
          quarter,
          month,
          startDate: moment(startDate).format('DD/MM/YYYY'),
          endDate: moment(endDate).format('DD/MM/YYYY')
        },
        vat: vatData,
        withholdings: {
          total: parseFloat(withholdings[0]?.dataValues?.totalWithholding || 0)
        },
        incomeCategories: incomeCategories.map(cat => ({
          category: cat.incomeCategory,
          total: parseFloat(cat.dataValues.total) || 0
        })),
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating tax report:', error);
      throw error;
    }
  }

  // ======================
  // Member Reports
  // ======================

  async generateMemberReport(options = {}) {
    const { includeInactive = false } = options;

    try {
      const whereClause = includeInactive ? {} : { status: 'active' };

      const memberStats = await Member.findAll({
        attributes: [
          'memberCategory',
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('subscriptionFee')), 'totalFees']
        ],
        where: whereClause,
        group: ['memberCategory', 'status']
      });

      const expiringMembers = await Member.findAll({
        where: {
          memberUntil: {
            [Op.between]: [
              new Date(),
              moment().add(30, 'days').toDate()
            ]
          },
          status: 'active'
        },
        attributes: ['id', 'firstName', 'lastName', 'memberUntil', 'email']
      });

      return {
        statistics: memberStats.map(stat => ({
          category: stat.memberCategory,
          status: stat.status,
          count: parseInt(stat.dataValues.count) || 0,
          totalFees: parseFloat(stat.dataValues.totalFees) || 0
        })),
        expiringMembers: expiringMembers.map(m => ({
          id: m.id,
          name: `${m.firstName} ${m.lastName}`,
          email: m.email,
          expiresAt: moment(m.memberUntil).format('DD/MM/YYYY'),
          daysUntilExpiry: moment(m.memberUntil).diff(moment(), 'days')
        })),
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating member report:', error);
      throw error;
    }
  }

  // ======================
  // Export Functions
  // ======================

  async exportToExcel(reportData, filename = 'report.xlsx') {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BizFlow ERP';
    workbook.created = new Date();

    // Δημιουργία sheets ανάλογα με τον τύπο report
    if (reportData.summary) {
      const summarySheet = workbook.addWorksheet('Summary');
      this.addSummaryToSheet(summarySheet, reportData.summary);
    }

    if (reportData.revenues) {
      const revenueSheet = workbook.addWorksheet('Revenues');
      this.addDataToSheet(revenueSheet, reportData.revenues.documents || []);
    }

    if (reportData.expenses) {
      const expenseSheet = workbook.addWorksheet('Expenses');
      this.addDataToSheet(expenseSheet, reportData.expenses.documents || []);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  addSummaryToSheet(worksheet, summary) {
    worksheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    Object.entries(summary).forEach(([key, value]) => {
      worksheet.addRow({
        metric: this.formatMetricName(key),
        value: value
      });
    });

    // Styling
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  }

  addDataToSheet(worksheet, data) {
    if (!data || data.length === 0) return;

    // Auto-generate columns από το πρώτο object
    const columns = Object.keys(data[0]).map(key => ({
      header: this.formatMetricName(key),
      key: key,
      width: 15
    }));

    worksheet.columns = columns;

    // Προσθήκη δεδομένων
    data.forEach(row => {
      worksheet.addRow(row);
    });

    // Styling
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  }

  formatMetricName(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  // ======================
  // Scheduled Reports
  // ======================

  async sendScheduledReports() {
    // Μηνιαίες αναφορές
    if (moment().date() === 1) {
      const lastMonth = moment().subtract(1, 'month');
      const report = await this.generateFinancialReport({
        startDate: lastMonth.startOf('month').toDate(),
        endDate: lastMonth.endOf('month').toDate()
      });

      const pdf = await pdfService.generateReportPDF(report, 'financial');
      
      await emailService.sendReportEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `Μηνιαία Οικονομική Αναφορά - ${lastMonth.format('MMMM YYYY')}`,
        report: report,
        attachment: {
          filename: `financial-report-${lastMonth.format('YYYY-MM')}.pdf`,
          content: pdf
        }
      });
    }
  }
}

export default new ReportService();