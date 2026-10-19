// LocalStorage & Offline Database Manager for Smart Grocery PWA
const STORAGE_KEYS = {
  CART: 'smart_grocery_active_cart',
  BUDGET: 'smart_grocery_budget_cap',
  CATALOG: 'smart_grocery_price_catalog',
  HISTORY: 'smart_grocery_history_sessions',
  SETTINGS: 'smart_grocery_settings'
};

const SEED_CATALOG = {
  'beras ramos 5kg': { name: 'Beras Ramos 5kg', category: 'Makanan Pokok', unit: 'pack', lastPrice: 72000 },
  'telur ayam negeri': { name: 'Telur Ayam Negeri', category: 'Makanan Pokok', unit: 'kg', lastPrice: 28000 },
  'minyak goreng 2l': { name: 'Minyak Goreng 2L', category: 'Bumbu & Dapur', unit: 'liter', lastPrice: 36000 },
  'indomie goreng (5 pcs)': { name: 'Indomie Goreng (5 pcs)', category: 'Makanan Pokok', unit: 'pack', lastPrice: 15500 },
  'sabun cuci piring 780ml': { name: 'Sabun Cuci Piring 780ml', category: 'Kebersihan Kos', unit: 'pack', lastPrice: 12000 },
  'deterjen bubuk 800g': { name: 'Deterjen Bubuk 800g', category: 'Kebersihan Kos', unit: 'pack', lastPrice: 22500 },
  'sabun mandi cair refill': { name: 'Sabun Mandi Cair Refill', category: 'Kebutuhan Mandi', unit: 'pack', lastPrice: 21000 },
  'pasta gigi pepsodent 190g': { name: 'Pasta Gigi Pepsodent 190g', category: 'Kebutuhan Mandi', unit: 'pcs', lastPrice: 16500 },
  'shampo anti ketombe 160ml': { name: 'Shampo Anti Ketombe 160ml', category: 'Kebutuhan Mandi', unit: 'pcs', lastPrice: 27000 },
  'air mineral galon': { name: 'Air Mineral Galon', category: 'Makanan Pokok', unit: 'pcs', lastPrice: 20000 },
  'kopi sachet (10 pcs)': { name: 'Kopi Sachet (10 pcs)', category: 'Snack & Minuman', unit: 'pack', lastPrice: 14500 },
  'biskuit gandum': { name: 'Biskuit Gandum', category: 'Snack & Minuman', unit: 'pack', lastPrice: 10500 },
  'bawang merah 250g': { name: 'Bawang Merah 250g', category: 'Bumbu & Dapur', unit: 'kg', lastPrice: 12500 },
  'kecap manis 520ml': { name: 'Kecap Manis 520ml', category: 'Bumbu & Dapur', unit: 'pack', lastPrice: 18000 }
};

const SEED_HISTORY = [
  {
    id: 'hist-2026-09',
    title: 'Belanja Bulanan Kos - September 2026',
    date: '2026-09-05T14:30:00.000Z',
    budgetCap: 500000,
    totalSpent: 425000,
    totalSavings: 45000,
    itemCount: 8,
    items: [
      { name: 'Beras Ramos 5kg', category: 'Makanan Pokok', unit: 'pack', qty: 1, unitPrice: 72000, lastMonthPrice: 70000, discount: '', subtotal: 72000 },
      { name: 'Telur Ayam Negeri', category: 'Makanan Pokok', unit: 'kg', qty: 2, unitPrice: 28000, lastMonthPrice: 27000, discount: '', subtotal: 56000 },
      { name: 'Minyak Goreng 2L', category: 'Bumbu & Dapur', unit: 'liter', qty: 1, unitPrice: 36000, lastMonthPrice: 38000, discount: '', subtotal: 36000 },
      { name: 'Indomie Goreng (5 pcs)', category: 'Makanan Pokok', unit: 'pack', qty: 3, unitPrice: 15500, lastMonthPrice: 15000, discount: '', subtotal: 46500 },
      { name: 'Deterjen Bubuk 800g', category: 'Kebersihan Kos', unit: 'pack', qty: 1, unitPrice: 22500, lastMonthPrice: 24000, discount: '10', subtotal: 20250 },
      { name: 'Sabun Mandi Cair Refill', category: 'Kebutuhan Mandi', unit: 'pack', qty: 2, unitPrice: 21000, lastMonthPrice: 21000, discount: '', subtotal: 42000 },
      { name: 'Shampo Anti Ketombe 160ml', category: 'Kebutuhan Mandi', unit: 'pcs', qty: 1, unitPrice: 27000, lastMonthPrice: 28000, discount: '50+20', subtotal: 10800 },
      { name: 'Air Mineral Galon', category: 'Makanan Pokok', unit: 'pcs', qty: 3, unitPrice: 20000, lastMonthPrice: 20000, discount: '', subtotal: 60000 }
    ]
  }
];

const SEED_ACTIVE_CART = [
  {
    id: 'item-1',
    name: 'Beras Ramos 5kg',
    category: 'Makanan Pokok',
    unit: 'pack',
    qty: 1,
    unitPrice: 75000,      // Naik vs 72.000 -> Red arrow ↑
    lastMonthPrice: 72000,
    discount: '',
    checked: true,
    notes: 'Merk langganan'
  },
  {
    id: 'item-2',
    name: 'Minyak Goreng 2L',
    category: 'Bumbu & Dapur',
    unit: 'liter',
    qty: 1,
    unitPrice: 33000,      // Turun vs 36.000 -> Green arrow ↓
    lastMonthPrice: 36000,
    discount: '',
    checked: true,
    notes: 'Promo awal bulan'
  },
  {
    id: 'item-3',
    name: 'Telur Ayam Negeri',
    category: 'Makanan Pokok',
    unit: 'kg',
    qty: 1.5,
    unitPrice: 28000,      // Tetap vs 28.000 -> Equal icon =
    lastMonthPrice: 28000,
    discount: '',
    checked: false,
    notes: 'Pilih yang cangkang coklat tua'
  },
  {
    id: 'item-4',
    name: 'Shampo Anti Ketombe 160ml',
    category: 'Kebutuhan Mandi',
    unit: 'pcs',
    qty: 1,
    unitPrice: 30000,      // Diskon bertumpuk 50% + 20%
    lastMonthPrice: 27000,
    discount: '50+20',     // 30.000 * 0.5 * 0.8 = 12.000
    checked: false,
    notes: 'Promo Supermarket 50%+20%'
  }
];

const Storage = {
  _listeners: [],

  onChange(cb) {
    if (typeof cb === 'function') {
      this._listeners.push(cb);
    }
  },

  notifyChange(source = 'local') {
    this._listeners.forEach(cb => {
      try {
        cb(source);
      } catch (e) {
        console.error('Storage onChange listener error:', e);
      }
    });
  },

  getAllData() {
    return {
      budget: this.getBudget(),
      cart: this.getCart(),
      catalog: this.getCatalog(),
      history: this.getHistory()
    };
  },

  applyCloudUpdate(cloudData) {
    if (!cloudData || typeof cloudData !== 'object') return false;
    let changed = false;

    if (Array.isArray(cloudData.cart)) {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cloudData.cart));
      changed = true;
    }
    if (cloudData.budget !== undefined && cloudData.budget !== null) {
      localStorage.setItem(STORAGE_KEYS.BUDGET, String(cloudData.budget));
      changed = true;
    }
    if (cloudData.catalog && typeof cloudData.catalog === 'object') {
      localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(cloudData.catalog));
      changed = true;
    }
    if (Array.isArray(cloudData.history)) {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(cloudData.history));
      changed = true;
    }

    if (changed) {
      this.notifyChange('cloud');
    }
    return changed;
  },

  // Initialize storage with seeds if first time
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.CATALOG)) {
      localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(SEED_CATALOG));
    }
    if (!localStorage.getItem(STORAGE_KEYS.HISTORY)) {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(SEED_HISTORY));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BUDGET)) {
      localStorage.setItem(STORAGE_KEYS.BUDGET, '500000'); // Rp 500.000 default budget siswa rantau
    }
    if (!localStorage.getItem(STORAGE_KEYS.CART)) {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(SEED_ACTIVE_CART));
    }
  },

  // Active Cart Operations
  getCart() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CART);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading cart', e);
      return [];
    }
  },

  saveCart(cart) {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    this.notifyChange('local');
  },

  addItem(item) {
    const cart = this.getCart();
    const newItem = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name: item.name.trim(),
      category: item.category || 'Makanan Pokok',
      unit: item.unit || 'pcs',
      qty: Math.max(0.1, Number(item.qty) || 1),
      unitPrice: Math.max(0, Number(item.unitPrice) || 0),
      lastMonthPrice: Math.max(0, Number(item.lastMonthPrice) || 0),
      discount: (item.discount || '').trim(),
      checked: !!item.checked,
      notes: (item.notes || '').trim()
    };
    cart.unshift(newItem);
    this.saveCart(cart);

    // Also update catalog with this price
    this.updateCatalogItem(newItem.name, {
      category: newItem.category,
      unit: newItem.unit,
      lastPrice: newItem.unitPrice
    });

    return newItem;
  },

  updateItem(id, updates) {
    const cart = this.getCart();
    const index = cart.findIndex(it => it.id === id);
    if (index !== -1) {
      cart[index] = { ...cart[index], ...updates };
      this.saveCart(cart);
      return cart[index];
    }
    return null;
  },

  deleteItem(id) {
    const cart = this.getCart().filter(it => it.id !== id);
    this.saveCart(cart);
    return cart;
  },

  clearCart() {
    this.saveCart([]);
  },

  // Budget Cap Operations
  getBudget() {
    const b = localStorage.getItem(STORAGE_KEYS.BUDGET);
    return b ? Number(b) : 500000;
  },

  saveBudget(amount) {
    const val = Math.max(0, Number(amount) || 0);
    localStorage.setItem(STORAGE_KEYS.BUDGET, val.toString());
    this.notifyChange('local');
    return val;
  },

  // Catalog / Autocomplete Database Operations
  getCatalog() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATALOG);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  },

  lookupCatalog(productName) {
    if (!productName) return null;
    const catalog = this.getCatalog();
    const key = productName.trim().toLowerCase();
    
    // Direct match
    if (catalog[key]) return catalog[key];

    // Partial search
    for (const [catKey, val] of Object.entries(catalog)) {
      if (catKey.includes(key) || key.includes(catKey)) {
        return val;
      }
    }
    return null;
  },

  updateCatalogItem(name, data) {
    if (!name) return;
    const catalog = this.getCatalog();
    const key = name.trim().toLowerCase();
    catalog[key] = {
      name: name.trim(),
      category: data.category || 'Makanan Pokok',
      unit: data.unit || 'pcs',
      lastPrice: Number(data.lastPrice) || 0,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(catalog));
    this.notifyChange('local');
  },

  // Shopping History Operations
  getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Finalize current cart and archive into History
   * Updates Catalog so current prices become "Last Month's Price" for future trips!
   */
  finishShoppingSession(sessionTitle) {
    const cart = this.getCart();
    if (cart.length === 0) return null;

    const budget = this.getBudget();
    let totalSpent = 0;
    let totalSavings = 0;

    const sessionItems = cart.map(item => {
      const totalInfo = Calculator.calculateItemTotal(item.qty, item.unitPrice, item.discount);
      totalSpent += totalInfo.subtotal;
      totalSavings += totalInfo.totalSaved;

      // Update Catalog so current price becomes next month's historical reference!
      this.updateCatalogItem(item.name, {
        category: item.category,
        unit: item.unit,
        lastPrice: totalInfo.effectiveUnitPrice
      });

      return {
        name: item.name,
        category: item.category,
        unit: item.unit,
        qty: item.qty,
        unitPrice: item.unitPrice,
        effectiveUnitPrice: totalInfo.effectiveUnitPrice,
        lastMonthPrice: item.lastMonthPrice,
        discount: item.discount,
        subtotal: totalInfo.subtotal,
        totalSaved: totalInfo.totalSaved
      };
    });

    const now = new Date();
    const defaultTitle = `Belanja Bulanan - ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;

    const newSession = {
      id: 'hist-' + Date.now(),
      title: sessionTitle || defaultTitle,
      date: now.toISOString(),
      budgetCap: budget,
      totalSpent,
      totalSavings,
      itemCount: cart.length,
      items: sessionItems
    };

    const history = this.getHistory();
    history.unshift(newSession);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));

    // Clear active cart for the next shopping trip
    this.clearCart();

    return newSession;
  },

  deleteHistorySession(id) {
    const history = this.getHistory().filter(h => h.id !== id);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    this.notifyChange('local');
    return history;
  },

  exportDataJSON() {
    const exportObj = {
      cart: this.getCart(),
      budget: this.getBudget(),
      catalog: this.getCatalog(),
      history: this.getHistory(),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(exportObj, null, 2);
  },

  importDataJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.cart) localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(parsed.cart));
      if (parsed.budget) localStorage.setItem(STORAGE_KEYS.BUDGET, String(parsed.budget));
      if (parsed.catalog) localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(parsed.catalog));
      if (parsed.history) localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(parsed.history));
      this.notifyChange('local');
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  },

  resetToDefault() {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(SEED_ACTIVE_CART));
    localStorage.setItem(STORAGE_KEYS.BUDGET, '500000');
    localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(SEED_CATALOG));
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(SEED_HISTORY));
    this.notifyChange('local');
  }
};

// Auto initialize upon load
Storage.init();
