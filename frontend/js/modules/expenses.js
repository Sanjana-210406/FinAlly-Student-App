/* ============================================================
   js/modules/expenses.js — Expense history, filters, delete
   ============================================================ */

const ExpensesModule = (() => {
  window.ExpensesModule = {}; // Ensure early global access

  let allExpenses = [];
  let deleteTargetId = null;

  async function init() {
    if (!StorageUtil.requireAuth()) return;
    await loadExpenses();
    checkConsistency(); // Run in background - do not await to prevent blocking!
    bindFilters();
    bindDeleteModal();
    bindOverrideModal();
    bindBulkUpload();
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
          const createdAt = new Date(user.createdAt);
          const today = new Date();
          today.setHours(0,0,0,0);
          
          const missing = [];
          const loggedSet = new Set(loggedDates);

          // Check last 30 days or since account creation (Strict limit to prevent hang)
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

          // Render gaps
          const dateList = missing.slice(-7).reverse(); // Show last 7 missing days
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

  // --- OCR Results (Similar to add-expense.js) ---
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
            ${items.map((item, idx) => `
              <tr data-idx="${idx}">
                <td><input type="text" class="ocr-input ocr-desc" value="${item.description}" /></td>
                <td><input type="number" class="ocr-input ocr-amt ocr-input-amt" value="${item.amount}" step="0.01" /></td>
                <td><input type="date" class="ocr-input ocr-date" value="${item.date}" /></td>
                <td><button class="btn-icon ocr-remove" data-idx="${idx}" title="Remove">✕</button></td>
              </tr>
            `).join('')}
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
              await loadExpenses();
          } else {
              Toast.warn('No items were saved.');
          }
      } catch (err) {
          Toast.error(err.message || 'Sync failed.');
      } finally {
          btn.disabled = false;
          btn.textContent = originalText;
      }
  }

  async function loadExpenses() {
    const tbody = document.getElementById('expenseTableBody');
    try {
      allExpenses = await ApiUtil.Expenses.list() || [];
      populateMonthFilter();
      populateCategoryFilter();
      renderTable(allExpenses);
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:40px;color:var(--clr-accent2);">Failed to load expenses: ${err.message}</td></tr>`;
    }
  }

  function populateMonthFilter() {
    const sel = document.getElementById('filterMonth');
    if (!sel) return;
    const months = [...new Set(allExpenses.map(e => e.date?.slice(0, 7)))].filter(Boolean).sort().reverse();
    months.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = new Date(m + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      sel.appendChild(opt);
    });
  }

  function populateCategoryFilter() {
    const sel = document.getElementById('filterCategory');
    if (!sel) return;
    const cats = [...new Set(allExpenses.map(e => e.categoryName).filter(Boolean))].sort();
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      sel.appendChild(opt);
    });
  }

  function bindFilters() {
    const run = () => {
      const month  = document.getElementById('filterMonth')?.value || '';
      const cat    = document.getElementById('filterCategory')?.value || '';
      const search = (document.getElementById('filterSearch')?.value || '').toLowerCase();

      const filtered = allExpenses.filter(e => {
        const mOk  = !month  || e.date?.startsWith(month);
        const cOk  = !cat    || e.categoryName === cat;
        const sOk  = !search || e.description?.toLowerCase().includes(search);
        return mOk && cOk && sOk;
      });
      renderTable(filtered);
    };

    ['filterMonth','filterCategory','filterSearch'].forEach(id =>
      document.getElementById(id)?.addEventListener('input', run)
    );
    document.getElementById('filterClear')?.addEventListener('click', () => {
      ['filterMonth','filterCategory'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      const s = document.getElementById('filterSearch'); if (s) s.value = '';
      renderTable(allExpenses);
    });
  }

  function renderTable(expenses) {
    const tbody   = document.getElementById('expenseTableBody');
    const counter = document.getElementById('filterCount');
    if (counter) counter.textContent = `${expenses.length} transaction${expenses.length !== 1 ? 's' : ''}`;
    if (!tbody) return;

    if (!expenses.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">No transactions found</div><p>Try changing your filters or <a href="add-expense.html" style="color:var(--clr-primary-lt);">add an expense</a>.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = expenses.map(e => {
      const meta  = Helpers.CATEGORY_META[e.categoryName] || { icon: '📦', chipClass: 'chip-want' };
      const flags = [
        e.isAnomaly       ? '<span class="chip chip-danger" style="font-size:0.68rem;padding:2px 8px;">Anomaly</span>'       : '',
        e.isSubscription  ? '<span class="chip chip-want"   style="font-size:0.68rem;padding:2px 8px;">Sub</span>'          : '',
        e.isEmotionalSpend? '<span class="chip chip-want"   style="font-size:0.68rem;padding:2px 8px;color:var(--clr-warn);">Impulse</span>' : '',
      ].filter(Boolean).join('');

      return `
        <tr>
          <td>${Helpers.formatDate(e.date)}</td>
          <td class="desc-cell">${meta.icon} &nbsp;${e.description}</td>
          <td><span class="chip ${meta.chipClass}" style="font-size:0.72rem;">${e.categoryName || '—'}</span></td>
          <td><span class="chip ${meta.chipClass}" style="font-size:0.72rem;">${meta.type || '—'}</span></td>
          <td class="amt-cell">${Helpers.fmt(e.amount)}</td>
          <td>${flags || '—'}</td>
          <td class="actions-cell">
            <button class="btn btn-ghost btn-sm editCatBtn" data-id="${e.id}" title="Override category">✏️</button>
            <button class="btn btn-ghost btn-sm deleteBtn"  data-id="${e.id}" title="Delete" style="color:var(--clr-accent2);">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');

    // Delete buttons
    tbody.querySelectorAll('.deleteBtn').forEach(btn =>
      btn.addEventListener('click', () => openDeleteModal(btn.dataset.id))
    );
    // Edit category buttons
    tbody.querySelectorAll('.editCatBtn').forEach(btn =>
      btn.addEventListener('click', () => openOverrideModal(btn.dataset.id))
    );
  }

  function openDeleteModal(id) {
    deleteTargetId = id;
    document.getElementById('deleteModal')?.classList.add('open');
  }

  function bindDeleteModal() {
    document.getElementById('deleteCancelBtn')?.addEventListener('click', () => {
      document.getElementById('deleteModal')?.classList.remove('open');
      deleteTargetId = null;
    });
    document.getElementById('deleteConfirmBtn')?.addEventListener('click', async () => {
      if (!deleteTargetId) return;
      try {
        await ApiUtil.Expenses.remove(deleteTargetId);
        Toast.success('Transaction deleted.');
        document.getElementById('deleteModal')?.classList.remove('open');
        deleteTargetId = null;
        await loadExpenses();
      } catch (err) {
        Toast.error(err.message || 'Delete failed.');
      }
    });
  }

  // --- Category Override ---
  let overrideTargetId = null;
  let overrideSelectedCategory = null;

  function openOverrideModal(id) {
    overrideTargetId = id;
    overrideSelectedCategory = null;
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
  }

  function bindOverrideModal() {
    document.getElementById('overrideCancelBtn')?.addEventListener('click', () => {
      document.getElementById('overrideModal')?.classList.remove('open');
      overrideTargetId = null;
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
        await loadExpenses();
      } catch (err) {
        Toast.error(err.message || 'Mapping failed.');
      }
    });
  }

  // --- Bulk Upload ---
  function bindBulkUpload() {
    const input = document.getElementById('uploadCsvInput');
    if (!input) return;
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        const rows = text.split('\n').filter(r => r.trim());
        const payload = [];
        // skip header assuming it has "amount" or "date" somewhere
        let startIdx = rows[0].toLowerCase().includes('date') ? 1 : 0;
        
        for (let i = startIdx; i < rows.length; i++) {
          const cols = rows[i].split(',');
          if (cols.length >= 3) {
            payload.push({
              date: cols[0].trim(),
              description: cols[1].trim(),
              amount: parseFloat(cols[2].trim())
            });
          }
        }
        
        if (!payload.length) { Toast.error('No valid rows found in CSV'); return; }
        
        try {
          const res = await ApiUtil.Expenses.bulk(payload);
          if (res && res.length > 0) {
            Toast.success(`✨ Successfully synced ${res.length} transactions!`);
          } else {
            Toast.warn(`Upload finished, but 0 transactions were saved (duplicates or missing budget).`);
          }
          await loadExpenses();
        } catch (err) {
          Toast.error(err.message || 'Bulk upload failed.');
        }
        input.value = ''; // reset
      };
      reader.readAsText(file);
    });
  }

  // --- OCR Results (Scanner) ---
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
                  <td><input type="number" class="ocr-input ocr-amt" value="${item.amount}" step="0.01" /></td>
                  <td><input type="date" class="ocr-input ocr-date" value="${item.date}" /></td>
                  <td><button class="btn-icon ocr-remove" data-idx="${idx}">✕</button></td>
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
              await loadExpenses();

              // Prompt for unknown merchants
              const unmapped = res.filter(r => r.classificationConfidence === 'LOW' || r.categoryName === 'Other');
              if (unmapped.length > 0) {
                 for (const exp of unmapped) {
                   await openOverrideModal(exp.id, exp.description);
                 }
                 Toast.success('Finished mapping new merchants!');
              }
          }
      } catch (err) {
          Toast.error(err.message || 'Bulk sync failed.');
      } finally {
          btn.disabled = false;
          btn.textContent = originalText;
      }
  }

  const mod = { init, showOcrResults };
  window.ExpensesModule = mod;
  return mod;
})();
