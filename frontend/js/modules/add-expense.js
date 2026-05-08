/* ============================================================
   js/modules/add-expense.js
   Handles manual expense entry, 3-layer auto-classification,
   duplicate detection, anomaly warning, emotional guard
   ============================================================ */

const AddExpenseModule = (() => {
  window.AddExpenseModule = {}; // Ensure early global access

  let selectedCategory = null;
  let pendingSubmit    = false;
  let recentExpenses   = [];

  // ── Init ───────────────────────────────────────────────────
  async function init() {
    if (!StorageUtil.requireAuth()) return;

    // Set today as default date
    const dateEl = document.getElementById('expDate');
    if (dateEl) dateEl.value = Helpers.todayStr();

    buildCategoryGrid();
    await Promise.all([loadBudgetStatus(), loadRecentExpenses()]);
    checkConsistency(); // Background task
    bindEvents();
    bindOverrideModal();
    bindOcrEvents();
  }

  // --- Consistency & Gap Detection ---
  async function checkConsistency() {
      const container = document.getElementById('missingDaysContainer');
      const card = document.getElementById('consistencyCard');
      const hideBtn = document.getElementById('hideConsistencyBtn');
      if (!container || !card) return;

      hideBtn?.addEventListener('click', () => card.classList.add('hidden'));

      try {
          const user = await ApiUtil.Auth.me();
          const loggedDates = (await ApiUtil.Expenses.getLoggedDates()) || [];
          const loggedSet = new Set(loggedDates);
          const today = new Date();
          const missing = [];
          const createdAt = new Date(user.createdAt);
          // Check last 30 days or since account creation (Strict limit)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(today.getDate() - 30);
          const start = new Date(Math.max(createdAt.getTime() || 0, thirtyDaysAgo.getTime()));
          start.setHours(0,0,0,0);

          for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
              const iso = d.toISOString().split('T')[0];
              if (!loggedSet.has(iso)) {
                  missing.push(new Date(d));
              }
          }

          if (missing.length === 0) {
              card.classList.add('hidden');
              return;
          }

          const dateList = missing.slice(-7).reverse();
          container.innerHTML = `
            <div style="font-size:0.85rem; padding:8px 12px; background:rgba(255,255,255,0.6); border-radius:8px; border:1px solid rgba(var(--blue-rgb), 0.2);">
              <span style="font-weight:600; color:var(--clr-accent2);">⚠️ ${missing.length} days incomplete:</span> 
              <span style="color:var(--text-muted); margin-left:8px;">
                ${dateList.map(d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })).join(', ')}
                ${missing.length > 7 ? ' ... and more' : ''}
              </span>
            </div>
          `;
          card.classList.remove('hidden');
      } catch (err) {
          console.error("Consistency check failed:", err);
          card.classList.add('hidden');
      }
  }

  // --- OCR Results Review ---
  let scannedItems = [];

  function bindOcrEvents() {
      document.getElementById('ocrSyncAllBtn')?.addEventListener('click', handleOcrSync);
      document.getElementById('ocrDiscardBtn')?.addEventListener('click', () => {
          scannedItems = [];
          document.getElementById('ocrResultsCard')?.classList.add('hidden');
      });
  }

  function showOcrResults(items) {
      scannedItems = items;
      const card = document.getElementById('ocrResultsCard');
      const list = document.getElementById('ocrResultsList');
      const countChip = document.getElementById('ocrCountChip');
      if (!card || !list || !countChip) return;

      countChip.textContent = `${items.length} items`;
      
      list.innerHTML = `
        <table class="ocr-results-table">
          <thead>
            <tr>
              <th>Merchant</th>
              <th>Amount</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => {
              const classify = Helpers.classifyExpense(item.description, item.amount);
              const isUnknown = classify.category === 'Other' || classify.confidence === 'LOW';
              return `
                <tr data-idx="${idx}" class="${isUnknown ? 'row-unknown' : ''}">
                  <td><input type="text" class="ocr-input ocr-desc" value="${item.description}" /></td>
                  <td><input type="number" class="ocr-input ocr-amt ocr-input-amt" value="${item.amount}" step="0.01" /></td>
                  <td><input type="date" class="ocr-input ocr-date" value="${item.date}" /></td>
                  <td><button class="btn-icon ocr-remove" data-idx="${idx}" title="Remove">✕</button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      list.querySelectorAll('.ocr-remove').forEach(btn => {
          btn.addEventListener('click', (e) => {
              const idx = parseInt(e.currentTarget.dataset.idx);
              scannedItems.splice(idx, 1);
              if (scannedItems.length === 0) {
                  card.classList.add('hidden');
              } else {
                  showOcrResults(scannedItems);
              }
          });
      });

      card.classList.remove('hidden');
      card.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleOcrSync() {
      const list = document.getElementById('ocrResultsList');
      const rows = list.querySelectorAll('tbody tr');
      const payload = [];

      rows.forEach(row => {
          const desc = row.querySelector('.ocr-desc').value.trim();
          const amt  = parseFloat(row.querySelector('.ocr-amt').value);
          const date = row.querySelector('.ocr-date').value;
          if (desc && amt > 0 && date) {
              payload.push({ description: desc, amount: amt, date: date });
          }
      });

      if (!payload.length) return;

      const btn = document.getElementById('ocrSyncAllBtn');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Syncing...';

      try {
          const res = await ApiUtil.Expenses.bulk(payload);
          if (res && res.length > 0) {
              Toast.success(`✨ Successfully synced ${res.length} expenses!`);
              document.getElementById('ocrResultsCard').classList.add('hidden');
              scannedItems = [];
              
              // Refresh budget and recent
              await loadBudgetStatus();
              await loadRecentExpenses();

              // Check if any need mapping
              const unmapped = res.filter(r => r.classificationConfidence === 'LOW' || r.categoryName === 'Other');
              if (unmapped.length > 0) {
                  await processUnknownMerchants(unmapped);
              }
          } else {
              Toast.warn('No items were saved. They might be duplicates or outside your budget window.');
          }
      } catch (err) {
          Toast.error(err.message || 'Bulk sync failed.');
      } finally {
          btn.disabled = false;
          btn.textContent = originalText;
      }
  }

  // ── Category grid ──────────────────────────────────────────
  function buildCategoryGrid() {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;
    grid.innerHTML = Helpers.ALL_CATEGORIES.map(cat => `
      <div class="cat-tile" data-cat="${cat.name}" title="${cat.type}">
        <span class="cat-tile-icon">${cat.icon}</span>
        <span>${cat.name}</span>
      </div>
    `).join('');

    grid.querySelectorAll('.cat-tile').forEach(chip => {
      chip.addEventListener('click', () => {
        grid.querySelectorAll('.cat-tile').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        selectedCategory = chip.dataset.cat;
        document.getElementById('categoryError')?.classList.remove('show');
      });
    });
  }

  // ── Auto-classification on description input ───────────────
  function bindEvents() {
    const descEl = document.getElementById('expDescription');
    const amtEl  = document.getElementById('expAmount');

    descEl?.addEventListener('input', () => runClassify());
    amtEl?.addEventListener('input',  () => {
      runClassify();
      checkDuplicate();
    });
    descEl?.addEventListener('blur', () => checkDuplicate());

    document.getElementById('addExpenseForm')?.addEventListener('submit', handleSubmit);

    // Emotional guard buttons
    document.getElementById('emotionalProceed')?.addEventListener('click', () => {
      closeEmotionalOverlay();
      doSave();
    });
    document.getElementById('emotionalReview')?.addEventListener('click', () => {
      closeEmotionalOverlay();
      // Log impulse-buster interaction (backend handles badge)
      Toast.info('Take your time — no rush. The form is still here when you\'re ready.');
    });
  }

  function runClassify() {
    const desc = document.getElementById('expDescription')?.value || '';
    const amt  = document.getElementById('expAmount')?.value || 0;
    if (!desc.trim()) return;

    const result = Helpers.classifyExpense(desc, amt);

    // Show banner
    const banner = document.getElementById('classifyBanner');
    const catName = document.getElementById('classifyCategory');
    const chip    = document.getElementById('classifyChip');
    if (banner && catName && chip) {
      catName.textContent = result.category;
      chip.textContent    = result.type;
      chip.className      = `chip ${result.chipClass}`;
      banner.classList.remove('hidden');
    }

    // Auto-select category chip
    const grid = document.getElementById('categoryGrid');
    if (grid) {
      grid.querySelectorAll('.cat-tile').forEach(c => {
        c.classList.remove('selected');
        if (c.dataset.cat === result.category) {
          c.classList.add('selected');
          selectedCategory = result.category;
        }
      });
    }
  }

  async function checkDuplicate() {
    const desc = document.getElementById('expDescription')?.value?.trim() || '';
    const amt  = parseFloat(document.getElementById('expAmount')?.value || 0);
    const date = document.getElementById('expDate')?.value || '';
    if (!desc || !amt || !date) return;

    // Local duplicate check against recent expenses
    const dupWarn = document.getElementById('duplicateWarning');
    const isDup = recentExpenses.some(e => {
      const sameDate = e.date === date;
      const sameAmt  = Math.abs(e.amount - amt) < 0.01;
      const sameDesc = e.description.toLowerCase().includes(desc.toLowerCase().slice(0, 5));
      return sameDate && sameAmt && sameDesc;
    });
    if (dupWarn) dupWarn.classList.toggle('hidden', !isDup);
  }

  // ── Anomaly check ──────────────────────────────────────────
  function checkAnomaly(amount) {
    if (!recentExpenses.length || !selectedCategory) return false;
    const sameCat = recentExpenses.filter(e => e.categoryName === selectedCategory);
    if (sameCat.length < 3) return false;
    const avg = sameCat.reduce((s, e) => s + e.amount, 0) / sameCat.length;
    return amount > avg * 2.5;
  }

  // ── Emotional guard check ──────────────────────────────────
  function checkEmotionalGuard() {
    const now    = Date.now();
    const window = 90 * 60 * 1000; // 90 minutes
    const recent = recentExpenses.filter(e => {
      const t = new Date(e.date).getTime();
      return (now - t) < window;
    });

    const hour = new Date().getHours();
    const isLateNight = hour >= 23 || hour <= 3;

    const user = StorageUtil.getUser();
    const persona = Helpers.getBotPersona(user);

    if (recent.length >= 3 || isLateNight) {
      return { triggered: true, isLateNight, count: recent.length, persona };
    }
    return { triggered: false };
  }

  // ── Handle form submit ─────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    const amount = parseFloat(document.getElementById('expAmount').value);

    // Check anomaly
    const isAnomaly = checkAnomaly(amount);
    const anomalyEl = document.getElementById('anomalyWarning');
    if (anomalyEl) anomalyEl.classList.toggle('hidden', !isAnomaly);

    // Check emotional guard
    const guard = checkEmotionalGuard();
    if (guard.triggered && !pendingSubmit) {
      pendingSubmit = true;
      showEmotionalOverlay(guard);
      return;
    }

    doSave();
  }

  async function doSave() {
    pendingSubmit = false;
    setLoading(true);

    const payload = {
      amount:      parseFloat(document.getElementById('expAmount').value),
      description: document.getElementById('expDescription').value.trim(),
      date:        document.getElementById('expDate').value,
      categoryName: selectedCategory,
    };

    try {
      const res = await ApiUtil.Expenses.add(payload);
      
      if (res.classificationConfidence === 'LOW' || res.categoryName === 'Other') {
        Toast.warn('Merchant not recognized. Please map it to teach the AI!');
        openOverrideModal(res.id, payload.description);
      } else {
        Toast.success('Expense saved! 🎉');
      }

      // Reset form
      document.getElementById('addExpenseForm').reset();
      document.getElementById('expDate').value = Helpers.todayStr();
      selectedCategory = null;
      document.querySelectorAll('.cat-tile').forEach(c => c.classList.remove('selected'));
      document.getElementById('classifyBanner')?.classList.add('hidden');
      document.getElementById('duplicateWarning')?.classList.add('hidden');
      document.getElementById('anomalyWarning')?.classList.add('hidden');

      await loadRecentExpenses();
      await loadBudgetStatus();

    } catch (err) {
      const errEl = document.getElementById('saveExpError');
      if (errEl) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
      Toast.error(err.message || 'Failed to save expense.');
    } finally {
      setLoading(false);
    }
  }

  // ── Validation ─────────────────────────────────────────────
  function validateForm() {
    let ok = true;

    const amt = parseFloat(document.getElementById('expAmount')?.value || 0);
    const amtErr = document.getElementById('amountError');
    if (!amt || amt <= 0) {
      document.getElementById('expAmount')?.classList.add('error');
      amtErr?.classList.add('show');
      ok = false;
    } else {
      document.getElementById('expAmount')?.classList.remove('error');
      amtErr?.classList.remove('show');
    }

    const desc = document.getElementById('expDescription')?.value?.trim();
    const descErr = document.getElementById('descError');
    if (!desc) {
      document.getElementById('expDescription')?.classList.add('error');
      descErr?.classList.add('show');
      ok = false;
    } else {
      document.getElementById('expDescription')?.classList.remove('error');
      descErr?.classList.remove('show');
    }

    const date = document.getElementById('expDate')?.value;
    const dateErr = document.getElementById('dateError');
    if (!date) {
      document.getElementById('expDate')?.classList.add('error');
      dateErr?.classList.add('show');
      ok = false;
    } else {
      document.getElementById('expDate')?.classList.remove('error');
      dateErr?.classList.remove('show');
    }

    const catErr = document.getElementById('categoryError');
    if (!selectedCategory) {
      catErr?.classList.add('show');
      ok = false;
    } else {
      catErr?.classList.remove('show');
    }

    return ok;
  }

  // ── Emotional overlay ──────────────────────────────────────
  function showEmotionalOverlay(guard) {
    const overlay = document.getElementById('emotionalOverlay');
    const msg     = document.getElementById('emotionalMsg');
    if (!overlay) return;

    const user    = StorageUtil.getUser();
    const name    = user?.name?.split(' ')[0] || 'there';
    const persona = guard.persona;

    let text = '';
    if (guard.isLateNight) {
      text = persona.emoji
        ? `Late night spending detected 🌙 ${name}. It's past midnight — is this something you planned or an impulse? Take a moment before saving.`
        : `${name}, it's late. Consider whether this purchase is planned or impulsive before saving.`;
    } else {
      text = persona.emoji
        ? `You've made <strong>${guard.count}</strong> purchases in the last 90 minutes 🛒 ${name}. That's a spending cluster. Is this all planned?`
        : `${name}, you've had ${guard.count} transactions in a short window. Take a moment — is this all intentional?`;
    }

    if (msg) msg.innerHTML = text;
    overlay.classList.add('show');
  }

  function closeEmotionalOverlay() {
    document.getElementById('emotionalOverlay')?.classList.remove('show');
  }

  // --- Category Override ---
  let overrideTargetId = null;
  let overrideSelectedCategory = null;
  let overrideResolve = null;

  function openOverrideModal(id, merchantName) {
    return new Promise((resolve) => {
      overrideTargetId = id;
      overrideSelectedCategory = null;
      overrideResolve = resolve;

      const nameEl = document.getElementById('overrideMerchantName');
      if (nameEl) nameEl.textContent = merchantName || 'This shop';

      const grid = document.getElementById('overrideCategoryGrid');
      if (grid) {
        grid.innerHTML = Object.entries(Helpers.CATEGORY_META).map(([name, meta]) => `
          <div class="cat-tile" data-id="${meta.id || 1}" data-name="${name}">
            <span class="cat-tile-icon">${meta.icon}</span> <span>${name}</span>
          </div>
        `).join('');

        grid.querySelectorAll('.cat-tile').forEach(chip => {
          chip.addEventListener('click', () => {
            grid.querySelectorAll('.cat-tile').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
            overrideSelectedCategory = chip.dataset.id || 1; // Backend expects category ID
          });
        });
      }
      document.getElementById('overrideModal')?.classList.add('open');
    });
  }

  function bindOverrideModal() {
    document.getElementById('overrideCancelBtn')?.addEventListener('click', () => {
      document.getElementById('overrideModal')?.classList.remove('open');
      overrideTargetId = null;
      if (overrideResolve) {
        overrideResolve(false);
        overrideResolve = null;
      }
    });

    document.getElementById('overrideConfirmBtn')?.addEventListener('click', async () => {
      if (!overrideTargetId || !overrideSelectedCategory) {
        Toast.warn('Please select a category first.');
        return;
      }
      try {
        await ApiUtil.Expenses.updateCategory(overrideTargetId, overrideSelectedCategory);
        Toast.success('Merchant mapping saved & learned! 🧠');
        document.getElementById('overrideModal')?.classList.remove('open');
        await loadRecentExpenses();
        await loadBudgetStatus();
        
        if (overrideResolve) {
          overrideResolve(true);
          overrideResolve = null;
        }
      } catch (err) {
        Toast.error(err.message || 'Mapping failed.');
      }
    });
  }

  async function processUnknownMerchants(unmappedList) {
    for (const exp of unmappedList) {
      await openOverrideModal(exp.id, exp.description);
    }
    if (unmappedList.length > 0) {
      Toast.success(`Finished mapping new merchants!`);
    }
  }

  // ── Load budget status sidebar ─────────────────────────────
  async function loadBudgetStatus() {
    const el = document.getElementById('budgetStatusList');
    if (!el) return;
    try {
      const budget = await ApiUtil.Budget.current();
      if (!budget || !budget.categoryBreakdown) {
        el.innerHTML = '<p class="text-muted" style="font-size:0.85rem;padding:8px;">No budget found. <a href="dashboard.html">Set up →</a></p>';
        return;
      }
      el.innerHTML = budget.categoryBreakdown.slice(0, 5).map(cat => {
        const pct = Math.min(100, Math.round((cat.spent / cat.budget) * 100));
        const cls = Helpers.pctClass(pct);
        return `
          <div class="category-item">
            <div class="category-row">
              <span class="category-name">${Helpers.CATEGORY_META[cat.name]?.icon || '📦'} ${cat.name}</span>
              <span class="category-amounts">${Helpers.fmt(cat.spent)} / <strong>${Helpers.fmt(cat.budget)}</strong></span>
            </div>
            <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%;"></div></div>
          </div>
        `;
      }).join('');
    } catch {
      el.innerHTML = '<p class="text-muted" style="font-size:0.85rem;padding:8px;">Budget data unavailable.</p>';
    }
  }

  async function loadRecentExpenses() {
    const el = document.getElementById('recentExpensesMini');
    try {
      const data = await ApiUtil.Expenses.list();
      recentExpenses = (data || []).slice(0, 20);
      if (!el) return;
      const show = recentExpenses.slice(0, 4);
      if (!show.length) { el.innerHTML = '<p class="text-muted" style="font-size:0.83rem;padding:8px;">No expenses yet.</p>'; return; }
      el.innerHTML = show.map(e => `
        <div class="txn-item">
          <div class="txn-icon">${Helpers.CATEGORY_META[e.categoryName]?.icon || '📦'}</div>
          <div class="txn-details">
            <div class="txn-name">${e.description}</div>
            <div class="txn-meta">${Helpers.formatDate(e.date)}</div>
          </div>
          <div class="txn-amount debit">${Helpers.fmt(e.amount)}</div>
        </div>
      `).join('');
    } catch {
      if (el) el.innerHTML = '<p class="text-muted" style="font-size:0.83rem;padding:8px;">Could not load recent.</p>';
    }
  }

  // ── Loading state ──────────────────────────────────────────
  function setLoading(on) {
    const btn  = document.getElementById('saveExpBtn');
    const txt  = document.getElementById('saveExpText');
    const spin = document.getElementById('saveExpSpinner');
    if (btn)  btn.disabled = on;
    if (txt)  txt.textContent = on ? 'Saving…' : 'Save Expense';
    if (spin) spin.classList.toggle('hidden', !on);
  }

  const mod = { init, processUnknownMerchants, showOcrResults };
  window.AddExpenseModule = mod;
  return mod;
})();
