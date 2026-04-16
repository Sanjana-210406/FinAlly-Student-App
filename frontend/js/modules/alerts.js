/* ============================================================
   js/modules/alerts.js — Alerts list, filtering, mark read
   ============================================================ */

const AlertsModule = (() => {

  let allAlerts = [];

  async function init() {
    if (!StorageUtil.requireAuth()) return;
    await loadAlerts();
    bindFilters();
    document.getElementById('markAllReadBtn')?.addEventListener('click', markAllRead);
  }

  async function loadAlerts() {
    const list = document.getElementById('alertsList');
    try {
      allAlerts = await ApiUtil.Alerts.list() || [];
      renderAlerts(allAlerts);
    } catch (err) {
      if (list) list.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
  }

  function bindFilters() {
    const run = () => {
      const type    = document.getElementById('alertTypeFilter')?.value || '';
      const unread  = document.getElementById('unreadOnly')?.checked;
      const filtered = allAlerts.filter(a => {
        const tOk = !type   || a.alertType === type;
        const uOk = !unread || !a.isRead;
        return tOk && uOk;
      });
      renderAlerts(filtered);
    };
    document.getElementById('alertTypeFilter')?.addEventListener('change', run);
    document.getElementById('unreadOnly')?.addEventListener('change', run);
  }

  function renderAlerts(alerts) {
    const list = document.getElementById('alertsList');
    if (!list) return;

    if (!alerts.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔔</div><div class="empty-state-title">All clear!</div><p>No alerts matching your filters.</p></div>`;
      return;
    }

    list.innerHTML = alerts.map(a => {
      const { icon, bg, cls } = Helpers.alertIcon(a.alertType);
      return `
        <div class="alert-item ${!a.isRead ? 'unread' : ''} ${cls}" data-id="${a.id}">
          <div class="alert-type-icon" style="background:${bg};">${icon}</div>
          <div class="alert-body">
            <div class="alert-item-msg">${a.message}</div>
            <div class="alert-item-meta">${a.alertType?.replace(/_/g,' ')} &nbsp;·&nbsp; ${Helpers.timeAgo(a.createdAt)}</div>
          </div>
          ${!a.isRead ? `<button class="btn btn-ghost btn-sm markReadBtn" data-id="${a.id}" style="flex-shrink:0;">✓</button>` : '<span style="color:var(--clr-muted);font-size:0.75rem;flex-shrink:0;">Read</span>'}
        </div>
      `;
    }).join('');

    list.querySelectorAll('.markReadBtn').forEach(btn =>
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await markRead(btn.dataset.id);
      })
    );

    list.querySelectorAll('.alert-item').forEach(el =>
      el.addEventListener('click', async () => {
        const id = el.dataset.id;
        if (el.classList.contains('unread')) await markRead(id);
      })
    );
  }

  async function markRead(id) {
    try {
      await ApiUtil.Alerts.markRead(id);
      const a = allAlerts.find(x => String(x.id) === String(id));
      if (a) a.isRead = true;
      renderAlerts(allAlerts);
    } catch {}
  }

  async function markAllRead() {
    const unread = allAlerts.filter(a => !a.isRead);
    await Promise.all(unread.map(a => ApiUtil.Alerts.markRead(a.id).catch(() => {})));
    allAlerts.forEach(a => a.isRead = true);
    renderAlerts(allAlerts);
    Toast.success('All alerts marked as read.');
  }

  return { init };
})();
