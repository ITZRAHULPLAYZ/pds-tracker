/* admin.js */
(function () {
  const user = auth.require(['admin']);
  if (!user) return;

  document.getElementById('nav-name').textContent  = user.name;
  document.getElementById('admin-date').textContent = new Date().toLocaleDateString('en-IN', { dateStyle: 'long' });

  // Tab switching
  document.querySelectorAll('.adm-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.adm-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.adm-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('adm-' + btn.dataset.pane).classList.add('active');
    });
  });

  // Load everything
  async function init() {
    try {
      const [summary, beneficiaries, grievances, stock] = await Promise.all([
        api.analytics.summary(),
        api.beneficiaries.all(),
        api.grievances.all(),
        api.stock.all()
      ]);
      renderStats(summary);
      renderBeneficiaries(beneficiaries);
      renderGrievances(grievances);
      renderStock(stock);
    } catch (e) {
      alert('Failed to load admin data: ' + e.message);
    }
  }

  function renderStats(s) {
    document.getElementById('st-ben').textContent   = s.total_beneficiaries;
    document.getElementById('st-tx').textContent    = s.total_transactions;
    document.getElementById('st-shops').textContent = s.total_shops;
    document.getElementById('st-griev').textContent = s.pending_grievances;
  }

  function renderBeneficiaries(list) {
    const tbody = document.getElementById('ben-body');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="opacity:0.4; padding:1rem 0.85rem;">No beneficiaries found.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map((b, i) => `
      <tr>
        <td class="meta-text">${String(i + 1).padStart(2, '0')}</td>
        <td style="font-family:var(--serif); font-size:1rem; letter-spacing:0.02em;">${b.ration_card_no}</td>
        <td>${b.name}</td>
        <td><span class="badge badge-${b.category.toLowerCase()}">${b.category}</span></td>
        <td>${b.family_size}</td>
        <td style="opacity:0.6; font-size:0.8rem;">${b.shop_name || '-'}</td>
        <td style="opacity:0.5; font-size:0.8rem;">${b.phone || '-'}</td>
      </tr>`).join('');
  }

  function renderGrievances(list) {
    const pendingList = list.filter(g => g.status !== 'resolved');
    const resolvedList = list.filter(g => g.status === 'resolved');

    const pTbody = document.getElementById('griev-body');
    if (!pendingList.length) {
      pTbody.innerHTML = '<tr><td colspan="6" style="opacity:0.4; padding:1rem 0.85rem;">No pending grievances.</td></tr>';
    } else {
      pTbody.innerHTML = pendingList.map(g => `
        <tr class="grievance-row" id="gr-${g.id}">
          <td class="meta-text">#${g.id}</td>
          <td style="font-size:0.82rem;">${g.user_name || 'Anonymous'}</td>
          <td style="font-size:0.85rem; max-width:280px;">${g.subject}</td>
          <td class="meta-text">${new Date(g.submitted_at).toLocaleDateString('en-IN')}</td>
          <td><span class="badge badge-${g.status}" id="badge-${g.id}">${fmtStatus(g.status)}</span></td>
          <td>
            <select id="status-sel-${g.id}" class="status-sel" onchange="updateStatus(${g.id}, this.value)" style="margin-bottom:0.5rem;">
              <option value="pending"     ${g.status === 'pending'     ? 'selected' : ''}>Pending</option>
              <option value="in_progress" ${g.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="resolved"    ${g.status === 'resolved'    ? 'selected' : ''}>Resolved</option>
            </select>
            <br>
            <div id="alert-box-${g.id}" style="display:none; margin-top:0.5rem;">
              <input type="text" id="alert-input-${g.id}" placeholder="Note for shop..." style="font-size:0.75rem; padding:0.25rem; width:100px;">
              <button class="btn btn-sm" onclick="sendAlert(${g.id})" style="padding:0.25rem 0.5rem;">Send</button>
            </div>
            <button id="alert-btn-${g.id}" class="btn btn-sm" onclick="toggleAlertBox(${g.id})">Alert Shop</button>
          </td>
        </tr>`).join('');
    }

    const rTbody = document.getElementById('resolved-griev-body');
    if (!resolvedList.length) {
      rTbody.innerHTML = '<tr><td colspan="6" style="opacity:0.4; padding:1rem 0.85rem;">No resolved grievances.</td></tr>';
    } else {
      rTbody.innerHTML = resolvedList.map(g => `
        <tr class="grievance-row" id="gr-${g.id}">
          <td class="meta-text">#${g.id}</td>
          <td style="font-size:0.82rem;">${g.user_name || 'Anonymous'}</td>
          <td style="font-size:0.85rem; max-width:280px;">${g.subject}</td>
          <td class="meta-text">${new Date(g.submitted_at).toLocaleDateString('en-IN')}</td>
          <td class="meta-text">${g.resolved_at ? new Date(g.resolved_at).toLocaleDateString('en-IN') : '-'}</td>
          <td style="font-size:0.8rem; opacity:0.8; max-width:200px;">${g.admin_note || '-'}</td>
        </tr>`).join('');
    }
  }

  function renderStock(list) {
    const tbody = document.getElementById('stock-body');
    // Group by shop for clarity
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="opacity:0.4; padding:1rem 0.85rem;">No stock data.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(s => `
      <tr>
        <td style="font-size:0.85rem;">${s.name}</td>
        <td>${s.commodity || '-'}</td>
        <td style="font-family:var(--serif); font-size:1.1rem; font-weight:300;">
          ${s.quantity != null ? s.quantity + ' kg' : '-'}
        </td>
        <td class="meta-text">${s.updated_at ? new Date(s.updated_at).toLocaleDateString('en-IN') : '-'}</td>
      </tr>`).join('');
  }

  function fmtStatus(s) {
    return { pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved' }[s] || s;
  }

  async function refreshGrievances() {
    try {
      const grievances = await api.grievances.all();
      renderGrievances(grievances);
    } catch (e) {
      console.error('Failed to refresh grievances', e);
    }
  }

  window.updateStatus = async function (id, status) {
    try {
      await api.grievances.updateStatus(id, status);
      await refreshGrievances();
    } catch (e) {
      alert('Failed to update: ' + e.message);
    }
  };

  window.toggleAlertBox = function (id) {
    const box = document.getElementById('alert-box-' + id);
    const btn = document.getElementById('alert-btn-' + id);
    if (box.style.display === 'none') {
      box.style.display = 'block';
      btn.style.display = 'none';
    }
  };

  window.sendAlert = async function (id) {
    const input = document.getElementById('alert-input-' + id);
    const msg = input.value.trim();
    if (!msg) return;
    try {
      await api.grievances.updateStatus(id, 'resolved', msg);
      await refreshGrievances();
    } catch (e) {
      alert('Failed to send alert: ' + e.message);
    }
  };

  init();
})();
