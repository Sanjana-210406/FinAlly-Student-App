/* ============================================================
   js/modules/sidebar.js — Injects sidebar into every app page
   ============================================================ */

const SidebarModule = (() => {

  const NAV_ITEMS = [
    { id: 'dashboard',     label: 'Dashboard',     icon: '📊', href: 'dashboard.html' },
    { id: 'add-expense',   label: 'Add Expense',   icon: '➕', href: 'add-expense.html' },
    { id: 'expenses',      label: 'Expenses',      icon: '📋', href: 'expenses.html' },
    { id: 'budget',        label: 'Budget',        icon: '💰', href: 'budget.html' },
    { id: 'goals',         label: 'Goals',         icon: '🎯', href: 'goals.html' },
    { id: 'alerts',        label: 'Alerts',        icon: '🔔', href: 'alerts.html', badge: true },
    { id: 'insights',      label: 'Insights',      icon: '🧠', href: 'insights.html' },
    { id: 'subscriptions', label: 'Subscriptions', icon: '🔄', href: 'subscriptions.html' },
    { id: 'simulator',     label: 'Simulator',     icon: '🔮', href: 'simulator.html' },
    { id: 'investments',   label: 'Investments',   icon: '📈', href: 'investments.html' },
    { id: 'gamification',  label: 'Achievements',  icon: '🏆', href: 'gamification.html' },
    { id: 'privacy',       label: 'Privacy',       icon: '🔐', href: 'privacy.html' },
  ];

  const render = (activePage) => {
    if (!StorageUtil.requireAuth()) return;

    const user   = StorageUtil.getUser();
    const initials = (user?.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    sidebar.innerHTML = `
      <div class="sidebar-brand">
        <div class="brand-wordmark">
          <span class="brand-fin">Fin</span><span class="brand-ally">Ally</span>
        </div>
        <span class="brand-badge">Student Edition</span>
      </div>

      <nav class="sidebar-nav">
        ${NAV_ITEMS.map(item => `
          <a class="nav-item ${item.id === activePage ? 'active' : ''}" href="${item.href}">
            <span class="nav-icon">${item.icon}</span>
            ${item.label}
            ${item.badge ? `<span class="nav-badge" id="sidebarAlertBadge" style="display:none;">0</span>` : ''}
          </a>
        `).join('')}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar">${initials}</div>
          <div class="user-info">
            <div class="user-name">${user?.name || 'Student'}</div>
            <div class="user-role">${user?.age ? `Age ${user.age}` : 'Student'}</div>
          </div>
          <button class="btn btn-ghost btn-sm" id="sidebarLogout" title="Logout" style="padding:6px;color:var(--text-muted);">🚪</button>
        </div>
      </div>
    `;

    document.getElementById('sidebarLogout')?.addEventListener('click', () => {
      StorageUtil.clear();
      window.location.href = 'login.html';
    });

    // Load unread alert count
    loadAlertBadge();
  };

  const loadAlertBadge = async () => {
    try {
      const alerts = await ApiUtil.Alerts.list();
      const unread = (alerts || []).filter(a => !a.isRead).length;
      const badge  = document.getElementById('sidebarAlertBadge');
      if (badge) {
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'inline-flex' : 'none';
      }
    } catch { /* silent */ }
  };

  return { render };
})();
