/* ============================================================
   js/modules/goals.js — Savings Goals CRUD + yearly goal
   ============================================================ */

const GoalsModule = (() => {

  let depositGoalId = null;

  async function init() {
    if (!StorageUtil.requireAuth()) return;
    await Promise.all([loadGoals(), loadYearlyProgress()]);
    bindModals();
  }

  async function loadGoals() {
    const grid = document.getElementById('goalsGrid');
    try {
      const goals = await ApiUtil.Goals.list() || [];
      if (!goals.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">🎯</div><div class="empty-state-title">No goals yet</div><p>Create your first savings goal to get started.</p></div>`;
        return;
      }
      // Pin emergency fund first
      const sorted = [...goals].sort((a,b) => {
        if (a.isEmergencyFund) return -1;
        if (b.isEmergencyFund) return 1;
        if (a.isYearlyTarget)  return -1;
        if (b.isYearlyTarget)  return 1;
        return 0;
      });
      grid.innerHTML = sorted.map(g => renderGoalCard(g)).join('');
      grid.querySelectorAll('.depositGoalBtn').forEach(btn =>
        btn.addEventListener('click', () => openDeposit(btn.dataset.id))
      );
    } catch (err) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><p style="color:var(--clr-accent2);">${err.message}</p></div>`;
    }
  }

  function renderGoalCard(g) {
    const pct       = Math.min(100, Math.round(((g.savedSoFar || 0) / g.targetAmount) * 100));
    const barCls    = pct >= 100 ? '' : pct >= 70 ? '' : '';
    const extraCls  = g.isEmergencyFund ? 'emergency' : g.isCompleted ? 'completed' : '';
    const icon      = g.isEmergencyFund ? '🛡️' : g.isYearlyTarget ? '🗓️' : g.isCompleted ? '✅' : '🎯';
    const days      = Helpers.daysLeft(g.deadline);
    const deadlineStr = g.deadline
      ? `${days !== null ? (days > 0 ? `${days} days left` : 'Deadline passed') : ''} — ${Helpers.formatDate(g.deadline)}`
      : 'No deadline set';

    return `
      <div class="goal-card ${extraCls}">
        ${g.isCompleted ? '<span class="goal-complete-badge">COMPLETE</span>' : ''}
        <div class="goal-card-icon">${icon}</div>
        <div class="goal-card-name">${g.goalName}</div>
        <div class="goal-card-target">Target: <strong>${Helpers.fmt(g.targetAmount)}</strong></div>
        <div class="goal-card-amounts">
          <span class="goal-saved">${Helpers.fmt(g.savedSoFar || 0)}</span>
          <span style="font-size:0.85rem;color:var(--clr-accent);font-family:var(--font-display);font-weight:700;">${pct}%</span>
        </div>
        <div class="progress-bar" style="margin-bottom:10px;">
          <div class="progress-fill ${barCls}" style="width:${pct}%;"></div>
        </div>
        <div class="goal-deadline">${deadlineStr}</div>
        ${g.monthlyRequired ? `<div class="goal-monthly">Monthly needed: ${Helpers.fmt(g.monthlyRequired)}</div>` : ''}
        ${!g.isCompleted ? `<button class="btn btn-outline btn-sm depositGoalBtn" data-id="${g.id}" style="width:100%;justify-content:center;margin-top:14px;">💰 Add Funds</button>` : ''}
      </div>
    `;
  }

  async function loadYearlyProgress() {
    const card = document.getElementById('yearlyGoalCard');
    try {
      const data = await ApiUtil.Budget.yearlyProgress();
      if (!data || !data.yearlyTarget) return;
      if (card) card.style.display = 'block';

      const pct = Math.min(100, Math.round((data.savedSoFar / data.yearlyTarget) * 100));
      const el = (id) => document.getElementById(id);

      if (el('yearlyGoalSub'))  el('yearlyGoalSub').textContent  = `${Helpers.fmt(data.savedSoFar)} of ${Helpers.fmt(data.yearlyTarget)} saved`;
      if (el('yearlyGoalPct'))  el('yearlyGoalPct').textContent  = `${pct}%`;
      if (el('yearlyGoalBar'))  el('yearlyGoalBar').style.width  = `${pct}%`;

      if (data.recoveryTips && data.recoveryTips.length > 0) {
        const tip = document.getElementById('yearlyRecoveryTip');
        if (tip) {
          tip.style.display = 'flex';
          tip.innerHTML     = `💡 <span style="margin-left:8px;">${data.recoveryTips[0]}</span>`;
        }
      }
    } catch {
      // yearly goal not set — hide card
    }
  }

  function bindModals() {
    // New goal modal
    document.getElementById('newGoalBtn')?.addEventListener('click', () =>
      document.getElementById('newGoalModal')?.classList.add('open')
    );
    document.getElementById('closeGoalModal')?.addEventListener('click', () =>
      document.getElementById('newGoalModal')?.classList.remove('open')
    );
    document.getElementById('saveGoalBtn')?.addEventListener('click', saveNewGoal);

    // Deposit modal
    document.getElementById('closeDepositModal')?.addEventListener('click', () => {
      document.getElementById('depositModal')?.classList.remove('open');
      depositGoalId = null;
    });
    document.getElementById('saveDepositBtn')?.addEventListener('click', saveDeposit);

    // Close on overlay click
    ['newGoalModal','depositModal'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', (e) => {
        if (e.target.id === id) document.getElementById(id).classList.remove('open');
      });
    });
  }

  async function saveNewGoal() {
    const name     = document.getElementById('goalName')?.value?.trim();
    const target   = parseFloat(document.getElementById('goalTarget')?.value || 0);
    const deadline = document.getElementById('goalDeadline')?.value || null;
    const initial  = parseFloat(document.getElementById('goalInitial')?.value || 0);
    const errEl    = document.getElementById('goalSaveError');

    if (!name || !target) {
      if (errEl) { errEl.textContent = 'Goal name and target amount are required.'; errEl.classList.remove('hidden'); }
      return;
    }
    try {
      const goal = await ApiUtil.Goals.create({ goalName: name, targetAmount: target, deadline, savedSoFar: initial });
      document.getElementById('newGoalModal')?.classList.remove('open');
      Toast.success(`Goal "${name}" created! 🎯`);
      await loadGoals();
    } catch (err) {
      if (errEl) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
    }
  }

  function openDeposit(id) {
    depositGoalId = id;
    document.getElementById('depositAmount').value = '';
    document.getElementById('depositModal')?.classList.add('open');
  }

  async function saveDeposit() {
    const amount = parseFloat(document.getElementById('depositAmount')?.value || 0);
    if (!amount || amount <= 0) { Toast.warn('Enter a valid amount.'); return; }
    try {
      await ApiUtil.Goals.deposit(depositGoalId, amount);
      document.getElementById('depositModal')?.classList.remove('open');
      Toast.success(`${Helpers.fmt(amount)} added to goal! 💰`);
      await Promise.all([loadGoals(), loadYearlyProgress()]);
    } catch (err) {
      Toast.error(err.message || 'Deposit failed.');
    }
  }

  return { init };
})();
