/* ============================================================
   js/modules/insights.js — Behavioral Insights page
   ============================================================ */

const InsightsModule = (() => {

  async function init() {
    if (!StorageUtil.requireAuth()) return;
    await Promise.all([
      loadBotMessages(),
      loadPatterns(),
      loadForecast(),
      loadEmotionalLog(),
      buildHeatmap(),
      buildTrendChart(),
    ]);
  }

  // ── Bot message timeline ───────────────────────────────────
  async function loadBotMessages() {
    const el = document.getElementById('botTimeline');
    try {
      const msgs = await ApiUtil.Behavioral.botMessages() || [];
      if (!msgs.length) {
        el.innerHTML = '<p class="text-muted" style="font-size:0.87rem;">No bot messages yet. Add some expenses to get insights.</p>';
        return;
      }
      el.innerHTML = msgs.slice(0, 6).map(m => `
        <div style="display:flex;gap:12px;align-items:flex-start;padding:12px;border-radius:var(--radius-md);background:var(--clr-surface2);">
          <div style="font-size:1.3rem;flex-shrink:0;">${Helpers.alertIcon(m.alertType).icon}</div>
          <div>
            <div style="font-size:0.88rem;color:var(--clr-text);line-height:1.55;">${m.message}</div>
            <div style="font-size:0.75rem;color:var(--clr-muted);margin-top:4px;">${Helpers.timeAgo(m.createdAt)}</div>
          </div>
        </div>
      `).join('');
    } catch {
      el.innerHTML = '<p class="text-muted" style="font-size:0.87rem;">Could not load bot messages.</p>';
    }
  }

  // ── Behavioral patterns ────────────────────────────────────
  async function loadPatterns() {
    const el = document.getElementById('patternsList');
    try {
      const patterns = await ApiUtil.Behavioral.patterns() || [];
      if (!patterns.length) {
        el.innerHTML = '<p class="text-muted" style="font-size:0.87rem;">No patterns detected yet. Keep logging expenses — insights will appear after 2+ weeks.</p>';
        return;
      }
      const icons = { DAY_SPIKE:'📅', MONTH_END:'📆', MERCHANT_HABIT:'🏪', CATEGORY_CREEP:'📈', IMPULSE_CLUSTER:'⚡', SEASONAL:'🌸' };
      el.innerHTML = patterns.map(p => `
        <div style="display:flex;gap:14px;padding:14px;border-radius:var(--radius-md);background:var(--clr-surface2);">
          <div style="font-size:1.5rem;flex-shrink:0;">${icons[p.patternType] || '🧠'}</div>
          <div>
            <div style="font-family:var(--font-display);font-weight:700;font-size:0.88rem;margin-bottom:4px;">${p.patternType?.replace(/_/g,' ')}</div>
            <div style="font-size:0.85rem;color:var(--clr-muted);line-height:1.55;">${p.description}</div>
            <div style="font-size:0.72rem;color:var(--clr-muted);margin-top:6px;">Detected ${Helpers.timeAgo(p.detectedAt)}</div>
          </div>
        </div>
      `).join('');
    } catch {
      el.innerHTML = '<p class="text-muted" style="font-size:0.87rem;">Could not load patterns.</p>';
    }
  }

  // ── Predictive forecast ────────────────────────────────────
  async function loadForecast() {
    const el = document.getElementById('forecastList');
    try {
      const data = await ApiUtil.Predictive.forecast() || [];
      if (!data.length) {
        el.innerHTML = '<p class="text-muted" style="font-size:0.87rem;">No forecast available yet.</p>';
        return;
      }
      el.innerHTML = data.map(f => {
        const risk   = f.projectedTotal > f.budget;
        const pct    = Math.round((f.projectedTotal / f.budget) * 100);
        return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--clr-border);">
            <div>
              <div style="font-family:var(--font-display);font-weight:600;font-size:0.88rem;">${Helpers.CATEGORY_META[f.categoryName]?.icon || '📦'} ${f.categoryName}</div>
              <div style="font-size:0.75rem;color:var(--clr-muted);">${risk ? `⚠️ ${f.daysToBreach} days to breach` : 'On track'}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-family:var(--font-display);font-weight:700;font-size:0.9rem;color:${risk ? 'var(--clr-accent2)' : 'var(--clr-accent)'};">${Helpers.fmt(f.projectedTotal)}</div>
              <div style="font-size:0.72rem;color:var(--clr-muted);">${pct}% of ${Helpers.fmt(f.budget)}</div>
            </div>
          </div>
        `;
      }).join('');
    } catch {
      el.innerHTML = '<p class="text-muted" style="font-size:0.87rem;">Forecast unavailable.</p>';
    }
  }

  // ── Emotional spend log ────────────────────────────────────
  async function loadEmotionalLog() {
    const el = document.getElementById('emotionalLog');
    try {
      const expenses = await ApiUtil.Expenses.list() || [];
      const emotional = expenses.filter(e => e.isEmotionalSpend);
      if (!emotional.length) {
        el.innerHTML = '<div style="text-align:center;padding:20px;"><div style="font-size:2rem;margin-bottom:8px;">😊</div><p class="text-muted" style="font-size:0.85rem;">No impulse spending detected. Great discipline!</p></div>';
        return;
      }
      el.innerHTML = emotional.slice(0, 5).map(e => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--clr-border);">
          <div>
            <div style="font-family:var(--font-display);font-weight:600;font-size:0.87rem;">${e.description}</div>
            <div style="font-size:0.75rem;color:var(--clr-muted);">${Helpers.formatDate(e.date)} · ${e.categoryName}</div>
          </div>
          <div style="color:var(--clr-warn);font-family:var(--font-display);font-weight:700;">${Helpers.fmt(e.amount)}</div>
        </div>
      `).join('');
    } catch {
      el.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">Could not load emotional spend data.</p>';
    }
  }

  // ── Day-of-week heatmap ────────────────────────────────────
  async function buildHeatmap() {
    const grid = document.getElementById('heatmapGrid');
    const days = document.getElementById('heatmapDays');
    if (!grid) return;

    const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    if (days) days.innerHTML = DAYS.map(d => `<span style="flex:1;text-align:center;font-size:0.68rem;color:var(--clr-muted);">${d}</span>`).join('');

    try {
      const expenses = await ApiUtil.Expenses.list() || [];
      const totals   = Array(7).fill(0);
      expenses.forEach(e => {
        const d = new Date(e.date).getDay();
        totals[d] += e.amount;
      });
      const max = Math.max(...totals, 1);
      grid.innerHTML = totals.map((t, i) => {
        const level = t === 0 ? 0 : Math.ceil((t / max) * 4);
        return `<div class="heatmap-cell" data-level="${level}" title="${DAYS[i]}: ${Helpers.fmt(t)}">${DAYS[i].slice(0,2)}</div>`;
      }).join('');
    } catch {
      grid.innerHTML = DAYS.map(d => `<div class="heatmap-cell" data-level="0">${d.slice(0,2)}</div>`).join('');
    }
  }

  // ── Category trend chart ───────────────────────────────────
  async function buildTrendChart() {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;
    try {
      const expenses = await ApiUtil.Expenses.list() || [];
      // Group by month
      const months = {};
      expenses.forEach(e => {
        const m = e.date?.slice(0, 7);
        if (!m) return;
        if (!months[m]) months[m] = {};
        months[m][e.categoryName] = (months[m][e.categoryName] || 0) + e.amount;
      });
      const labels   = Object.keys(months).sort().slice(-3);
      const cats     = ['Food & Dining','Shopping','Entertainment','Transport'];
      const colors   = ['#6c63ff','#00e5a0','#ffd166','#ff6b6b'];

      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: labels.map(l => new Date(l+'-01').toLocaleDateString('en-IN',{month:'short'})),
          datasets: cats.map((cat, i) => ({
            label: cat,
            data: labels.map(l => months[l]?.[cat] || 0),
            backgroundColor: colors[i] + '99',
            borderColor: colors[i],
            borderWidth: 1,
            borderRadius: 4,
          })),
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: '#7a7f96', font: { size: 11 } } } },
          scales: {
            x: { grid: { color: '#252a38' }, ticks: { color: '#7a7f96' } },
            y: { grid: { color: '#252a38' }, ticks: { color: '#7a7f96', callback: v => '₹'+v } },
          },
        },
      });
    } catch {}
  }

  return { init };
})();
