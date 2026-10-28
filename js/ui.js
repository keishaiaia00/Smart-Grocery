// UI Rendering & Interaction Manager
const UI = {
  activeTab: 'tab-cart',
  categoryFilter: 'all',

  init() {
    this.renderAll();
  },

  renderAll() {
    this.renderBudgetCard();
    this.renderSessionMeta();
    this.renderCartList();
    this.renderHistoryList();
    this.renderAnalytics();
    this.updateBottomNavBadge();
    renderIcons();
  },

  /**
   * Render Store Location & Shopping Date
   */
  renderSessionMeta() {
    const locInput = document.getElementById('inputStoreLocation');
    const dateInput = document.getElementById('inputShoppingDate');
    if (locInput && document.activeElement !== locInput) {
      locInput.value = Storage.getStoreLocation();
    }
    if (dateInput && document.activeElement !== dateInput) {
      dateInput.value = Storage.getShoppingDate();
    }
  },

  /**
   * Render Top Budget Safety Cap Card [F-05]
   */
  renderBudgetCard() {
    const budgetCap = Storage.getBudget();
    const cart = Storage.getCart();

    let totalCart = 0;
    cart.forEach(item => {
      const calc = Calculator.calculateItemTotal(item.qty, item.unitPrice, item.discount);
      totalCart += calc.subtotal;
    });

    const budgetInfo = Calculator.evaluateBudget(totalCart, budgetCap);
    const cardEl = document.getElementById('budgetCard');
    if (!cardEl) return;

    // Reset status classes
    cardEl.className = `budget-card ${budgetInfo.cssClass}`;

    // Badge styling
    let badgeClass = 'badge-safe';
    if (budgetInfo.status === 'WARNING') badgeClass = 'badge-warning';
    if (budgetInfo.status === 'CRITICAL') badgeClass = 'badge-critical';
    if (budgetInfo.status === 'OVERBUDGET') badgeClass = 'badge-over';

    // Bar fill styling
    let barFillClass = 'bar-safe';
    if (budgetInfo.status === 'WARNING') barFillClass = 'bar-warning';
    if (budgetInfo.status === 'CRITICAL') barFillClass = 'bar-critical';
    if (budgetInfo.status === 'OVERBUDGET') barFillClass = 'bar-over';

    const remainingText = budgetInfo.remaining < 0 
      ? `- ${Calculator.formatRupiah(Math.abs(budgetInfo.remaining))}`
      : Calculator.formatRupiah(budgetInfo.remaining);

    cardEl.innerHTML = `
      <div class="budget-header">
        <div class="budget-label-group">
          <span class="budget-badge ${badgeClass}">
            ${budgetInfo.status === 'OVERBUDGET' ? getIcon('shield-alert') : getIcon('wallet')}
            ${budgetInfo.badge}
          </span>
        </div>
        <button class="btn-edit-budget" id="btnOpenBudgetModal">
          ${getIcon('edit-3')} Ubah Limit
        </button>
      </div>

      <div class="budget-amounts">
        <div class="spent-col">
          <div class="spent-title">Total Keranjang</div>
          <div class="spent-val">${Calculator.formatRupiah(totalCart)}</div>
        </div>
        <div class="remaining-col ${budgetInfo.remaining < 0 ? 'is-negative' : ''}">
          <div class="remaining-title">${budgetInfo.remaining < 0 ? 'Defisit Dompet' : 'Sisa Dompet'}</div>
          <div class="remaining-val">${remainingText}</div>
        </div>
      </div>

      <div class="budget-bar-track">
        <div class="budget-bar-fill ${barFillClass}" style="width: ${Math.min(100, budgetInfo.percent)}%;"></div>
      </div>

      <div class="budget-footer-text">
        <span>Batas Belanja: <strong>${Calculator.formatRupiah(budgetCap)}</strong></span>
        <span>Terpakai: <strong>${budgetInfo.percent}%</strong></span>
      </div>
    `;

    // Dock bar at the bottom of cart view
    const dockTotal = document.getElementById('dockTotalPrice');
    const dockCount = document.getElementById('dockItemsCount');
    if (dockTotal) dockTotal.textContent = Calculator.formatRupiah(totalCart);
    if (dockCount) dockCount.textContent = `${cart.length} barang terdaftar`;

    // Reattach listener
    const editBtn = document.getElementById('btnOpenBudgetModal');
    if (editBtn) {
      editBtn.addEventListener('click', () => App.openBudgetModal());
    }
  },

  /**
   * Render Active Shopping Cart Items [F-01, F-02, F-03, F-04]
   */
  renderCartList() {
    const listEl = document.getElementById('cartList');
    if (!listEl) return;

    let cart = Storage.getCart();

    // Filter by Category
    if (this.categoryFilter !== 'all') {
      cart = cart.filter(it => it.category === this.categoryFilter);
    }

    if (cart.length === 0) {
      listEl.innerHTML = `
        <div class="cart-empty-state">
          <div class="empty-icon" data-icon="shopping-bag"></div>
          <div class="empty-title">Keranjang Belanja Kosong</div>
          <div class="empty-desc">Tekan tombol <strong>+ Tambah</strong> di bawah untuk mulai mencatat barang belanjaan bulananmu.</div>
          <button class="btn-submit-modal" style="width: auto; margin: 0 auto; padding: 10px 20px; font-size: 14px;" id="btnEmptyAdd">
            ${getIcon('plus')} Tambah Barang Baru
          </button>
        </div>
      `;
      const btn = document.getElementById('btnEmptyAdd');
      if (btn) btn.addEventListener('click', () => App.openItemModal());
      return;
    }

    let html = '';
    cart.forEach(item => {
      // Calculations
      const calc = Calculator.calculateItemTotal(item.qty, item.unitPrice, item.discount);
      const comparison = Calculator.comparePriceWithLastMonth(item.unitPrice, item.lastMonthPrice);

      // Fluctuation Badge Icon & Label [F-04]
      let compIcon = '';
      if (comparison.status === 'UP') compIcon = getIcon('arrow-up');
      else if (comparison.status === 'DOWN') compIcon = getIcon('arrow-down');
      else if (comparison.status === 'EQUAL') compIcon = getIcon('equal');

      let comparisonBadge = `
        <span class="price-badge ${comparison.cssClass}" title="${comparison.text}">
          ${compIcon} ${comparison.label} ${comparison.diffPercent > 0 ? comparison.diffPercent + '%' : ''}
        </span>
      `;

      // Tiered Discount Badge [F-03]
      let discountBadge = '';
      if (calc.discountResult.discounts.length > 0) {
        discountBadge = `
          <span class="discount-badge" title="Diskon bertumpuk: ${item.discount}">
            ${getIcon('percent')} Disc ${item.discount}% (Hemat ${Calculator.formatRupiah(calc.totalSaved)})
          </span>
        `;
      }

      html += `
        <div class="item-card ${item.checked ? 'is-checked' : ''}" data-id="${item.id}">
          <div class="item-header">
            <button class="cart-check-btn ${item.checked ? 'checked' : ''}" data-action="toggle-check" data-id="${item.id}" title="Centang jika sudah dimasukkan ke troli">
              ${item.checked ? getIcon('check') : ''}
            </button>

            <div class="item-info">
              <div class="item-name-row">
                <span class="item-name">${item.name}</span>
                <div class="item-options">
                  <button class="btn-item-action" data-action="edit-item" data-id="${item.id}" title="Edit barang">
                    ${getIcon('edit-3')}
                  </button>
                  <button class="btn-item-action delete" data-action="delete-item" data-id="${item.id}" title="Hapus barang">
                    ${getIcon('trash-2')}
                  </button>
                </div>
              </div>

              <div>
                <span class="item-category-tag">${item.category}</span>
                ${item.notes ? `<span style="font-size: 11px; color: var(--text-dim); margin-left: 6px;">• ${item.notes}</span>` : ''}
              </div>

              <div class="item-price-meta">
                <span class="unit-price-text">${Calculator.formatRupiah(calc.effectiveUnitPrice)}/${item.unit}</span>
                ${calc.discountResult.discounts.length > 0 ? `<span class="discount-strike">${Calculator.formatRupiah(item.unitPrice)}</span>` : ''}
                ${comparisonBadge}
                ${discountBadge}
              </div>
            </div>
          </div>

          <div class="item-bottom-row">
            <!-- Large Mobile Stepper [F-02] -->
            <div class="qty-stepper">
              <button class="btn-stepper" data-action="step-down" data-id="${item.id}" title="Kurangi Qty">
                ${getIcon('minus')}
              </button>
              <div class="qty-display">
                ${item.qty} <span class="qty-unit-label">${item.unit}</span>
              </div>
              <button class="btn-stepper" data-action="step-up" data-id="${item.id}" title="Tambah Qty">
                ${getIcon('plus')}
              </button>
            </div>

            <!-- Subtotal Box [F-02] -->
            <div class="item-subtotal-box">
              <div class="subtotal-label">Subtotal</div>
              <div class="subtotal-amount">${Calculator.formatRupiah(calc.subtotal)}</div>
            </div>
          </div>
        </div>
      `;
    });

    listEl.innerHTML = html;
  },

  /**
   * Render History Tab [F-06]
   */
  renderHistoryList() {
    const historyListEl = document.getElementById('historyList');
    if (!historyListEl) return;

    const history = Storage.getHistory();
    if (history.length === 0) {
      historyListEl.innerHTML = `
        <div class="cart-empty-state">
          <div class="empty-icon" data-icon="history"></div>
          <div class="empty-title">Belum Ada Riwayat Belanja</div>
          <div class="empty-desc">Saat kamu menekan tombol <strong>"Selesaikan Belanja"</strong> di keranjang, riwayat belanjamu akan tercatat di sini dan menjadi acuan harga otomatis untuk bulan depan!</div>
        </div>
      `;
      return;
    }

    let html = '';
    history.forEach(session => {
      const dateFormatted = new Date(session.date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      const itemsPreview = (session.items || []).slice(0, 3).map(it => `
        <div class="history-item-line">
          <span>${it.name} (${it.qty} ${it.unit})</span>
          <span>${Calculator.formatRupiah(it.subtotal)}</span>
        </div>
      `).join('');

      const moreCount = (session.items || []).length > 3 ? (session.items.length - 3) : 0;

      html += `
        <div class="history-card">
          <div class="history-card-header">
            <div>
              <div class="history-title">${session.title}</div>
              <div class="history-date">${getIcon('history')} ${dateFormatted} • ${session.itemCount} Barang</div>
            </div>
            <div class="history-badge-spent">${Calculator.formatRupiah(session.totalSpent)}</div>
          </div>

          <div class="history-details-list">
            ${itemsPreview}
            ${moreCount > 0 ? `<div style="text-align: center; color: var(--text-dim); font-size: 11px; padding-top: 4px;">+ ${moreCount} barang lainnya...</div>` : ''}
          </div>

          <div class="history-actions-row">
            <button class="btn-history-action primary" data-action="view-receipt" data-id="${session.id}">
              ${getIcon('download')} Struk / Bagikan
            </button>
            <button class="btn-history-action" data-action="delete-history" data-id="${session.id}">
              ${getIcon('trash-2')} Hapus
            </button>
          </div>
        </div>
      `;
    });

    historyListEl.innerHTML = html;
  },

  /**
   * Render Anggaran Tab (Analytics & Overview)
   */
  renderAnalytics() {
    const budgetCap = Storage.getBudget();
    const cart = Storage.getCart();
    const history = Storage.getHistory();

    let currentTotal = 0;
    let totalSavings = 0;
    const catTotals = {};

    cart.forEach(item => {
      const calc = Calculator.calculateItemTotal(item.qty, item.unitPrice, item.discount);
      currentTotal += calc.subtotal;
      totalSavings += calc.totalSaved;

      catTotals[item.category] = (catTotals[item.category] || 0) + calc.subtotal;
    });

    const elCurrentTotal = document.getElementById('statCurrentTotal');
    const elBudgetCap = document.getElementById('statBudgetCap');
    const elTotalSavings = document.getElementById('statTotalSavings');
    const elSessionsCount = document.getElementById('statSessionsCount');

    if (elCurrentTotal) elCurrentTotal.textContent = Calculator.formatRupiah(currentTotal);
    if (elBudgetCap) elBudgetCap.textContent = Calculator.formatRupiah(budgetCap);
    if (elTotalSavings) elTotalSavings.textContent = Calculator.formatRupiah(totalSavings);
    if (elSessionsCount) elSessionsCount.textContent = `${history.length} Sesi`;

    // Render category progress breakdown
    const catContainer = document.getElementById('catBreakdownContainer');
    if (catContainer) {
      const categories = Object.keys(catTotals);
      if (categories.length === 0) {
        catContainer.innerHTML = `<div style="color: var(--text-dim); font-size: 12px; text-align: center; padding: 10px;">Belum ada data barang di keranjang aktif.</div>`;
      } else {
        let catHtml = '';
        categories.sort((a, b) => catTotals[b] - catTotals[a]).forEach(cat => {
          const amount = catTotals[cat];
          const pct = currentTotal > 0 ? Math.round((amount / currentTotal) * 100) : 0;
          catHtml += `
            <div class="cat-progress-item">
              <div class="cat-progress-label">
                <span>${cat}</span>
                <span>${Calculator.formatRupiah(amount)} (${pct}%)</span>
              </div>
              <div class="cat-progress-track">
                <div class="cat-progress-fill" style="width: ${pct}%;"></div>
              </div>
            </div>
          `;
        });
        catContainer.innerHTML = catHtml;
      }
    }
  },

  updateBottomNavBadge() {
    const cart = Storage.getCart();
    const badge = document.getElementById('cartNavBadge');
    if (badge) {
      if (cart.length > 0) {
        badge.textContent = cart.length;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  },

  showToast(message, iconName = 'check') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `${getIcon(iconName)} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
};
