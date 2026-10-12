// Mathematical & Financial Calculation Engine
const Calculator = {
  /**
   * Format number to Indonesian Rupiah currency string
   * e.g. 50000 -> "Rp 50.000"
   */
  formatRupiah(value) {
    if (value === null || value === undefined || isNaN(value)) return 'Rp 0';
    const rounded = Math.round(Number(value));
    return 'Rp ' + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  },

  /**
   * Parse user discount input string
   * Supports: "25", "25%", "50+20", "50% + 20%", "30 + 10 + 5", "50,20"
   * Returns array of discount percentages e.g. [50, 20]
   */
  parseDiscountString(input) {
    if (!input || typeof input !== 'string') return [];
    // Clean string and split by +, comma, or slash
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

  /**
   * Calculate tiered discount on unit price
   * Formula: Final = Original * (1 - d1) * (1 - d2) * ...
   * e.g. Rp 100.000 with 50+20 => 100.000 * 0.5 * 0.8 = Rp 40.000 (hemat 60%, NOT 70%)
   */
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

  /**
   * Calculate line item total price based on unit price, discount, and quantity
   */
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

  /**
   * Price Fluctuation Comparator vs Last Month
   * Visual indicators: UP (↑ Red), DOWN (↓ Green), EQUAL (= Gray)
   */
  comparePriceWithLastMonth(currentPrice, lastMonthPrice) {
    const current = Math.max(0, Number(currentPrice) || 0);
    const prev = Math.max(0, Number(lastMonthPrice) || 0);

    if (prev <= 0) {
      return {
        status: 'NEW',
        symbol: '★',
        label: 'Baru',
        diffAmount: 0,
        diffPercent: 0,
        cssClass: 'price-new',
        text: 'Item Baru (Belum ada data bulan lalu)'
      };
    }

    const diffAmount = current - prev;
    const diffPercent = ((diffAmount / prev) * 100).toFixed(1);

    if (diffAmount > 0) {
      return {
        status: 'UP',
        symbol: '↑',
        iconName: 'arrow-up',
        label: 'Naik',
        diffAmount: Math.abs(diffAmount),
        diffPercent: Math.abs(Number(diffPercent)),
        cssClass: 'price-up',
        text: `Naik Rp ${Math.abs(diffAmount).toLocaleString('id-ID')} (+${Math.abs(diffPercent)}%) vs bln lalu`
      };
    } else if (diffAmount < 0) {
      return {
        status: 'DOWN',
        symbol: '↓',
        iconName: 'arrow-down',
        label: 'Turun',
        diffAmount: Math.abs(diffAmount),
        diffPercent: Math.abs(Number(diffPercent)),
        cssClass: 'price-down',
        text: `Hemat Rp ${Math.abs(diffAmount).toLocaleString('id-ID')} (-${Math.abs(diffPercent)}%) vs bln lalu`
      };
    } else {
      return {
        status: 'EQUAL',
        symbol: '=',
        iconName: 'equal',
        label: 'Stabil',
        diffAmount: 0,
        diffPercent: 0,
        cssClass: 'price-equal',
        text: 'Harga stabil sama persis dengan bulan lalu'
      };
    }
  },

  /**
   * Budget Safety Cap Evaluator
   */
  evaluateBudget(totalCart, budgetCap) {
    const total = Math.max(0, Number(totalCart) || 0);
    const cap = Math.max(0, Number(budgetCap) || 0);

    if (cap <= 0) {
      return {
        hasCap: false,
        total,
        cap: 0,
        percent: 0,
        remaining: 0,
        status: 'NO_CAP',
        badge: 'Tanpa Limit',
        cssClass: 'budget-neutral',
        message: 'Atur batas dompet agar belanjaan tidak bablas!'
      };
    }

    const percent = Math.min(200, ((total / cap) * 100).toFixed(1));
    const remaining = cap - total;

    let status = 'SAFE';
    let badge = 'Aman';
    let cssClass = 'budget-safe';
    let message = `Sisa kuota: ${this.formatRupiah(remaining)}`;

    if (total > cap) {
      status = 'OVERBUDGET';
      badge = 'OVER BUDGET!';
      cssClass = 'budget-over';
      message = `LEBIH ${this.formatRupiah(Math.abs(remaining))}! Harap kurangi belanjaan!`;
    } else if (percent >= 90) {
      status = 'CRITICAL';
      badge = 'Kritis (≥90%)';
      cssClass = 'budget-critical';
      message = `Waspada! Sisa hanya ${this.formatRupiah(remaining)}!`;
    } else if (percent >= 75) {
      status = 'WARNING';
      badge = 'Siaga (≥75%)';
      cssClass = 'budget-warning';
      message = `Mendekati limit! Sisa ${this.formatRupiah(remaining)}`;
    }

    return {
      hasCap: true,
      total,
      cap,
      percent: Number(percent),
      remaining,
      status,
      badge,
      cssClass,
      message
    };
  }
};
