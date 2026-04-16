/* ============================================================
   js/modules/dashboard.js — Dashboard page logic
   ============================================================ */

const DashboardModule = (() => {

  let donutChart = null;

  // ── Greeting ───────────────────────────────────────────────
  const setGreeting = (user) => {
    const hr   = new Date().getHours();
    const tod  = hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'evening';
    const name = user?.name?.split(' ')[0] || 'there';
    const persona = Helpers.getBotPersona(user);
    const em   = persona.emoji;

    const greetEl = document.getElementById('greetingTitle');
    const subEl   = document.getElementById('greetingSubtitle');
    if (greetEl) greetEl.textContent = `Good ${tod}${em ? ' 👋' : ','} ${name}`;
    if (subEl)   subEl.textContent   = `Here's your financial snapshot for ${new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}.`;

    // Sidebar
    const av = document.getElementById('sidebarAvatar');
    const nm = document.getElementById('sidebarName');
    if (av) av.textContent = (user?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    if (nm) nm.textContent = user?.name || 'Student';
  };

  // ── Health Score Ring ──────────────────────────────────────
  const renderScore = (score) => {
    const val  = Math.round(score?.score || 0);
    const circ = 2 * Math.PI * 46;
    const offset = circ - (val / 100) * circ;
    const ring = document.getElementById('scoreRingFill');
    if (ring) { ring.style.strokeDasharray = circ; ring.style.strokeDashoffset = offset; }

    document.getElementById('scoreVal')?.setAttribute('data-val', val);
    document.getElementById('scoreVal') && (document.getElementById('scoreVal').textContent = val);

    const { label, color } = Helpers.scoreRating(val);
    const ratingEl = document.getElementById('healthRating');
    if (ratingEl) { ratingEl.textContent = label; ratingEl.style.color = color; }
    const descEl = document.getElementById('healthDesc');
    if (descEl) descEl.textContent = Helpers.scoreDesc(val);

    document.getElementById('hcSavings')   && (document.getElementById('hcSavings').textContent   = Math.round(score?.savingsComponent   || 0) + '/35');
    document.getElementById('hcAdherence') && (document.getElementById('hcAdherence').textContent = Math.round(score?.adherenceComponent  || 0) + '/25');
    document.getElementById('hcGoal')      && (document.getElementById('hcGoal').textContent      = Math.round(score?.goalComponent       || 0) + '/20');
    document.getElementById('hcEmergency') && (document.getElementById('hcEmergency').textContent = Math.round(score?.emergencyFundComponent || 0) + '/10');
    document.getElementById('hcBehavior')  && (document.getElementById('hcBehavior').textContent  = Math.round(score?.behaviorComponent   || 0) + '/10');
  };

  // ── Bot Card ───────────────────────────────────────────────
  const renderBot = (user, alerts, score, budget) => {
    const msg = Helpers.buildBotMessage(user, alerts, score, budget);
    const msgEl  = document.getElementById('botMessage');
    const timeEl = document.getElementById('botTime');
    if (msgEl)  msgEl.innerHTML  = msg;
    if (timeEl) timeEl.textContent = 'just now';
  };

  // ── Budget Donut ───────────────────────────────────────────
  const renderDonut = (budget) => {
    const needs     = budget?.needsSpent     || 0;
    const wants     = budget?.wantsSpent     || 0;
    const saved     = budget?.savedSoFar     || 0;
    const remaining = Math.max(0, (budget?.totalIncome || 0) - needs - wants - saved);

    document.getElementById('donutSpent')     && (document.getElementById('donutSpent').textContent = Helpers.fmt(needs + wants));
    document.getElementById('legendNeeds')    && (document.getElementById('legendNeeds').textContent = Helpers.fmt(needs));
    document.getElementById('legendWants')    && (document.getElementById('legendWants').textContent = Helpers.fmt(wants));
    document.getElementById('legendSaved')    && (document.getElementById('legendSaved').textContent = Helpers.fmt(saved));
    document.getElementById('legendRemaining')&& (document.getElementById('legendRemaining').textContent = Helpers.fmt(remaining));

    document.getElementById('monthSavings') && (document.getElementById('monthSavings').textContent = Helpers.fmt(saved));
    document.getElementById('monthTarget')  && (document.getElementById('monthTarget').textContent  = Helpers.fmt(budget?.savingsTarget || 0));

    const ctx = document.getElementById('budgetDonut')?.getContext('2d');
    if (!ctx) return;
    if (donutChart) donutChart.destroy();
    donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Needs', 'Wants', 'Saved', 'Remaining'],
        datasets: [{
          data: [needs, wants, saved, remaining],
          backgroundColor: ['#6c63ff', '#00e5a0', '#ffd166', '#252a38'],
          borderWidth: 0,
          hoverOffset: 4,
        }],
      },
      options: {
        cutout: '72%',
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: (c) => ` ${c.label}: ${Helpers.fmt(c.raw)}` }
        }},
        animation: { duration: 800 },
      },
    });
  };

  // ── Category budget bars ───────────────────────────────────
  const renderCategories = (budget) => {
    const el = document.getElementById('categoriesList');
    if (!el) return;
    const cats = budget?.categoryBreakdown || [];
    if (!cats.length) { el.innerHTML = '<p class="text-muted text-center" style="padding:20px;">No budget data yet.</p>'; return; }

    el.innerHTML = cats.slice(0, 6).map(c => {
      const pct = Math.min(100, Math.round((c.spent / c.budgeted) * 100));
      const cls = Helpers.pctClass(pct);
      return `
        <div class="category-item">
          <div class="category-row">
            <div class="category-name">
              <span class="category-icon">${Helpers.CATEGORY_META[c.name]?.icon || '📦'}</span>
              ${c.name}
            </div>
            <div class="category-amounts">
              <strong>${Helpers.fmt(c.spent)}</strong> / ${Helpers.fmt(c.budgeted)}
              <span class="chip ${cls === 'danger' ? 'chip-danger' : cls === 'warn' ? 'chip-want' : 'chip-need'}" style="margin-left:6px;padding:2px 8px;font-size:0.7rem;">${pct}%</span>
            </div>
          </div>
          <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%;"></div></div>
        </div>
      `;
    }).join('');
  };

  // ── Recent transactions ────────────────────────────────────
  const renderTransactions = (expenses) => {
    const el = document.getElementById('recentTxns');
    if (!el) return;
    const list = (expenses || []).slice(0, 5);
    if (!list.length) { el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-title">No transactions yet</div><p>Add your first expense to get started.</p></div>'; return; }

    el.innerHTML = list.map(t => {
      const meta = Helpers.CATEGORY_META[t.categoryName] || { icon: '📦' };
      const flags = [
        t.isAnomaly        ? '<span class="chip chip-danger" style="padding:1px 6px;font-size:0.68rem;">⚠️ Anomaly</span>'      : '',
        t.isSubscription   ? '<span class="chip chip-want"   style="padding:1px 6px;font-size:0.68rem;">🔄 Sub</span>'          : '',
        t.isEmotionalSpend ? '<span class="chip chip-want"   style="padding:1px 6px;font-size:0.68rem;">💭 Impulse</span>'      : '',
      ].join('');
      return `
        <div class="txn-item">
          <div class="txn-icon">${meta.icon}</div>
          <div class="txn-details">
            <div class="txn-name">${t.description}</div>
            <div class="txn-meta">${Helpers.formatDate(t.date)} · ${t.categoryName || 'Uncategorized'}</div>
            ${flags ? `<div class="txn-flags">${flags}</div>` : ''}
          </div>
          <div class="txn-amount debit">−${Helpers.fmt(t.amount)}</div>
        </div>
      `;
    }).join('');
  };

  // ── Goals strip ────────────────────────────────────────────
  const renderGoals = (goals) => {
    const el = document.getElementById('goalsStrip');
    if (!el) return;
    const active = (goals || []).filter(g => !g.isCompleted).slice(0, 3);
    if (!active.length) { el.innerHTML = '<p class="text-muted" style="padding:12px 0;">No active goals. <a href="goals.html" style="color:var(--clr-primary-lt);">Create one →</a></p>'; return; }

    el.innerHTML = active.map(g => {
      const pct = Math.min(100, Math.round((g.savedSoFar / g.targetAmount) * 100));
      return `
        <div class="goal-row">
          <div class="goal-header">
            <span class="goal-name">${g.isEmergencyFund ? '🛡️ ' : '🎯 '}${g.goalName}</span>
            <span class="goal-pct">${pct}%</span>
          </div>
          <div class="progress-bar"><div class="progress-fill ${Helpers.pctClass(pct)}" style="width:${pct}%;"></div></div>
          <div style="display:flex;justify-content:space-between;margin-top:6px;">
            <span style="font-size:0.75rem;color:var(--clr-muted);">${Helpers.fmt(g.savedSoFar)} saved</span>
            <span style="font-size:0.75rem;color:var(--clr-muted);">${Helpers.fmt(g.targetAmount)} target</span>
          </div>
        </div>
      `;
    }).join('');
  };

  // ── Streaks ────────────────────────────────────────────────
  const renderStreaks = (gamification) => {
    const streaks = gamification?.streaks || [];
    const log  = streaks.find(s => s.streakType === 'LOGGING')?.streakCount  || 0;
    const sav  = streaks.find(s => s.streakType === 'SAVINGS_HIT')?.streakCount || 0;
    document.getElementById('logStreak')     && (document.getElementById('logStreak').textContent     = log);
    document.getElementById('savingsStreak') && (document.getElementById('savingsStreak').textContent = sav);
  };

  // ── Main init ──────────────────────────────────────────────
  const init = async () => {
    if (!StorageUtil.requireAuth()) return;

    const user = StorageUtil.getUser();
    setGreeting(user);

    // Sidebar user info
    const sidebarAv = document.getElementById('sidebarAvatar');
    const sidebarNm = document.getElementById('sidebarName');
    if (sidebarAv) sidebarAv.textContent = (user?.name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    if (sidebarNm) sidebarNm.textContent  = user?.name || 'Student';

    // Mark alerts badge
    const alertBadgeEl = document.getElementById('alertBadge');

    // Parallel data fetch
    try {
      const [score, budget, expenses, goals, alerts, gamification] = await Promise.allSettled([
        ApiUtil.Score.current(),
        ApiUtil.Budget.current(),
        ApiUtil.Expenses.list(),
        ApiUtil.Goals.list(),
        ApiUtil.Alerts.list(),
        ApiUtil.Gamification.status(),
      ]);

      const scoreData = score.status === 'fulfilled' ? score.value : null;
      const budgetData = budget.status === 'fulfilled' ? budget.value : null;
      const expenseData = expenses.status === 'fulfilled' ? expenses.value : [];
      const goalsData = goals.status === 'fulfilled' ? goals.value : [];
      const alertsData = alerts.status === 'fulfilled' ? alerts.value : [];
      const gamData = gamification.status === 'fulfilled' ? gamification.value : null;

      // Render each section
      if (scoreData)  renderScore(scoreData);
      if (budgetData) { renderDonut(budgetData); renderCategories(budgetData); }
      renderTransactions(expenseData);
      renderGoals(goalsData);
      renderBot(user, alertsData, scoreData, budgetData);
      if (gamData) renderStreaks(gamData);

      // Alert badge
      const unread = alertsData.filter(a => !a.isRead).length;
      if (alertBadgeEl) { alertBadgeEl.textContent = unread; alertBadgeEl.style.display = unread ? 'inline-flex' : 'none'; }

    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  };

  return { init };
})();
