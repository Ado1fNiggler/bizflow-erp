// utils/calculations.js
// Business calculation utilities for BizFlow ERP

/**
 * Tax calculations
 */
export const taxCalculations = {
  /**
   * Calculate VAT amount from net price
   * @param {number} netAmount - Net amount
   * @param {number} vatRate - VAT rate (percentage)
   * @returns {object}
   */
  calculateVAT(netAmount, vatRate = 24) {
    const vatAmount = (netAmount * vatRate) / 100;
    const grossAmount = netAmount + vatAmount;
    
    return {
      netAmount: Math.round(netAmount * 100) / 100,
      vatRate,
      vatAmount: Math.round(vatAmount * 100) / 100,
      grossAmount: Math.round(grossAmount * 100) / 100
    };
  },

  /**
   * Calculate net amount from gross price
   * @param {number} grossAmount - Gross amount
   * @param {number} vatRate - VAT rate (percentage)
   * @returns {object}
   */
  calculateNetFromGross(grossAmount, vatRate = 24) {
    const netAmount = grossAmount / (1 + vatRate / 100);
    const vatAmount = grossAmount - netAmount;
    
    return {
      netAmount: Math.round(netAmount * 100) / 100,
      vatRate,
      vatAmount: Math.round(vatAmount * 100) / 100,
      grossAmount: Math.round(grossAmount * 100) / 100
    };
  },

  /**
   * Calculate withholding tax
   * @param {number} amount - Base amount
   * @param {number} rate - Withholding rate (percentage)
   * @returns {object}
   */
  calculateWithholding(amount, rate = 20) {
    const withholdingAmount = (amount * rate) / 100;
    const netPayable = amount - withholdingAmount;
    
    return {
      baseAmount: Math.round(amount * 100) / 100,
      withholdingRate: rate,
      withholdingAmount: Math.round(withholdingAmount * 100) / 100,
      netPayable: Math.round(netPayable * 100) / 100
    };
  },

  /**
   * Calculate stamp duty (χαρτόσημο)
   * @param {number} amount - Base amount
   * @returns {object}
   */
  calculateStampDuty(amount) {
    const stampDuty = amount * 0.012; // 1.2%
    const ogaStamp = stampDuty * 0.2; // 20% on stamp duty
    const totalStamp = stampDuty + ogaStamp;
    
    return {
      baseAmount: Math.round(amount * 100) / 100,
      stampDuty: Math.round(stampDuty * 100) / 100,
      ogaStamp: Math.round(ogaStamp * 100) / 100,
      totalStamp: Math.round(totalStamp * 100) / 100,
      totalWithStamp: Math.round((amount + totalStamp) * 100) / 100
    };
  }
};

/**
 * Discount calculations
 */
export const discountCalculations = {
  /**
   * Calculate discount amount
   * @param {number} amount - Original amount
   * @param {number} discountPercent - Discount percentage
   * @returns {object}
   */
  calculateDiscount(amount, discountPercent) {
    const discountAmount = (amount * discountPercent) / 100;
    const finalAmount = amount - discountAmount;
    
    return {
      originalAmount: Math.round(amount * 100) / 100,
      discountPercent,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalAmount: Math.round(finalAmount * 100) / 100
    };
  },

  /**
   * Calculate multiple discounts (cascading)
   * @param {number} amount - Original amount
   * @param {array} discounts - Array of discount percentages
   * @returns {object}
   */
  calculateMultipleDiscounts(amount, discounts = []) {
    let currentAmount = amount;
    let totalDiscountAmount = 0;
    const discountDetails = [];
    
    discounts.forEach((discount, index) => {
      const discountAmount = (currentAmount * discount) / 100;
      currentAmount -= discountAmount;
      totalDiscountAmount += discountAmount;
      
      discountDetails.push({
        step: index + 1,
        rate: discount,
        amount: Math.round(discountAmount * 100) / 100,
        subtotal: Math.round(currentAmount * 100) / 100
      });
    });
    
    return {
      originalAmount: Math.round(amount * 100) / 100,
      discounts: discountDetails,
      totalDiscountAmount: Math.round(totalDiscountAmount * 100) / 100,
      finalAmount: Math.round(currentAmount * 100) / 100,
      effectiveDiscount: Math.round((totalDiscountAmount / amount * 100) * 100) / 100
    };
  },

  /**
   * Calculate early payment discount
   * @param {number} amount - Invoice amount
   * @param {number} daysPaid - Days until payment
   * @param {object} terms - Payment terms
   * @returns {object}
   */
  calculateEarlyPaymentDiscount(amount, daysPaid, terms = {}) {
    const { discountPercent = 2, discountDays = 10 } = terms;
    
    if (daysPaid > discountDays) {
      return {
        amount: Math.round(amount * 100) / 100,
        discount: 0,
        finalAmount: Math.round(amount * 100) / 100,
        eligible: false
      };
    }
    
    const discountAmount = (amount * discountPercent) / 100;
    const finalAmount = amount - discountAmount;
    
    return {
      amount: Math.round(amount * 100) / 100,
      discount: Math.round(discountAmount * 100) / 100,
      finalAmount: Math.round(finalAmount * 100) / 100,
      eligible: true,
      savedDays: discountDays - daysPaid
    };
  }
};

/**
 * Invoice calculations
 */
export const invoiceCalculations = {
  /**
   * Calculate invoice line total
   * @param {number} quantity - Quantity
   * @param {number} unitPrice - Unit price
   * @param {number} discountPercent - Discount percentage
   * @param {number} vatRate - VAT rate
   * @returns {object}
   */
  calculateLineTotal(quantity, unitPrice, discountPercent = 0, vatRate = 24) {
    const subtotal = quantity * unitPrice;
    const discountAmount = (subtotal * discountPercent) / 100;
    const netAmount = subtotal - discountAmount;
    const vatAmount = (netAmount * vatRate) / 100;
    const total = netAmount + vatAmount;
    
    return {
      quantity,
      unitPrice: Math.round(unitPrice * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      discountPercent,
      discountAmount: Math.round(discountAmount * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
      vatRate,
      vatAmount: Math.round(vatAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  },

  /**
   * Calculate invoice totals from items
   * @param {array} items - Invoice items
   * @returns {object}
   */
  calculateInvoiceTotals(items = []) {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalNet = 0;
    const vatBreakdown = {};
    let totalVat = 0;
    let grandTotal = 0;
    
    items.forEach(item => {
      const lineCalc = this.calculateLineTotal(
        item.quantity,
        item.unitPrice,
        item.discount || 0,
        item.vatRate || 24
      );
      
      subtotal += lineCalc.subtotal;
      totalDiscount += lineCalc.discountAmount;
      totalNet += lineCalc.netAmount;
      totalVat += lineCalc.vatAmount;
      grandTotal += lineCalc.total;
      
      // Group VAT by rate
      const vatKey = `vat_${item.vatRate || 24}`;
      if (!vatBreakdown[vatKey]) {
        vatBreakdown[vatKey] = {
          rate: item.vatRate || 24,
          netAmount: 0,
          vatAmount: 0
        };
      }
      vatBreakdown[vatKey].netAmount += lineCalc.netAmount;
      vatBreakdown[vatKey].vatAmount += lineCalc.vatAmount;
    });
    
    return {
      itemCount: items.length,
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
      vatBreakdown: Object.values(vatBreakdown).map(vat => ({
        rate: vat.rate,
        netAmount: Math.round(vat.netAmount * 100) / 100,
        vatAmount: Math.round(vat.vatAmount * 100) / 100
      })),
      totalVat: Math.round(totalVat * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100
    };
  },

  /**
   * Calculate payment allocation
   * @param {number} paymentAmount - Payment amount
   * @param {array} invoices - Array of invoices to pay
   * @returns {object}
   */
  allocatePayment(paymentAmount, invoices = []) {
    let remainingAmount = paymentAmount;
    const allocations = [];
    let totalAllocated = 0;
    
    // Sort invoices by date (oldest first)
    const sortedInvoices = [...invoices].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    for (const invoice of sortedInvoices) {
      if (remainingAmount <= 0) break;
      
      const outstanding = invoice.total - (invoice.paid || 0);
      if (outstanding <= 0) continue;
      
      const allocation = Math.min(remainingAmount, outstanding);
      
      allocations.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        invoiceTotal: invoice.total,
        previouslyPaid: invoice.paid || 0,
        outstanding,
        allocated: Math.round(allocation * 100) / 100,
        remaining: Math.round((outstanding - allocation) * 100) / 100,
        fullPaid: allocation >= outstanding
      });
      
      totalAllocated += allocation;
      remainingAmount -= allocation;
    }
    
    return {
      paymentAmount: Math.round(paymentAmount * 100) / 100,
      totalAllocated: Math.round(totalAllocated * 100) / 100,
      remainingCredit: Math.round(remainingAmount * 100) / 100,
      allocations,
      fullyAllocated: remainingAmount === 0
    };
  }
};

/**
 * Financial calculations
 */
export const financialCalculations = {
  /**
   * Calculate compound interest
   * @param {number} principal - Principal amount
   * @param {number} rate - Annual interest rate (percentage)
   * @param {number} time - Time period in years
   * @param {number} compound - Compounding frequency per year
   * @returns {object}
   */
  calculateCompoundInterest(principal, rate, time, compound = 12) {
    const amount = principal * Math.pow((1 + rate / 100 / compound), compound * time);
    const interest = amount - principal;
    
    return {
      principal: Math.round(principal * 100) / 100,
      rate,
      time,
      compound,
      interest: Math.round(interest * 100) / 100,
      amount: Math.round(amount * 100) / 100
    };
  },

  /**
   * Calculate loan payment (PMT)
   * @param {number} principal - Loan amount
   * @param {number} rate - Annual interest rate (percentage)
   * @param {number} periods - Number of payments
   * @returns {object}
   */
  calculateLoanPayment(principal, rate, periods) {
    const monthlyRate = rate / 100 / 12;
    let payment;
    
    if (monthlyRate === 0) {
      payment = principal / periods;
    } else {
      payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, periods)) / 
                (Math.pow(1 + monthlyRate, periods) - 1);
    }
    
    const totalPayment = payment * periods;
    const totalInterest = totalPayment - principal;
    
    return {
      principal: Math.round(principal * 100) / 100,
      rate,
      periods,
      monthlyPayment: Math.round(payment * 100) / 100,
      totalPayment: Math.round(totalPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100
    };
  },

  /**
   * Calculate profit margin
   * @param {number} revenue - Revenue
   * @param {number} cost - Cost
   * @returns {object}
   */
  calculateProfitMargin(revenue, cost) {
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const markup = cost > 0 ? (profit / cost) * 100 : 0;
    
    return {
      revenue: Math.round(revenue * 100) / 100,
      cost: Math.round(cost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      markup: Math.round(markup * 100) / 100
    };
  },

  /**
   * Calculate break-even point
   * @param {number} fixedCosts - Fixed costs
   * @param {number} variableCostPerUnit - Variable cost per unit
   * @param {number} pricePerUnit - Selling price per unit
   * @returns {object}
   */
  calculateBreakEven(fixedCosts, variableCostPerUnit, pricePerUnit) {
    const contributionMargin = pricePerUnit - variableCostPerUnit;
    const breakEvenUnits = contributionMargin > 0 ? fixedCosts / contributionMargin : 0;
    const breakEvenRevenue = breakEvenUnits * pricePerUnit;
    
    return {
      fixedCosts: Math.round(fixedCosts * 100) / 100,
      variableCostPerUnit: Math.round(variableCostPerUnit * 100) / 100,
      pricePerUnit: Math.round(pricePerUnit * 100) / 100,
      contributionMargin: Math.round(contributionMargin * 100) / 100,
      breakEvenUnits: Math.ceil(breakEvenUnits),
      breakEvenRevenue: Math.round(breakEvenRevenue * 100) / 100
    };
  }
};

/**
 * Statistical calculations
 */
export const statisticalCalculations = {
  /**
   * Calculate average
   * @param {array} numbers - Array of numbers
   * @returns {number}
   */
  average(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return Math.round((sum / numbers.length) * 100) / 100;
  },

  /**
   * Calculate median
   * @param {array} numbers - Array of numbers
   * @returns {number}
   */
  median(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
    }
    
    return Math.round(sorted[mid] * 100) / 100;
  },

  /**
   * Calculate standard deviation
   * @param {array} numbers - Array of numbers
   * @returns {number}
   */
  standardDeviation(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    
    const avg = this.average(numbers);
    const squaredDiffs = numbers.map(num => Math.pow(num - avg, 2));
    const avgSquaredDiff = this.average(squaredDiffs);
    
    return Math.round(Math.sqrt(avgSquaredDiff) * 100) / 100;
  },

  /**
   * Calculate percentage change
   * @param {number} oldValue - Old value
   * @param {number} newValue - New value
   * @returns {object}
   */
  percentageChange(oldValue, newValue) {
    if (oldValue === 0) {
      return {
        oldValue,
        newValue,
        change: newValue,
        percentageChange: newValue > 0 ? 100 : 0,
        trend: newValue > 0 ? 'up' : 'unchanged'
      };
    }
    
    const change = newValue - oldValue;
    const percentage = (change / Math.abs(oldValue)) * 100;
    
    return {
      oldValue: Math.round(oldValue * 100) / 100,
      newValue: Math.round(newValue * 100) / 100,
      change: Math.round(change * 100) / 100,
      percentageChange: Math.round(percentage * 100) / 100,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'unchanged'
    };
  },

  /**
   * Calculate growth rate
   * @param {array} values - Array of values over time
   * @returns {object}
   */
  growthRate(values) {
    if (!values || values.length < 2) return { rate: 0, trend: 'insufficient_data' };
    
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const periods = values.length - 1;
    
    const growthRate = Math.pow(lastValue / firstValue, 1 / periods) - 1;
    
    return {
      firstValue: Math.round(firstValue * 100) / 100,
      lastValue: Math.round(lastValue * 100) / 100,
      periods,
      growthRate: Math.round(growthRate * 10000) / 100,
      annualizedRate: Math.round((Math.pow(1 + growthRate, 12 / periods) - 1) * 10000) / 100,
      trend: growthRate > 0 ? 'growth' : growthRate < 0 ? 'decline' : 'stable'
    };
  }
};

// Export all calculations as default
export default {
  ...taxCalculations,
  ...discountCalculations,
  ...invoiceCalculations,
  ...financialCalculations,
  ...statisticalCalculations
};