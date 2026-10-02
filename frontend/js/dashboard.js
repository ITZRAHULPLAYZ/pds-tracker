/* dashboard.js */
(function () {
  const user = auth.require(['beneficiary']);
  if (!user) return;

  document.getElementById('nav-name').textContent = user.name;

  const now = new Date();
  const monthLabel = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  document.getElementById('dash-month').textContent = monthLabel;

  let profile = null;

  async function init() {
    try {
      profile = await api.beneficiaries.me();
      renderCard(profile);
      generateQR(profile.ration_card_no);

      const entitlements = await api.entitlements.me();
      renderEntitlements(entitlements);
      renderHistory(entitlements);
    } catch (e) {
      alert('Failed to load profile: ' + e.message);
    } finally {
      document.getElementById('main-loading').style.display = 'none';
      document.getElementById('main-content').style.display  = 'block';
    }
  }

  function renderCard(p) {
    document.getElementById('dash-name').textContent  = p.name;
    document.getElementById('card-no').textContent    = p.ration_card_no;
    document.getElementById('card-name').textContent  = p.name;
    document.getElementById('card-family').textContent= p.family_size + ' members';
    document.getElementById('card-phone').textContent = p.phone || '—';
    document.getElementById('card-shop').textContent  = p.shop_name || 'Not assigned';
    const catBadge = document.getElementById('card-cat-badge');
    catBadge.textContent = p.category;
    catBadge.className = `badge badge-${p.category.toLowerCase()}`;
    catBadge.style.cssText = 'border-color:rgba(245,240,231,0.4); color:rgba(245,240,231,0.8);';
  }

  function generateQR(cardNo) {
    const canvas = document.getElementById('qr-canvas');
    // Use QRCode library
    try {
      new QRCode(canvas.parentElement, {
        text:   cardNo,
        width:  160,
        height: 160,
        colorDark:  '#171614',
        colorLight: '#F5F0E7',
        correctLevel: QRCode.CorrectLevel.H
      });
      canvas.remove(); // library creates its own canvas
    } catch (e) {
      canvas.width  = 160;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#F5F0E7';
      ctx.fillRect(0, 0, 160, 160);
      ctx.fillStyle = '#171614';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cardNo, 80, 85);
    }
  }

  window.downloadQR = function () {
    const qrImg = document.querySelector('.qr-box img') || document.querySelector('.qr-box canvas');
    if (!qrImg) return;
    const a = document.createElement('a');
    a.href = qrImg.src || qrImg.toDataURL();
    a.download = `ration-qr-${profile?.ration_card_no || 'card'}.png`;
    a.click();
  };

  function renderEntitlements(list) {
    const current = list.find(e => e.month === new Date().toISOString().slice(0, 7));
    const entBars = document.getElementById('ent-bars');
    const entMonth = document.getElementById('ent-month');
    const entStatus = document.getElementById('ent-status');

    if (!current) {
      entBars.innerHTML = '<p style="opacity:0.4; font-size:0.85rem;">No entitlement record for this month.</p>';
      entStatus.innerHTML = '';
      return;
    }

    entMonth.textContent = current.month;

    const maxMap = { rice_kg: 20, wheat_kg: 20, sugar_kg: 2, oil_liters: 2 };
    const items = [
      { key: 'rice_kg',    label: 'Rice',  unit: 'kg' },
      { key: 'wheat_kg',   label: 'Wheat', unit: 'kg' },
      { key: 'sugar_kg',   label: 'Sugar', unit: 'kg' },
      { key: 'oil_liters', label: 'Oil',   unit: 'L'  }
    ];

    entBars.innerHTML = items.map(item => {
      const qty = parseFloat(current[item.key]);
      const pct = Math.min(100, (qty / maxMap[item.key]) * 100);
      return `
        <div class="entitlement-bar">
          <span class="ent-name">${item.label}</span>
          <div class="ent-track"><div class="ent-fill" style="width:${pct}%;"></div></div>
          <span class="ent-qty">${qty} ${item.unit}</span>
        </div>`;
    }).join('');

    const collected = current.collected;
    entStatus.innerHTML = collected
      ? `<span class="badge badge-collected">Collected</span>
         <span style="font-size:0.75rem; opacity:0.45; margin-left:0.75rem;">
           ${current.collected_at ? new Date(current.collected_at).toLocaleDateString('en-IN') : ''}
         </span>`
      : `<span class="badge badge-pending-ent">Pending</span>
         <span style="font-size:0.75rem; opacity:0.45; margin-left:0.75rem;">Not yet collected this month</span>`;
  }

  function renderHistory(list) {
    const tbody = document.getElementById('history-body');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="opacity:0.4; font-size:0.85rem; padding:1.5rem 0;">No history yet.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(e => `
      <tr>
        <td style="font-family:var(--serif); font-size:1rem;">${e.month}</td>
        <td>${e.rice_kg} kg</td>
        <td>${e.wheat_kg} kg</td>
        <td>${e.sugar_kg} kg</td>
        <td>${e.oil_liters} L</td>
        <td>
          <span class="badge ${e.collected ? 'badge-collected' : 'badge-pending-ent'}">
            ${e.collected ? 'Collected' : 'Pending'}
          </span>
        </td>
      </tr>`).join('');
  }

  init();
})();
