/* ============================================================
   js/modules/budget.js — Budget Breakdown Page Module
   ============================================================ */

const BudgetModule = (() => {

  let chart = null;

  const init = async () => {
    if (!StorageUtil.requireAuth()) return;
    populateMonthSelector();
    document.getElementById('budgetMonth')?.addEventListener('change', loadData);
    await loadData();
  };

  const populateMonthSelector = () => {
    const sel = document.getElementById('budgetMonth');
    if (!sel) return;
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const lbl = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = lbl;
      if (i === 0) opt.selected = true;
      sel.appendChild(opt);
    }
  };

  const loadData = async () => {
    try {
      const [budget, forecast, expenses] = await Promise.all([
        ApiUtil.Budget.current(),
        ApiUtil.Predictive.forecast().catch(() => null),
        ApiUtil.Expenses.list().catch(() => []),
      ]);
      renderSummaryCards(budget);
      renderBarChart(budget, expenses);
      renderForecastTable(forecast, budget);
      renderMonthlySummary(budget, expenses);
    } catch (err) {
      Toast.error('Failed to load budget data.');
    }
  };

  const renderSummaryCards = (b) => {
    const container = document.getElementById('budgetSummaryCards');
    if (!container || !b) return;
    const spent   = b.totalSpent || 0;
    const income  = b.totalIncome || 0;
    const savings = b.savingsTarget || 0;
    const remain  = income - spent - savings;

    container.innerHTML = [
      { label: 'Total Income',    val: Helpers.fmt(income),          color: 'var(--clr-accent)',    icon: '💰' },
      { label: 'Savings Locked',  val: Helpers.fmt(savings),         color: 'var(--clr-primary-lt)',icon: '🔒' },
      { label: 'Total Spent',     val: Helpers.fmt(spent),           color: 'var(--clr-accent2)',   icon: '📉' },
      { label: 'Remaining',       val: Helpers.fmt(Math.max(0,remain)), color: remain < 0 ? 'var(--clr-accent2)' : 'var(--clr-text)', icon: '🏦' },
    ].map(c => `
      <div class="card" style="text-align:center;padding:20px 16px;">
        <div style="font-size:1.5rem;margin-bottom:6px;">${c.icon}</div>
        <div style="font-family:var(--font-display);font-size:1.2rem;font-weight:800;color:${c.color};">${c.val}</div>
        <div style="font-size:0.75rem;color:var(--clr-muted);font-family:var(--font-display);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-top:4px;">${c.label}</div>
      </div>`).join('');
  };

  const renderBarChart = (budget, expenses) => {
    const ctx = document.getElementById('budgetBarChart');
    if (!ctx || !budget) return;

    // Build category data
    const categories = Helpers.ALL_CATEGORIES.filter(c => c.name !== 'Investment' && c.name !== 'Other');
    const allocations = budget.categoryAllocations || {};
    const spentMap    = {};
    (expenses || []).forEach(e => {
      spentMap[e.categoryName] = (spentMap[e.categoryName] || 0) + e.amount;
    });

    const labels  = categories.map(c => c.name);
    const budgeted= categories.map(c => allocations[c.name] || 0);
    const spent   = categories.map(c => spentMap[c.name] || 0);

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Budgeted', data: budgeted, backgroundColor: 'rgba(108,99,255,0.3)', borderColor: 'rgba(108,99,255,0.7)', borderWidth: 2, borderRadius: 6 },
          { label: 'Spent',    data: spent,    backgroundColor: 'rgba(0,229,160,0.3)',  borderColor: 'rgba(0,229,160,0.7)',  borderWidth: 2, borderRadius: 6 },
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#e8eaf0', font: { family: 'DM Sans' } } },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ₹${ctx.raw.toLocaleString('en-IN')}` } }
        },
        scales: {
          x: { ticks: { color: '#7a7f96' }, grid: { color: '#252a38' } },
          y: { ticks: { color: '#7a7f96', callback: v => '₹' + v.toLocaleString('en-IN') }, grid: { color: '#252a38' } }
        }
      }
    });
  };

  const renderForecastTable = (forecast, budget) => {
    const container = document.getElementById('forecastTable');
    if (!container) return;
    if (!forecast || !forecast.categories?.length) {
      container.innerHTML = `<p class="text-muted" style="padding:16px;">Forecast available after a few days of transactions.</p>`;
      return;
    }

    container.innerHTML = `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:10px 12px;font-family:var(--font-display);font-size:0.75rem;color:var(--clr-muted);text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid var(--clr-border);">Category</th>
            <th style="text-align:right;padding:10px 12px;font-family:var(--font-display);font-size:0.75rem;color:var(--clr-muted);text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid var(--clr-border);">Budget</th>
            <th style="text-align:right;padding:10px 12px;font-family:var(--font-display);font-size:0.75rem;color:var(--clr-muted);text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid var(--clr-border);">Projected</th>
            <th style="text-align:right;padding:10px 12px;font-family:var(--font-display);font-size:0.75rem;color:var(--clr-muted);text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid var(--clr-border);">Days to Breach</th>
            <th style="text-align:left;padding:10px 12px;font-family:var(--font-display);font-size:0.75rem;color:var(--clr-muted);text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid var(--clr-border);">Status</th>
          </tr>
        </thead>
        <tbody>
          ${forecast.categories.map(f => {
            const pct    = budget?.categoryAllocations?.[f.categoryName] ? Math.round((f.projectedTotal / budget.categoryAllocations[f.categoryName]) * 100) : 0;
            const cls    = pct >= 100 ? 'danger' : pct >= 70 ? 'warn' : 'safe';
            const color  = cls === 'danger' ? 'var(--clr-accent2)' : cls === 'warn' ? 'var(--clr-warn)' : 'var(--clr-accent)';
            const status = cls === 'danger' ? '🔴 Breach predicted' : cls === 'warn' ? '⚠️ Watch closely' : '✅ On track';
            return `
              <tr style="border-bottom:1px solid rgba(37,42,56,0.5);">
                <td style="padding:12px;font-family:var(--font-display);font-weight:600;font-size:0.88rem;">${f.categoryName}</td>
                <td style="padding:12px;text-align:right;font-size:0.88rem;color:var(--clr-muted);">${Helpers.fmt(f.budget)}</td>
                <td style="padding:12px;text-align:right;font-family:var(--font-display);font-weight:700;color:${color};">${Helpers.fmt(f.projectedTotal)}</td>
                <td style="padding:12px;text-align:right;font-size:0.88rem;color:${f.daysToBreach <= 7 ? 'var(--clr-accent2)' : 'var(--clr-muted)'};">${f.daysToBreach != null ? f.daysToBreach + 'd' : '—'}</td>
                <td style="padding:12px;font-size:0.82rem;">${status}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  };

  const renderMonthlySummary = (budget, expenses) => {
    const container = document.getElementById('monthlySummary');
    if (!container || !budget) return;
    const savedPct  = budget.savingsTarget > 0 ? Math.round(((budget.actualSaved || 0) / budget.savingsTarget) * 100) : 0;
    const emergPct  = budget.emergencyFundTarget > 0 ? Math.round(((budget.emergencyFundBalance || 0) / budget.emergencyFundTarget) * 100) : 0;
    const anomalies = (expenses || []).filter(e => e.isAnomaly).length;
    const overCats  = Object.entries(budget.categoryAllocations || {}).filter(([cat, alloc]) => {
      const spent = (expenses || []).filter(e => e.categoryName === cat).reduce((s,e) => s + e.amount, 0);
      return spent > alloc;
    }).length;

    container.innerHTML = `
      <div class="grid-3" style="gap:16px;">
        <div style="text-align:center;">
          <div style="font-size:1.8rem;font-family:var(--font-display);font-weight:800;color:${savedPct >= 100 ? 'var(--clr-accent)' : 'var(--clr-warn)'};">${savedPct}%</div>
          <div style="font-size:0.78rem;color:var(--clr-muted);">Savings Target Met</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:1.8rem;font-family:var(--font-display);font-weight:800;color:${emergPct >= 100 ? 'var(--clr-accent)' : 'var(--clr-primary-lt)'};">${emergPct}%</div>
          <div style="font-size:0.78rem;color:var(--clr-muted);">Emergency Fund</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:1.8rem;font-family:var(--font-display);font-weight:800;color:${overCats > 0 ? 'var(--clr-accent2)' : 'var(--clr-accent)'};">${overCats}</div>
          <div style="font-size:0.78rem;color:var(--clr-muted);">Categories Overspent</div>
        </div>
      </div>
      ${anomalies > 0 ? `<div class="alert alert-warn" style="margin-top:16px;font-size:0.85rem;">📈 ${anomalies} anomalous transaction${anomalies > 1 ? 's' : ''} flagged this month.</div>` : ''}`;
  };

  return { init };
})();
