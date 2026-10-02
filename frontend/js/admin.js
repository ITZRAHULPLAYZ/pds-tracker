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
        <td style="opacity:0.6; font-size:0.8rem;">${b.shop_name || '—'}</td>
        <td style="opacity:0.5; font-size:0.8rem;">${b.phone || '—'}</td>
      </tr>`).join('');
  }

  function renderGrievances(list) {
    const tbody = document.getElementById('griev-body');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="opacity:0.4; padding:1rem 0.85rem;">No grievances found.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(g => `
      <tr class="grievance-row" id="gr-${g.id}">
        <td class="meta-text">#${g.id}</td>
        <td style="font-size:0.82rem;">${g.user_name || 'Anonymous'}</td>
        <td style="font-size:0.85rem; max-width:280px;">${g.subject}</td>
        <td class="meta-text">${new Date(g.submitted_at).toLocaleDateString('en-IN')}</td>
        <td><span class="badge badge-${g.status}" id="badge-${g.id}">${fmtStatus(g.status)}</span></td>
        <td>
          <select class="status-sel" onchange="updateStatus(${g.id}, this.value)">
            <option value="pending"     ${g.status === 'pending'     ? 'selected' : ''}>Pending</option>
            <option value="in_progress" ${g.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="resolved"    ${g.status === 'resolved'    ? 'selected' : ''}>Resolved</option>
          </select>
        </td>
      </tr>`).join('');
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
        <td>${s.commodity || '—'}</td>
        <td style="font-family:var(--serif); font-size:1.1rem; font-weight:300;">
          ${s.quantity != null ? s.quantity + ' kg' : '—'}
        </td>
        <td class="meta-text">${s.stock_updated ? new Date(s.stock_updated).toLocaleDateString('en-IN') : '—'}</td>
      </tr>`).join('');
  }

  function fmtStatus(s) {
    return { pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved' }[s] || s;
  }

  window.updateStatus = async function (id, status) {
    try {
      await api.grievances.updateStatus(id, status);
      const badge = document.getElementById('badge-' + id);
      badge.className = `badge badge-${status}`;
      badge.textContent = fmtStatus(status);
    } catch (e) {
      alert('Failed to update: ' + e.message);
    }
  };

  init();
})();
