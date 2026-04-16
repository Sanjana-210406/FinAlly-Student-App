/* ============================================================
   js/modules/subscriptions.js — Subscription Tracker Module
   ============================================================ */

const SubscriptionsModule = (() => {

  let allSubs = [];

  const init = async () => {
    if (!StorageUtil.requireAuth()) return;
    await loadSubscriptions();
  };

  const loadSubscriptions = async () => {
    try {
      allSubs = await ApiUtil.Subscriptions.list();
      renderStats();
      renderGrid();
    } catch (err) {
      document.getElementById('subsGrid').innerHTML =
        `<div class="empty-state" style="grid-column:1/-1;">
           <div class="empty-state-icon">🔄</div>
           <div class="empty-state-title">No subscriptions detected yet</div>
           <p>Subscriptions are auto-detected after you log a few recurring transactions.</p>
         </div>`;
    }
  };

  const renderStats = () => {
    const container = document.getElementById('subsStats');
    if (!container) return;
    const active    = allSubs.filter(s => s.status === 'ACTIVE');
    const possibly  = allSubs.filter(s => s.status === 'POSSIBLY_CANCELLED');
    const monthly   = active.reduce((sum, s) => {
      if (s.frequency === 'MONTHLY') return sum + s.amount;
      if (s.frequency === 'ANNUAL')  return sum + (s.amount / 12);
      if (s.frequency === 'WEEKLY')  return sum + (s.amount * 4.33);
      return sum;
    }, 0);

    container.innerHTML = `
      <div class="card" style="text-align:center;">
        <div style="font-size:1.8rem;margin-bottom:4px;font-family:var(--font-display);font-weight:800;">${active.length}</div>
        <div style="font-size:0.78rem;color:var(--clr-muted);font-family:var(--font-display);font-weight:600;text-transform:uppercase;">Active</div>
      </div>
      <div class="card" style="text-align:center;border-color:rgba(255,209,102,0.3);">
        <div style="font-size:1.8rem;margin-bottom:4px;font-family:var(--font-display);font-weight:800;color:var(--clr-warn);">${possibly.length}</div>
        <div style="font-size:0.78rem;color:var(--clr-muted);font-family:var(--font-display);font-weight:600;text-transform:uppercase;">Possibly Cancelled</div>
      </div>
      <div class="card" style="text-align:center;border-color:rgba(255,107,107,0.2);">
        <div style="font-size:1.8rem;margin-bottom:4px;font-family:var(--font-display);font-weight:800;color:var(--clr-accent2);">${Helpers.fmt(monthly)}</div>
        <div style="font-size:0.78rem;color:var(--clr-muted);font-family:var(--font-display);font-weight:600;text-transform:uppercase;">Est. Monthly Cost</div>
      </div>
    `;
  };

  const renderGrid = () => {
    const grid = document.getElementById('subsGrid');
    if (!allSubs.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state-icon">🔄</div>
          <div class="empty-state-title">No subscriptions detected yet</div>
          <p>Log recurring payments like Netflix, Spotify, or Gym fees and we'll detect them automatically.</p>
        </div>`;
      return;
    }

    grid.innerHTML = allSubs.map(sub => {
      const statusClass = sub.status === 'ACTIVE' ? 'active' : sub.status === 'POSSIBLY_CANCELLED' ? 'warn' : 'inactive';
      const statusLabel = sub.status === 'ACTIVE' ? '✓ Active' : sub.status === 'POSSIBLY_CANCELLED' ? '? Possibly Cancelled' : '✗ Cancelled';
      const cardClass   = sub.status === 'POSSIBLY_CANCELLED' ? 'possibly-cancelled' : '';
      const freqLabel   = { MONTHLY: '/month', WEEKLY: '/week', ANNUAL: '/year' }[sub.frequency] || '';

      return `
        <div class="sub-card ${cardClass}">
          <div class="sub-top">
            <span class="sub-icon">${Helpers.subIcon(sub.merchantName)}</span>
            <div>
              <div class="sub-name">${sub.merchantName}</div>
              <div class="sub-freq">${sub.frequency}</div>
            </div>
          </div>
          <div class="sub-amount">${Helpers.fmt(sub.amount)}<span style="font-size:0.75rem;font-weight:400;color:var(--clr-muted);"> ${freqLabel}</span></div>
          <div class="sub-last">Last charged: ${Helpers.formatDate(sub.lastChargedDate)}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
            <span class="sub-status-tag ${statusClass}">${statusLabel}</span>
            <div style="display:flex;gap:6px;">
              ${sub.status !== 'ACTIVE' ? `<button class="btn btn-outline btn-sm" onclick="SubscriptionsModule.setStatus(${sub.id},'ACTIVE')">Mark Active</button>` : ''}
              ${sub.status !== 'CONFIRMED_CANCELLED' ? `<button class="btn btn-ghost btn-sm" style="color:var(--clr-accent2);" onclick="SubscriptionsModule.setStatus(${sub.id},'CONFIRMED_CANCELLED')">Cancel</button>` : ''}
            </div>
          </div>
          ${sub.status === 'POSSIBLY_CANCELLED' ? `<div class="alert alert-warn" style="margin-top:10px;font-size:0.8rem;">Not charged in 45+ days — is this still active?</div>` : ''}
        </div>`;
    }).join('');
  };

  const setStatus = async (id, status) => {
    try {
      await ApiUtil.Subscriptions.setStatus(id, status);
      Toast.success('Subscription status updated.');
      await loadSubscriptions();
    } catch (err) {
      Toast.error(err.message || 'Failed to update status.');
    }
  };

  return { init, setStatus };
})();
