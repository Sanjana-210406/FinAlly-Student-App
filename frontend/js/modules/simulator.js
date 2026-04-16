/* ============================================================
   js/modules/simulator.js — What-If Simulator Module
   ============================================================ */

const SimulatorModule = (() => {

  let currentScenario = 'income_drop';
  let budget = null;

  const SCENARIOS = {
    income_drop: {
      label: 'Income Drop',
      inputs: [
        { id: 'dropPct', label: 'Income reduction (%)', type: 'number', placeholder: 'e.g. 30', min: 1, max: 99 }
      ]
    },
    new_expense: {
      label: 'New Monthly Expense',
      inputs: [
        { id: 'newExpAmount', label: 'Monthly expense amount (₹)', type: 'number', placeholder: 'e.g. 2000' },
        { id: 'newExpLabel',  label: 'What is it for?',            type: 'text',   placeholder: 'e.g. Gym, Course fee' }
      ]
    },
    job_loss: {
      label: 'Allowance / Job Loss',
      inputs: [
        { id: 'lossMonths', label: 'Duration without income (months)', type: 'number', placeholder: 'e.g. 3', min: 1, max: 24 }
      ]
    },
    new_goal: {
      label: 'Add New Savings Goal',
      inputs: [
        { id: 'goalAmount',  label: 'Goal target amount (₹)',     type: 'number', placeholder: 'e.g. 15000' },
        { id: 'goalMonths',  label: 'Months to achieve it',       type: 'number', placeholder: 'e.g. 6',    min: 1 }
      ]
    }
  };

  const init = async () => {
    if (!StorageUtil.requireAuth()) return;

    try {
      budget = await ApiUtil.Budget.current();
    } catch { budget = null; }

    setupScenarioButtons();
    renderInputs('income_drop');
    document.getElementById('runSimBtn')?.addEventListener('click', runSimulation);
  };

  const setupScenarioButtons = () => {
    document.querySelectorAll('.scenario-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentScenario = btn.dataset.scenario;
        renderInputs(currentScenario);
        document.getElementById('simResults').style.display   = 'none';
        document.getElementById('simPlaceholder').style.display = '';
      });
    });
  };

  const renderInputs = (scenario) => {
    const container = document.getElementById('simInputs');
    if (!container) return;
    const s = SCENARIOS[scenario];
    container.innerHTML = s.inputs.map(inp => `
      <div class="form-group">
        <label class="form-label" for="${inp.id}">${inp.label}</label>
        <input class="form-input" id="${inp.id}" type="${inp.type}" placeholder="${inp.placeholder}"
          ${inp.min !== undefined ? `min="${inp.min}"` : ''}
          ${inp.max !== undefined ? `max="${inp.max}"` : ''} />
      </div>
    `).join('');
  };

  const collectInputs = () => {
    const s = SCENARIOS[currentScenario];
    const params = { scenario: currentScenario };
    for (const inp of s.inputs) {
      const el = document.getElementById(inp.id);
      if (!el) continue;
      params[inp.id] = inp.type === 'number' ? parseFloat(el.value) : el.value;
    }
    return params;
  };

  const runSimulation = async () => {
    const params = collectInputs();
    const btn = document.getElementById('runSimBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Simulating…';

    try {
      let result;
      try {
        result = await ApiUtil.Simulator.run(params);
      } catch {
        // Fallback: compute client-side if backend unavailable
        result = computeLocally(params);
      }
      renderResults(result);
    } catch (err) {
      Toast.error('Simulation failed: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '🔮 Run Simulation';
    }
  };

  // Client-side fallback computation
  const computeLocally = (params) => {
    const income   = budget?.totalIncome || 10000;
    const expenses = budget?.needsAllocation + budget?.wantsAllocation || income * 0.8;
    const savings  = budget?.savingsTarget || income * 0.10;
    const emergency = (budget?.emergencyBuffer || 0);

    if (params.scenario === 'income_drop') {
      const dropPct  = params.dropPct || 30; // Fallback to 30%
      const drop     = dropPct / 100;
      const newInc   = income * (1 - drop);
      const newSav   = newInc * 0.10;
      const newSpend = newInc - newSav;
      return {
        title: `Income Drop by ${dropPct}%`,
        stats: [
          { label: 'New Monthly Income', value: Helpers.fmt(newInc), color: 'var(--clr-accent2)' },
          { label: 'New Savings Target', value: Helpers.fmt(newSav), color: 'var(--clr-warn)' },
          { label: 'Spendable Amount',   value: Helpers.fmt(newSpend - emergency), color: 'var(--clr-text)' },
          { label: 'Income Lost',        value: Helpers.fmt(income - newInc), color: 'var(--clr-accent2)' },
        ],
        insights: [
          newInc < expenses ? `⚠️ Your current expenses (${Helpers.fmt(expenses)}) exceed your new income. You'll need to cut spending.` : `✅ Your expenses still fit within the new income.`,
          `Your savings target reduces to ${Helpers.fmt(newSav)}/month — still achievable with discipline.`,
          `Consider cutting wants by ${Helpers.fmt((income - newInc) * 0.5)} to absorb the income drop.`,
        ]
      };
    }

    if (params.scenario === 'new_expense') {
      const newExpAmount = params.newExpAmount || 1000;
      const newTotal = expenses + newExpAmount;
      const remaining = income - savings - newTotal;
      return {
        title: `Adding ${params.newExpLabel || 'New Expense'}: ${Helpers.fmt(newExpAmount)}/month`,
        stats: [
          { label: 'Current Expenses',  value: Helpers.fmt(expenses),         color: 'var(--clr-muted)' },
          { label: 'New Total Expenses', value: Helpers.fmt(newTotal),         color: 'var(--clr-accent2)' },
          { label: 'Remaining After',    value: Helpers.fmt(Math.max(0,remaining)), color: remaining < 0 ? 'var(--clr-accent2)' : 'var(--clr-accent)' },
          { label: 'Savings Impact',     value: remaining < 0 ? '⚠️ At risk' : '✅ Safe', color: remaining < 0 ? 'var(--clr-accent2)' : 'var(--clr-accent)' },
        ],
        insights: [
          remaining < 0 ? `🚨 Adding this expense puts your budget in deficit by ${Helpers.fmt(Math.abs(remaining))}/month.` : `✅ This expense fits your budget with ${Helpers.fmt(remaining)} remaining.`,
          `To absorb this, reduce your dining or entertainment budget by ${Helpers.fmt(newExpAmount * 0.7)}.`,
        ]
      };
    }

    if (params.scenario === 'job_loss') {
      const months = params.lossMonths || 1;
      const totalDeficit = expenses * months;
      const emergencyMonths = emergency > 0 ? Math.floor(emergency / expenses) : 0;
      return {
        title: `No Income for ${months} Month${months > 1 ? 's' : ''}`,
        stats: [
          { label: 'Total Expenses Due',    value: Helpers.fmt(totalDeficit),    color: 'var(--clr-accent2)' },
          { label: 'Emergency Fund Covers', value: `${emergencyMonths} month${emergencyMonths !== 1 ? 's' : ''}`, color: emergencyMonths >= months ? 'var(--clr-accent)' : 'var(--clr-warn)' },
          { label: 'Monthly Deficit',       value: Helpers.fmt(expenses),        color: 'var(--clr-muted)' },
          { label: 'Fund Needed',           value: Helpers.fmt(expenses * 3),    color: 'var(--clr-text)' },
        ],
        insights: [
          emergencyMonths >= months ? `✅ Your emergency fund can cover ${months} month(s) without income.` : `⚠️ Your emergency fund covers only ${emergencyMonths} month(s). Build it to ${Helpers.fmt(expenses * 3)}.`,
          `Essential-only spending during this period: ${Helpers.fmt(expenses * 0.6)}/month.`,
          `Minimum cuts needed: pause all wants & entertainment.`,
        ]
      };
    }

    if (params.scenario === 'new_goal') {
      const monthly = (params.goalAmount || 0) / (params.goalMonths || 1);
      const newSavings = savings + monthly;
      const feasible   = newSavings <= income * 0.30;
      return {
        title: `New Goal: ${Helpers.fmt(params.goalAmount)} in ${params.goalMonths} months`,
        stats: [
          { label: 'Monthly Contribution', value: Helpers.fmt(monthly),        color: 'var(--clr-primary-lt)' },
          { label: 'Total Savings/Month',  value: Helpers.fmt(newSavings),     color: feasible ? 'var(--clr-accent)' : 'var(--clr-warn)' },
          { label: 'Feasibility',          value: feasible ? '✅ Feasible' : '⚠️ Tight', color: feasible ? 'var(--clr-accent)' : 'var(--clr-warn)' },
          { label: 'Free Cash After',      value: Helpers.fmt(income - expenses - newSavings), color: 'var(--clr-muted)' },
        ],
        insights: [
          feasible ? `✅ This goal is achievable — it requires ${Helpers.fmt(monthly)}/month.` : `⚠️ This goal is a stretch. Consider extending the timeline to ${Math.ceil((params.goalAmount || 0) / (savings * 0.3))} months.`,
          `Cut wants by ${Helpers.fmt(monthly * 0.5)} and redirect to this goal for a comfortable save.`,
        ]
      };
    }

    return { title: 'Simulation', stats: [], insights: ['No data available.'] };
  };

  const renderResults = (result) => {
    document.getElementById('simPlaceholder').style.display = 'none';
    const panel = document.getElementById('simResults');
    panel.style.display = '';

    document.getElementById('simStatGrid').innerHTML = (result.stats || []).map(s => `
      <div class="sim-stat">
        <div class="sim-stat-label">${s.label}</div>
        <div class="sim-stat-val" style="color:${s.color || 'var(--clr-text)'};">${s.value}</div>
      </div>`).join('');

    document.getElementById('simInsights').innerHTML = (result.insights || []).map(i => `
      <div class="alert alert-info" style="font-size:0.85rem;">${i}</div>`).join('');
  };

  return { init };
})();
