/* shop.js */
(function () {
  const user = auth.require(['shop_owner', 'admin']);
  if (!user) return;

  document.getElementById('nav-name').textContent = user.name;

  // Shop ID - default 1 for demo; in production, derive from user's assigned shop
  const SHOP_ID = 1;

  let currentBeneficiary = null;
  let currentEntitlement = null;
  let html5QrCode        = null;

  // Load stock and alerts on start
  async function init() {
    await loadStock();
    await loadAlerts();
  }

  async function loadAlerts() {
    try {
      const alerts = await api.grievances.byShop(SHOP_ID);
      if (alerts && alerts.length > 0) {
        document.getElementById('admin-alerts-container').style.display = 'block';
        const body = document.getElementById('admin-alerts-body');
        body.innerHTML = alerts.map(a => `
          <div style="background:var(--surface); border:1px solid var(--accent); padding:1rem; border-radius:4px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
              <strong>${a.beneficiary_name} (${a.ration_card_no})</strong>
              <span class="meta-text">${new Date(a.submitted_at).toLocaleDateString('en-IN')}</span>
            </div>
            <p style="font-size:0.85rem; margin-bottom:0.5rem; opacity:0.8;">${a.subject}</p>
            <div style="background:rgba(231,76,60,0.08); padding:0.5rem; font-size:0.85rem; border-left:2px solid var(--accent);">
              <strong>Admin Note:</strong> ${a.admin_note}
            </div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.error('Failed to load alerts', e);
    }
  }

  async function loadStock() {
    try {
      const stock = await api.stock.byShop(SHOP_ID);
      renderStock(stock);
    } catch (e) {
      document.getElementById('stock-grid').innerHTML =
        '<p style="opacity:0.4; font-size:0.85rem;">Failed to load stock.</p>';
    }
  }

  function renderStock(stock) {
    const grid = document.getElementById('stock-grid');
    if (!stock.length) {
      grid.innerHTML = '<p style="opacity:0.4; font-size:0.85rem;">No stock data.</p>';
      return;
    }
    const latest = stock.reduce((acc, s) => { if (s.updated_at > (acc || '')) acc = s.updated_at; return acc; }, '');
    document.getElementById('stock-updated').textContent = latest
      ? 'Updated ' + new Date(latest).toLocaleDateString('en-IN')
      : '';

    const units = { Rice: 'kg', Wheat: 'kg', Sugar: 'kg', Oil: 'L' };
    grid.innerHTML = stock.map(s => `
      <div class="stock-card">
        <span class="label">${s.commodity}</span>
        <span class="qty">${s.quantity}</span>
        <span class="meta-text" style="display:block; margin-top:0.3rem;">${units[s.commodity] || 'kg'}</span>
      </div>`).join('');
  }

  // QR Scanner
  window.startScanner = async function () {
    document.getElementById('scanner-placeholder').style.display = 'none';
    const readerEl = document.getElementById('qr-reader');
    readerEl.style.display = 'block';

    html5QrCode = new Html5Qrcode('qr-reader');
    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          await html5QrCode.stop();
          readerEl.style.display = 'none';
          document.getElementById('scanner-placeholder').style.display = 'flex';
          document.getElementById('manual-card').value = decodedText;
          await lookupCard(decodedText);
        },
        () => {} // ignore scan failures
      );
    } catch (e) {
      readerEl.style.display = 'none';
      document.getElementById('scanner-placeholder').style.display = 'flex';
      showError('Camera access denied or not available. Use manual lookup.');
    }
  };

  window.manualLookup = async function () {
    const cardNo = document.getElementById('manual-card').value.trim().toUpperCase();
    if (!cardNo) return showError('Enter a ration card number.');
    await lookupCard(cardNo);
  };

  async function lookupCard(cardNo) {
    clearError();
    document.getElementById('verify-result').style.display = 'none';
    try {
      const ben = await api.beneficiaries.byCard(cardNo);
      currentBeneficiary = ben;

      document.getElementById('v-name').textContent   = ben.name;
      document.getElementById('v-card').textContent   = ben.ration_card_no;
      document.getElementById('v-cat').innerHTML      = `<span class="badge badge-${ben.category.toLowerCase()}">${ben.category}</span>`;
      document.getElementById('v-family').textContent = ben.family_size + ' members';

      // Load current month entitlement
      const entitlements = await api.entitlements.forBeneficiary(ben.id);
      const ent = entitlements[0] || null;
      currentEntitlement = ent;

      const entSection  = document.getElementById('ent-section');
      const entDetails  = document.getElementById('ent-details');
      const entStatus   = document.getElementById('ent-status');
      const collectBtn  = document.getElementById('collect-btn');
      entSection.style.display = 'block';

      if (!ent) {
        entDetails.innerHTML = '<p style="opacity:0.45; font-size:0.85rem;">No entitlement this month.</p>';
        entStatus.innerHTML  = '';
        collectBtn.style.display = 'none';
      } else {
        entDetails.innerHTML = `
          <div class="info-row"><span class="lbl">Rice</span><span>${ent.rice_kg} kg</span></div>
          <div class="info-row"><span class="lbl">Wheat</span><span>${ent.wheat_kg} kg</span></div>
          <div class="info-row"><span class="lbl">Sugar</span><span>${ent.sugar_kg} kg</span></div>
          <div class="info-row"><span class="lbl">Oil</span><span>${ent.oil_liters} L</span></div>`;

        if (ent.collected) {
          entStatus.innerHTML = `<span class="badge badge-collected">Completed</span>
            <span style="font-size:0.75rem; opacity:0.45; margin-left:0.75rem;">
              ${ent.collected_at ? new Date(ent.collected_at).toLocaleDateString('en-IN') : ''}
            </span>`;
          collectBtn.style.display = 'none';
        } else {
          entStatus.innerHTML = '<span class="badge badge-pending-ent">In Progress</span>';
          collectBtn.style.display = 'block';
        }
      }

      document.getElementById('verify-result').style.display = 'block';
    } catch (e) {
      showError(e.message === 'Ration card not found' ? 'No beneficiary found for this card number.' : e.message);
    }
  }

  window.markCollected = async function () {
    if (!currentEntitlement) return;
    const btn = document.getElementById('collect-btn');
    btn.textContent = 'Processing…';
    btn.disabled    = true;
    try {
      await api.entitlements.collect(currentEntitlement.id, SHOP_ID);
      document.getElementById('ent-status').innerHTML =
        `<span class="badge badge-collected">Completed</span>
         <span style="font-size:0.75rem; opacity:0.45; margin-left:0.75rem;">${new Date().toLocaleDateString('en-IN')}</span>`;
      btn.style.display = 'none';
      loadStock(); // refresh stock
    } catch (e) {
      btn.textContent = 'Give Groceries →';
      btn.disabled    = false;
      showError(e.message);
    }
  };

  // Stock update
  window.updateStock = async function () {
    const commodity = document.getElementById('upd-commodity').value;
    const quantity  = parseFloat(document.getElementById('upd-qty').value);
    const msg       = document.getElementById('stock-msg');
    msg.style.display = 'none';
    if (isNaN(quantity) || quantity < 0) return showStockMsg('Enter a valid quantity.', true);
    try {
      await api.stock.update({ shop_id: SHOP_ID, commodity, quantity });
      showStockMsg(`${commodity} updated to ${quantity} kg/L.`);
      loadStock();
    } catch (e) {
      showStockMsg(e.message, true);
    }
  };

  function showError(msg) {
    const el = document.getElementById('verify-err');
    el.textContent     = msg;
    el.style.display   = 'block';
  }
  function clearError() {
    document.getElementById('verify-err').style.display = 'none';
  }
  function showStockMsg(msg, isError) {
    const el = document.getElementById('stock-msg');
    el.textContent  = msg;
    el.className    = `alert ${isError ? 'alert-error' : 'alert-success'}`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  }

  init();
})();
