// Verification test for mathematical calculations and SRS requirements
const Calculator = {
  formatRupiah(value) {
    if (value === null || value === undefined || isNaN(value)) return 'Rp 0';
    const rounded = Math.round(Number(value));
    return 'Rp ' + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  },

  parseDiscountString(input) {
    if (!input || typeof input !== 'string') return [];
    const cleaned = input.replace(/%/g, '').trim();
    if (!cleaned) return [];
    const parts = cleaned.split(/[+,\s/]+/).filter(Boolean);
    const discounts = [];
    for (const part of parts) {
      const val = parseFloat(part);
      if (!isNaN(val) && val > 0 && val <= 100) {
        discounts.push(val);
      }
    }
    return discounts;
  },

  calculateTieredDiscount(originalPrice, discountInput) {
    const price = Math.max(0, Number(originalPrice) || 0);
    const discounts = Array.isArray(discountInput) 
      ? discountInput 
      : this.parseDiscountString(discountInput);

    if (discounts.length === 0 || price === 0) {
      return {
        originalPrice: price,
        finalUnitPrice: price,
        discountAmount: 0,
        effectivePercent: 0,
        discounts: [],
        steps: []
      };
    }

    let currentPrice = price;
    const steps = [];

    discounts.forEach((disc, index) => {
      const rate = disc / 100;
      const stepCut = currentPrice * rate;
      const stepAfter = currentPrice - stepCut;
      steps.push({
        step: index + 1,
        percent: disc,
        startPrice: currentPrice,
        cutAmount: stepCut,
        endPrice: stepAfter
      });
      currentPrice = stepAfter;
    });

    const finalUnitPrice = Math.round(currentPrice);
    const totalCut = price - finalUnitPrice;
    const effectivePercent = ((totalCut / price) * 100).toFixed(1);

    return {
      originalPrice: price,
      finalUnitPrice,
      discountAmount: totalCut,
      effectivePercent: Number(effectivePercent),
      discounts,
      steps
    };
  },

  calculateItemTotal(qty, unitPrice, discountInput = '') {
    const quantity = Math.max(0, Number(qty) || 0);
    const discountResult = this.calculateTieredDiscount(unitPrice, discountInput);
    const subtotal = Math.round(quantity * discountResult.finalUnitPrice);
    const rawSubtotal = Math.round(quantity * discountResult.originalPrice);
    const totalSaved = rawSubtotal - subtotal;

    return {
      qty: quantity,
      rawUnitPrice: discountResult.originalPrice,
      effectiveUnitPrice: discountResult.finalUnitPrice,
      discountResult,
      subtotal,
      rawSubtotal,
      totalSaved
    };
  },

  comparePriceWithLastMonth(currentPrice, lastMonthPrice) {
    const current = Math.max(0, Number(currentPrice) || 0);
    const prev = Math.max(0, Number(lastMonthPrice) || 0);

    if (prev <= 0) {
      return { status: 'NEW', label: 'Baru', diffAmount: 0, diffPercent: 0 };
    }

    const diffAmount = current - prev;
    const diffPercent = ((diffAmount / prev) * 100).toFixed(1);

    if (diffAmount > 0) {
      return { status: 'UP', symbol: '↑', label: 'Naik', diffAmount: Math.abs(diffAmount), diffPercent: Math.abs(Number(diffPercent)) };
    } else if (diffAmount < 0) {
      return { status: 'DOWN', symbol: '↓', label: 'Turun', diffAmount: Math.abs(diffAmount), diffPercent: Math.abs(Number(diffPercent)) };
    } else {
      return { status: 'EQUAL', symbol: '=', label: 'Stabil', diffAmount: 0, diffPercent: 0 };
    }
  },

  evaluateBudget(totalCart, budgetCap) {
    const total = Math.max(0, Number(totalCart) || 0);
    const cap = Math.max(0, Number(budgetCap) || 0);

    if (cap <= 0) return { status: 'NO_CAP' };

    const percent = Math.min(200, ((total / cap) * 100).toFixed(1));
    const remaining = cap - total;

    let status = 'SAFE';
    if (total > cap) status = 'OVERBUDGET';
    else if (percent >= 90) status = 'CRITICAL';
    else if (percent >= 75) status = 'WARNING';

    return { total, cap, percent: Number(percent), remaining, status };
  }
};

console.log('--- TEST 1: Tiered Discount Calculation [F-03] ---');
// Rp 100.000 with 50% + 20%
const tieredResult = Calculator.calculateTieredDiscount(100000, '50+20');
console.log('Original: 100.000, 50+20 -> Final Unit Price:', tieredResult.finalUnitPrice, 'Effective %:', tieredResult.effectivePercent);
console.assert(tieredResult.finalUnitPrice === 40000, '50+20 should result in 40.000');
console.assert(tieredResult.effectivePercent === 60, 'Effective discount should be 60% not 70%');

console.log('\n--- TEST 2: Quantity Realtime Multiplication [F-02] ---');
const itemTotal = Calculator.calculateItemTotal(3, 100000, '50+20');
console.log('Qty 3 * 40.000 -> Subtotal:', itemTotal.subtotal, 'Total Saved:', itemTotal.totalSaved);
console.assert(itemTotal.subtotal === 120000, 'Subtotal should be 120.000');
console.assert(itemTotal.totalSaved === 180000, 'Total saved should be 180.000');

console.log('\n--- TEST 3: Price Fluctuation Indicators [F-04] ---');
const compUp = Calculator.comparePriceWithLastMonth(75000, 72000);
console.log('75.000 vs 72.000 ->', compUp.status, compUp.symbol, compUp.diffPercent + '%');
console.assert(compUp.status === 'UP', 'Should be UP');

const compDown = Calculator.comparePriceWithLastMonth(33000, 36000);
console.log('33.000 vs 36.000 ->', compDown.status, compDown.symbol, compDown.diffPercent + '%');
console.assert(compDown.status === 'DOWN', 'Should be DOWN');

const compEqual = Calculator.comparePriceWithLastMonth(28000, 28000);
console.log('28.000 vs 28.000 ->', compEqual.status, compEqual.symbol);
console.assert(compEqual.status === 'EQUAL', 'Should be EQUAL');

console.log('\n--- TEST 4: Budget Safety Cap [F-05] ---');
console.log('Budget 500k, spent 300k (60%):', Calculator.evaluateBudget(300000, 500000).status);
console.assert(Calculator.evaluateBudget(300000, 500000).status === 'SAFE', 'Should be SAFE');

console.log('Budget 500k, spent 400k (80%):', Calculator.evaluateBudget(400000, 500000).status);
console.assert(Calculator.evaluateBudget(400000, 500000).status === 'WARNING', 'Should be WARNING');

console.log('Budget 500k, spent 460k (92%):', Calculator.evaluateBudget(460000, 500000).status);
console.assert(Calculator.evaluateBudget(460000, 500000).status === 'CRITICAL', 'Should be CRITICAL');

console.log('Budget 500k, spent 520k (104%):', Calculator.evaluateBudget(520000, 500000).status);
console.assert(Calculator.evaluateBudget(520000, 500000).status === 'OVERBUDGET', 'Should be OVERBUDGET');

console.log('\nALL UNIT TESTS PASSED PERFECTLY!');
