/* ============================================================
   js/modules/gamification.js — Badges & Streaks Module
   ============================================================ */

const GamificationModule = (() => {

  const BADGE_DEFS = [
    { code: 'EMERGENCY_FUND_HERO',   emoji: '🛡️', name: 'Emergency Fund Hero',  desc: 'Emergency fund reaches 100% funded.' },
    { code: 'SUBSCRIPTION_SLAYER',   emoji: '⚔️', name: 'Subscription Slayer',   desc: 'Cancel at least one detected subscription.' },
    { code: 'SAVINGS_CHAMPION',      emoji: '🏆', name: 'Savings Champion',       desc: 'Meet savings target 3 months in a row.' },
    { code: 'GOAL_GUARDIAN',         emoji: '🎯', name: 'Goal Guardian',           desc: 'On track for yearly goal 3 consecutive months.' },
    { code: 'FIRST_GOAL_COMPLETED',  emoji: '🌟', name: 'First Goal Completed',   desc: 'Fully fund your first savings goal.' },
    { code: 'IMPULSE_BUSTER',        emoji: '🧘', name: 'Impulse Buster',          desc: 'Choose "Let me review" on emotional guard 3 times.' },
    { code: 'BUDGET_MASTER',         emoji: '📊', name: 'Budget Master',           desc: 'All categories within budget for a full month.' },
    { code: 'HEALTH_SCORE_90',       emoji: '💯', name: 'Health Score 90+',        desc: 'Financial Health Score reaches 90 or above.' },
    { code: 'LOGGING_STREAK_7',      emoji: '🔥', name: '7-Day Logger',            desc: 'Log at least one transaction every day for 7 days.' },
    { code: 'UNDER_BUDGET_3',        emoji: '🎖️', name: 'Under Budget 3 Months', desc: 'Stay within all category budgets 3 months straight.' },
  ];

  let allData    = null;
  let filterMode = 'all';

  const init = async () => {
    if (!StorageUtil.requireAuth()) return;
    setupFilters();
    await loadData();
  };

  const setupFilters = () => {
    document.querySelectorAll('.badgeFilter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.badgeFilter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterMode = btn.dataset.filter;
        renderBadges();
      });
    });
  };

  const loadData = async () => {
    try {
      allData = await ApiUtil.Gamification.status();
    } catch {
      // Fallback to empty state
      allData = { streaks: [], badges: [] };
    }
    renderStreaks();
    renderBadges();
  };

  const renderStreaks = () => {
    const container = document.getElementById('allStreaks');
    if (!container) return;

    const streakDefs = [
      { type: 'LOGGING',            emoji: '📅', label: 'Day Logging',       unit: 'days' },
      { type: 'UNDER_BUDGET',       emoji: '💰', label: 'Under Budget',      unit: 'months' },
      { type: 'SAVINGS_HIT',        emoji: '🎯', label: 'Savings Hit',       unit: 'months' },
      { type: 'NO_EMOTIONAL_SPEND', emoji: '🧘', label: 'No Impulse Spend',  unit: 'weeks' },
    ];

    const earned = (allData?.streaks || []);
    container.innerHTML = streakDefs.map(def => {
      const s = earned.find(e => e.streakType === def.type);
      const count = s?.streakCount || 0;
      return `
        <div class="streak-card" style="min-width:120px;">
          <div class="streak-emoji">${def.emoji}</div>
          <div class="streak-count" style="${count === 0 ? 'color:var(--clr-muted);' : ''}">${count}</div>
          <div class="streak-label">${def.label}</div>
          <div style="font-size:0.7rem;color:var(--clr-muted);margin-top:2px;">${def.unit}</div>
        </div>`;
    }).join('');
  };

  const renderBadges = () => {
    const grid = document.getElementById('badgesGrid');
    if (!grid) return;

    const earnedCodes = new Set((allData?.badges || []).map(b => b.badgeCode));
    const earnedDates = {};
    (allData?.badges || []).forEach(b => { earnedDates[b.badgeCode] = b.awardedAt; });

    let defs = [...BADGE_DEFS];
    if (filterMode === 'earned') defs = defs.filter(d => earnedCodes.has(d.code));
    if (filterMode === 'locked') defs = defs.filter(d => !earnedCodes.has(d.code));

    if (!defs.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">${filterMode === 'earned' ? '🏆' : '🔒'}</div>
        <div class="empty-state-title">${filterMode === 'earned' ? 'No badges earned yet' : 'All badges earned!'}</div>
      </div>`;
      return;
    }

    grid.innerHTML = defs.map(def => {
      const isEarned = earnedCodes.has(def.code);
      const dateStr  = isEarned && earnedDates[def.code] ? Helpers.formatDate(earnedDates[def.code]) : null;
      return `
        <div class="badge-card ${isEarned ? 'earned' : 'locked'}">
          <div class="badge-emoji">${def.emoji}</div>
          <div class="badge-name">${def.name}</div>
          <div class="badge-desc">${def.desc}</div>
          ${isEarned ? `<div class="badge-earned-label">✓ Earned${dateStr ? ` · ${dateStr}` : ''}</div>` : `<div style="margin-top:8px;font-size:0.72rem;color:var(--clr-border);font-family:var(--font-display);font-weight:600;">🔒 LOCKED</div>`}
        </div>`;
    }).join('');
  };

  return { init };
})();
