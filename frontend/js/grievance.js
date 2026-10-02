/* grievance.js */
(function () {
  const user = auth.require(['beneficiary', 'admin']);
  if (!user) return;

  document.getElementById('nav-name').textContent = user.name;

  async function loadGrievances() {
    const container = document.getElementById('griev-list');
    try {
      const list = await api.grievances.all();
      if (!list.length) {
        container.innerHTML = '<p style="opacity:0.4; font-size:0.85rem;">No complaints submitted yet.</p>';
        return;
      }
      container.innerHTML = list.map(g => `
        <div class="griev-item">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <h3>${g.subject}</h3>
            <span class="badge badge-${g.status}">${fmtStatus(g.status)}</span>
          </div>
          <p>${g.description}</p>
          <div style="display:flex; gap:1.5rem;">
            <span class="meta-text">Filed ${new Date(g.submitted_at).toLocaleDateString('en-IN')}</span>
            ${g.resolved_at ? `<span class="meta-text">Resolved ${new Date(g.resolved_at).toLocaleDateString('en-IN')}</span>` : ''}
            ${user.role === 'admin' && g.user_name ? `<span class="meta-text">By ${g.user_name}</span>` : ''}
          </div>
        </div>`).join('');
    } catch (e) {
      container.innerHTML = `<p style="opacity:0.45; font-size:0.85rem;">${e.message}</p>`;
    }
  }

  window.submitGrievance = async function () {
    const subject     = document.getElementById('g-subject').value.trim();
    const description = document.getElementById('g-desc').value.trim();
    const errEl = document.getElementById('submit-err');
    const okEl  = document.getElementById('submit-ok');
    errEl.style.display = okEl.style.display = 'none';

    if (!subject || !description) {
      errEl.textContent   = 'Both subject and description are required.';
      errEl.style.display = 'block';
      return;
    }

    try {
      await api.grievances.submit({ subject, description });
      okEl.textContent  = 'Complaint submitted successfully. We will respond within 7 working days.';
      okEl.style.display = 'block';
      document.getElementById('g-subject').value = '';
      document.getElementById('g-desc').value    = '';
      loadGrievances();
    } catch (e) {
      errEl.textContent   = e.message;
      errEl.style.display = 'block';
    }
  };

  function fmtStatus(s) {
    return { pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved' }[s] || s;
  }

  loadGrievances();
})();
