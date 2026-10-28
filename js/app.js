// Main App Controller & Event Orchestrator
const App = {
  editingItemId: null,
  deferredPwaPrompt: null,

  init() {
    this.setupTabNavigation();
    this.setupCategoryFilters();
    this.setupSessionMetaEvents();
    this.setupModalEvents();
    this.setupItemActionDelegation();
    this.setupPWA();
    this.setupReceiptModal();

    // Initial render
    UI.init();

    // Listen for Cloud and cross-tab updates to re-render UI in real time
    const handleStorageChange = (source) => {
      if (source === 'cloud') {
        console.log('[App] Realtime storage change triggered -> re-rendering UI');
        UI.renderAll();
      }
    };

    if (window.AppStorage && typeof window.AppStorage.onChange === 'function') {
      window.AppStorage.onChange(handleStorageChange);
    } else if (typeof Storage !== 'undefined' && typeof Storage.onChange === 'function') {
      Storage.onChange(handleStorageChange);
    }
  },

  /**
   * Bottom Navigation Tab Switching
   */
  setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });
  },

  switchTab(tabId) {
    UI.activeTab = tabId;

    // Update buttons
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // Update panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === tabId);
    });

    // Refresh view data
    if (tabId === 'tab-cart') {
      UI.renderBudgetCard();
      UI.renderCartList();
    } else if (tabId === 'tab-history') {
      UI.renderHistoryList();
    } else if (tabId === 'tab-budget') {
      UI.renderAnalytics();
    }
    renderIcons();
  },

  /**
   * Category Filter Pills
   */
  setupCategoryFilters() {
    const filterContainer = document.getElementById('categoryFilterBar');
    if (!filterContainer) return;

    filterContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip-filter');
      if (!chip) return;

      document.querySelectorAll('.chip-filter').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      UI.categoryFilter = chip.getAttribute('data-category');
      UI.renderCartList();
      renderIcons();
    });
  },

  /**
   * Realtime Event Handlers for Store Location & Date [F-07]
   */
  setupSessionMetaEvents() {
    const locInput = document.getElementById('inputStoreLocation');
    const dateInput = document.getElementById('inputShoppingDate');

    if (locInput) {
      locInput.value = Storage.getStoreLocation();
      locInput.addEventListener('input', () => {
        Storage.saveStoreLocation(locInput.value);
      });
      locInput.addEventListener('change', () => {
        Storage.saveStoreLocation(locInput.value);
      });
    }

    if (dateInput) {
      dateInput.value = Storage.getShoppingDate();
      dateInput.addEventListener('change', () => {
        Storage.saveShoppingDate(dateInput.value);
      });
    }
  },

  /**
   * Modal Bottom Sheet Controllers
   */
  setupModalEvents() {
    // Add Item FAB
    const fabAdd = document.getElementById('fabAddItem');
    if (fabAdd) fabAdd.addEventListener('click', () => this.openItemModal());

    // Close buttons for modals
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = btn.closest('.modal-overlay');
        if (modal) modal.classList.remove('open');
      });
    });

    // Outside click to close modal
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('open');
        }
      });
    });

    // Item form inputs - Realtime Calculation preview
    const formItem = document.getElementById('formItem');
    if (formItem) {
      formItem.addEventListener('input', () => this.updateModalLivePreview());

      // Autocomplete lookup on product name input
      const inputName = document.getElementById('inputItemName');
      if (inputName) {
        inputName.addEventListener('change', () => this.handleProductNameLookup(inputName.value));
        inputName.addEventListener('blur', () => this.handleProductNameLookup(inputName.value));
      }

      formItem.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveItemFromForm();
      });
    }

    // Quick discount preset chips
    document.querySelectorAll('.btn-discount-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const discValue = btn.getAttribute('data-discount');
        const inputDisc = document.getElementById('inputItemDiscount');
        if (inputDisc) {
          inputDisc.value = discValue;
          this.updateModalLivePreview();
        }
      });
    });

    // Budget form
    const formBudget = document.getElementById('formBudget');
    if (formBudget) {
      formBudget.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputCap = document.getElementById('inputBudgetCap');
        const val = Number(inputCap.value) || 0;
        Storage.saveBudget(val);
        document.getElementById('modalBudget').classList.remove('open');
        UI.renderBudgetCard();
        UI.renderAnalytics();
        UI.showToast(`Batas belanja diperbarui: ${Calculator.formatRupiah(val)}`);
      });
    }

    // Finish Shopping button
    const btnFinish = document.getElementById('btnFinishShopping');
    if (btnFinish) {
      btnFinish.addEventListener('click', () => this.handleFinishShopping());
    }
  },

  /**
   * Autocomplete / History catalog lookup
   */
  handleProductNameLookup(val) {
    if (!val || val.trim().length < 2) return;
    const match = Storage.lookupCatalog(val);
    if (match) {
      const inputLastPrice = document.getElementById('inputItemLastPrice');
      if (inputLastPrice && (!inputLastPrice.value || Number(inputLastPrice.value) === 0)) {
        inputLastPrice.value = match.lastPrice || 0;
      }

      // Check category radio
      const catRadio = document.querySelector(`input[name="itemCategory"][value="${match.category}"]`);
      if (catRadio) catRadio.checked = true;

      // Check unit radio
      const unitRadio = document.querySelector(`input[name="itemUnit"][value="${match.unit}"]`);
      if (unitRadio) unitRadio.checked = true;

      this.updateModalLivePreview();
      UI.showToast(`Data riwayat ditemukan: ${match.name} (Bln lalu: ${Calculator.formatRupiah(match.lastPrice)})`, 'sparkles');
    }
  },

  /**
   * Open Item Modal (Add or Edit)
   */
  openItemModal(itemId = null) {
    this.editingItemId = itemId;
    const modal = document.getElementById('modalItem');
    const titleEl = document.getElementById('modalItemTitle');
    const form = document.getElementById('formItem');

    if (!modal || !form) return;

    if (itemId) {
      // Edit mode
      titleEl.textContent = 'Edit Barang Belanja';
      const item = Storage.getCart().find(it => it.id === itemId);
      if (item) {
        document.getElementById('inputItemName').value = item.name;
        document.getElementById('inputItemQty').value = item.qty;
        document.getElementById('inputItemPrice').value = item.unitPrice;
        document.getElementById('inputItemLastPrice').value = item.lastMonthPrice || '';
        document.getElementById('inputItemDiscount').value = item.discount || '';
        document.getElementById('inputItemNotes').value = item.notes || '';

        const catRadio = document.querySelector(`input[name="itemCategory"][value="${item.category}"]`);
        if (catRadio) catRadio.checked = true;

        const unitRadio = document.querySelector(`input[name="itemUnit"][value="${item.unit}"]`);
        if (unitRadio) unitRadio.checked = true;
      }
    } else {
      // Add mode
      titleEl.textContent = 'Tambah Barang Belanja';
      form.reset();
      document.getElementById('inputItemQty').value = '1';
      document.querySelector('input[name="itemCategory"][value="Makanan Pokok"]').checked = true;
      document.querySelector('input[name="itemUnit"][value="pcs"]').checked = true;
    }

    this.updateModalLivePreview();
    modal.classList.add('open');
    setTimeout(() => {
      document.getElementById('inputItemName').focus();
    }, 200);
  },

  /**
   * Realtime Calculation Preview inside Add/Edit Item Modal
   * Calculates Tiered Discount [F-03], Line Item Subtotal [F-02], Price Comparison vs Last Month [F-04]
   */
  updateModalLivePreview() {
    const qty = Math.max(0.1, Number(document.getElementById('inputItemQty')?.value) || 1);
    const unitPrice = Math.max(0, Number(document.getElementById('inputItemPrice')?.value) || 0);
    const lastPrice = Math.max(0, Number(document.getElementById('inputItemLastPrice')?.value) || 0);
    const discountStr = document.getElementById('inputItemDiscount')?.value || '';

    const calc = Calculator.calculateItemTotal(qty, unitPrice, discountStr);
    const comparison = Calculator.comparePriceWithLastMonth(unitPrice, lastPrice);

    // Live preview elements
    const elSubtotal = document.getElementById('previewSubtotal');
    const elEffectiveUnit = document.getElementById('previewEffectiveUnit');
    const elComparison = document.getElementById('previewComparison');
    const elDiscountInfo = document.getElementById('previewDiscountInfo');

    if (elSubtotal) elSubtotal.textContent = Calculator.formatRupiah(calc.subtotal);
    if (elEffectiveUnit) elEffectiveUnit.textContent = `${Calculator.formatRupiah(calc.effectiveUnitPrice)} (dari ${Calculator.formatRupiah(unitPrice)})`;

    if (elComparison) {
      let icon = '';
      if (comparison.status === 'UP') icon = '↑';
      else if (comparison.status === 'DOWN') icon = '↓';
      else if (comparison.status === 'EQUAL') icon = '=';

      elComparison.innerHTML = `
        <span class="price-badge ${comparison.cssClass}" style="display: inline-flex;">
          ${icon} ${comparison.label} (${comparison.diffPercent > 0 ? comparison.diffPercent + '%' : 'Stabil'})
        </span>
        <span style="font-size: 11px; color: var(--text-muted); margin-left: 6px;">${comparison.text}</span>
      `;
    }

    if (elDiscountInfo) {
      if (calc.discountResult.discounts.length > 0) {
        const stepDesc = calc.discountResult.steps.map(s => `${s.percent}%`).join(' + ');
        elDiscountInfo.textContent = `Diskon: ${stepDesc} = Hemat ${Calculator.formatRupiah(calc.totalSaved)} (Efektif ${calc.discountResult.effectivePercent}%)`;
        elDiscountInfo.style.display = 'block';
      } else {
        elDiscountInfo.style.display = 'none';
      }
    }
  },

  /**
   * Save Item (Create or Update)
   */
  saveItemFromForm() {
    const name = document.getElementById('inputItemName').value.trim();
    if (!name) {
      alert('Nama produk tidak boleh kosong!');
      return;
    }

    const qty = Math.max(0.1, parseFloat(document.getElementById('inputItemQty').value) || 1);
    const unitPrice = Math.max(0, parseFloat(document.getElementById('inputItemPrice').value) || 0);
    const lastMonthPrice = Math.max(0, parseFloat(document.getElementById('inputItemLastPrice').value) || 0);
    const discount = document.getElementById('inputItemDiscount').value.trim();
    const notes = document.getElementById('inputItemNotes').value.trim();

    const categoryRadio = document.querySelector('input[name="itemCategory"]:checked');
    const category = categoryRadio ? categoryRadio.value : 'Makanan Pokok';

    const unitRadio = document.querySelector('input[name="itemUnit"]:checked');
    const unit = unitRadio ? unitRadio.value : 'pcs';

    if (this.editingItemId) {
      // Update existing item
      Storage.updateItem(this.editingItemId, {
        name,
        category,
        unit,
        qty,
        unitPrice,
        lastMonthPrice,
        discount,
        notes
      });
      UI.showToast(`Barang "${name}" diperbarui`);
    } else {
      // Add new item
      Storage.addItem({
        name,
        category,
        unit,
        qty,
        unitPrice,
        lastMonthPrice,
        discount,
        notes
      });
      UI.showToast(`"${name}" masuk ke daftar belanja!`);
    }

    document.getElementById('modalItem').classList.remove('open');
    UI.renderAll();
  },

  /**
   * Event delegation for cart item operations (+, -, check, edit, delete)
   */
  setupItemActionDelegation() {
    const cartList = document.getElementById('cartList');
    if (!cartList) return;

    cartList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      const cart = Storage.getCart();
      const item = cart.find(it => it.id === id);

      if (!item && action !== 'delete-item') return;

      if (action === 'step-up') {
        const newQty = Math.round((item.qty + 1) * 10) / 10;
        Storage.updateItem(id, { qty: newQty });
        UI.renderBudgetCard();
        UI.renderCartList();
        renderIcons();
      } else if (action === 'step-down') {
        if (item.qty > 1) {
          const newQty = Math.round((item.qty - 1) * 10) / 10;
          Storage.updateItem(id, { qty: newQty });
        } else if (item.qty > 0.1 && item.qty <= 1) {
          // Allow deletion if decreasing below 1
          if (confirm(`Hapus "${item.name}" dari keranjang?`)) {
            Storage.deleteItem(id);
            UI.showToast(`"${item.name}" dihapus`);
          }
        }
        UI.renderBudgetCard();
        UI.renderCartList();
        renderIcons();
      } else if (action === 'toggle-check') {
        Storage.updateItem(id, { checked: !item.checked });
        UI.renderCartList();
        renderIcons();
      } else if (action === 'edit-item') {
        this.openItemModal(id);
      } else if (action === 'delete-item') {
        if (confirm(`Hapus "${item ? item.name : 'barang ini'}" dari daftar belanja?`)) {
          Storage.deleteItem(id);
          UI.renderBudgetCard();
          UI.renderCartList();
          UI.updateBottomNavBadge();
          renderIcons();
          UI.showToast('Barang berhasil dihapus', 'trash-2');
        }
      }
    });

    // History Tab action delegation
    const historyList = document.getElementById('historyList');
    if (historyList) {
      historyList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');

        if (action === 'delete-history') {
          if (confirm('Hapus arsip riwayat belanja ini?')) {
            Storage.deleteHistorySession(id);
            UI.renderHistoryList();
            UI.renderAnalytics();
            renderIcons();
            UI.showToast('Riwayat berhasil dihapus');
          }
        } else if (action === 'view-receipt') {
          this.openReceiptModal(id);
        }
      });
    }
  },

  /**
   * Finish Shopping Workflow [F-06]
   * Finalizes session into History and updates future catalog prices
   */
  handleFinishShopping() {
    const cart = Storage.getCart();
    if (cart.length === 0) {
      alert('Keranjang belanja masih kosong!');
      return;
    }

    const uncheckedCount = cart.filter(it => !it.checked).length;
    let confirmMsg = `Selesaikan belanja bulanan (${cart.length} barang)?`;
    if (uncheckedCount > 0) {
      confirmMsg += `\nPerhatian: Ada ${uncheckedCount} barang yang belum dicentang di keranjang fisik. Tetap selesaikan?`;
    }

    if (confirm(confirmMsg)) {
      const session = Storage.finishShoppingSession();
      if (session) {
        UI.renderAll();
        this.switchTab('tab-history');
        UI.showToast('Belanja selesai & tersimpan ke riwayat!', 'check-circle-2');
        this.openReceiptModal(session.id);
      }
    }
  },

  /**
   * Budget Cap Modal
   */
  openBudgetModal() {
    const modal = document.getElementById('modalBudget');
    const input = document.getElementById('inputBudgetCap');
    if (!modal || !input) return;

    input.value = Storage.getBudget();
    modal.classList.add('open');
    setTimeout(() => input.focus(), 200);
  },

  /**
   * Receipt & WhatsApp Share Modal
   */
  setupReceiptModal() {
    const btnCopy = document.getElementById('btnCopyReceipt');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        const text = document.getElementById('receiptContent')?.innerText;
        if (text) {
          navigator.clipboard.writeText(text).then(() => {
            UI.showToast('Struk belanja berhasil disalin!', 'copy');
          });
        }
      });
    }
  },

  openReceiptModal(sessionId) {
    const session = Storage.getHistory().find(h => h.id === sessionId);
    if (!session) return;

    const modal = document.getElementById('modalReceipt');
    const contentEl = document.getElementById('receiptContent');
    if (!modal || !contentEl) return;

    const dateFormatted = new Date(session.date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let textReceipt = `*🛒 STRUK BELANJA BULANAN KOS*\n`;
    textReceipt += `📌 ${session.title}\n`;
    if (session.storeLocation) {
      textReceipt += `🏬 Lokasi: ${session.storeLocation}\n`;
    }
    textReceipt += `📅 Tanggal: ${dateFormatted}\n`;
    textReceipt += `--------------------------------\n`;

    session.items.forEach((it, idx) => {
      textReceipt += `${idx + 1}. ${it.name}\n`;
      textReceipt += `   ${it.qty} ${it.unit} x ${Calculator.formatRupiah(it.effectiveUnitPrice)} = ${Calculator.formatRupiah(it.subtotal)}\n`;
      if (it.discount) {
        textReceipt += `   (Disc ${it.discount}%, Hemat ${Calculator.formatRupiah(it.totalSaved)})\n`;
      }
    });

    textReceipt += `--------------------------------\n`;
    textReceipt += `💰 *TOTAL BELANJA:* ${Calculator.formatRupiah(session.totalSpent)}\n`;
    textReceipt += `🎯 *Batas Anggaran:* ${Calculator.formatRupiah(session.budgetCap)}\n`;
    const sisa = session.budgetCap - session.totalSpent;
    textReceipt += sisa >= 0 
      ? `✅ *Sisa Dompet:* ${Calculator.formatRupiah(sisa)}\n` 
      : `⚠️ *Defisit Dompet:* ${Calculator.formatRupiah(Math.abs(sisa))}\n`;
    if (session.totalSavings > 0) {
      textReceipt += `🎉 *Total Hemat Diskon:* ${Calculator.formatRupiah(session.totalSavings)}\n`;
    }
    textReceipt += `\nDicatat dengan Smart Grocery PWA 🚀`;

    contentEl.textContent = textReceipt;
    modal.classList.add('open');
  },

  /**
   * PWA Service Worker & Install Banner
   */
  setupPWA() {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('Service Worker registered:', reg.scope))
          .catch(err => console.log('SW registration error:', err));
      });
    }

    // Install prompt banner
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPwaPrompt = e;
      const banner = document.getElementById('pwaInstallBanner');
      if (banner) banner.style.display = 'flex';
    });

    const btnInstall = document.getElementById('btnInstallApp');
    if (btnInstall) {
      btnInstall.addEventListener('click', async () => {
        if (this.deferredPwaPrompt) {
          this.deferredPwaPrompt.prompt();
          const { outcome } = await this.deferredPwaPrompt.userChoice;
          console.log('PWA prompt outcome:', outcome);
          this.deferredPwaPrompt = null;
          const banner = document.getElementById('pwaInstallBanner');
          if (banner) banner.style.display = 'none';
        }
      });
    }
  }
};

// Initialize App on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
