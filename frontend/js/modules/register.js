/* ============================================================
   js/modules/register.js — Multi-step registration logic
   Handles gender/age/profile personalization
   ============================================================ */

const RegisterModule = (() => {

  let currentStep = 1;
  let selectedGender = '';

  // ── Step navigation ────────────────────────────────────────
  const goToStep = (step) => {
    document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`step${step}`)?.classList.add('active');

    for (let i = 1; i <= 3; i++) {
      const dot  = document.getElementById(`stepDot${i}`);
      const line = document.getElementById(`stepLine${i}`);
      if (!dot) continue;
      dot.classList.remove('active', 'done');
      if (i < step)  { dot.classList.add('done'); dot.textContent = '✓'; }
      if (i === step) { dot.classList.add('active'); dot.textContent = i; }
      if (i > step)  { dot.textContent = i; }
      if (line) line.classList.toggle('done', i < step);
    }
    currentStep = step;
  };

  // ── Validation helpers ─────────────────────────────────────
  const showErr = (id, msg) => {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.add('show'); }
    const inp = document.getElementById(id.replace('Error', '').replace('reg', 'reg'));
    if (inp) inp.classList.add('error');
  };
  const clearErr = (id) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  };

  const validateStep1 = () => {
    let ok = true;
    const name  = document.getElementById('regName')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    const pw    = document.getElementById('regPassword')?.value;
    const cpw   = document.getElementById('regConfirmPassword')?.value;

    if (!name)                           { showErr('nameError', 'Enter your name.'); ok = false; } else clearErr('nameError');
    if (!email || !/\S+@\S+\.\S+/.test(email)) { showErr('regEmailError', 'Enter a valid email.'); ok = false; } else clearErr('regEmailError');
    if (!pw || pw.length < 8)           { showErr('regPasswordError', 'Min 8 characters.'); ok = false; } else clearErr('regPasswordError');
    if (pw !== cpw)                      { showErr('confirmPasswordError', 'Passwords do not match.'); ok = false; } else clearErr('confirmPasswordError');
    return ok;
  };

  const validateStep2 = () => {
    let ok = true;
    const age = parseInt(document.getElementById('regAge')?.value);
    if (!selectedGender) { document.getElementById('genderError')?.classList.add('show'); ok = false; }
    else                  { document.getElementById('genderError')?.classList.remove('show'); }
    if (!age || age < 15 || age > 30) { showErr('ageError', 'Enter age between 15 and 30.'); ok = false; } else clearErr('ageError');
    return ok;
  };

  const validateStep3 = () => {
    const income = parseFloat(document.getElementById('regIncome')?.value);
    if (!income || income < 500) { showErr('incomeError', 'Enter a valid monthly income (min ₹500).'); return false; }
    clearErr('incomeError');
    return true;
  };

  // ── Budget preview ─────────────────────────────────────────
  const updateBudgetPreview = () => {
    const income = parseFloat(document.getElementById('regIncome')?.value || 0);
    const preview = document.getElementById('budgetPreview');
    const breakdown = document.getElementById('budgetBreakdown');
    if (!preview || !breakdown || income < 500) { preview?.style && (preview.style.display = 'none'); return; }

    const alloc = Helpers.budgetAllocation(income);
    preview.style.display = 'block';
    breakdown.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${[
          ['🔒 Savings (Locked)', alloc.savings, 'var(--clr-accent)'],
          ['🏠 Needs',            alloc.needs,   'var(--clr-primary-lt)'],
          ['🎮 Wants',            alloc.wants,   'var(--clr-warn)'],
          ['🛡️ Buffer',           alloc.buffer,  'var(--clr-muted)'],
        ].map(([label, val, color]) => `
          <div style="background:var(--clr-surface2);border-radius:10px;padding:12px;">
            <div style="font-size:0.75rem;color:var(--clr-muted);font-family:var(--font-display);font-weight:600;margin-bottom:4px;">${label}</div>
            <div style="font-family:var(--font-display);font-weight:800;font-size:1rem;color:${color};">${Helpers.fmt(val)}</div>
          </div>
        `).join('')}
      </div>
    `;
  };

  // ── Submit registration ────────────────────────────────────
  const submit = async () => {
    if (!validateStep3()) return;

    const btn     = document.getElementById('submitBtn');
    const txt     = document.getElementById('submitText');
    const spinner = document.getElementById('submitSpinner');
    btn.disabled = true;
    txt.textContent = 'Creating account…';
    spinner.classList.remove('hidden');
    document.getElementById('registerError')?.classList.add('hidden');

    const payload = {
      name:          document.getElementById('regName')?.value.trim(),
      email:         document.getElementById('regEmail')?.value.trim(),
      password:      document.getElementById('regPassword')?.value,
      gender:        selectedGender,
      age:           parseInt(document.getElementById('regAge')?.value),
      college:       document.getElementById('regCollege')?.value.trim(),
      yearOfStudy:   document.getElementById('regYear')?.value,
      profileType:   'STUDENT',
      monthlyIncome: parseFloat(document.getElementById('regIncome')?.value),
      incomeSource:  document.getElementById('regIncomeSource')?.value,
      yearlyGoal:    parseFloat(document.getElementById('regYearlyGoal')?.value) || null,
    };

    try {
      const res = await ApiUtil.Auth.register(payload);
      StorageUtil.setToken(res.token);
      StorageUtil.setUser(res.user);
      Toast.success('Account created! Welcome to FinAlly 🎉');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
    } catch (err) {
      const errEl = document.getElementById('registerError');
      if (errEl) { errEl.textContent = err.message || 'Registration failed.'; errEl.classList.remove('hidden'); }
      btn.disabled = false;
      txt.textContent = '🚀 Create Account';
      spinner.classList.add('hidden');
    }
  };

  // ── Init ───────────────────────────────────────────────────
  const init = () => {
    if (StorageUtil.getToken()) { window.location.href = 'dashboard.html'; return; }

    // Gender pills
    document.querySelectorAll('.gender-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.gender-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        selectedGender = pill.dataset.value;
        document.getElementById('genderError')?.classList.remove('show');
      });
    });

    // Set today as default date
    document.getElementById('regAge')?.addEventListener('input', () => {
      const age = parseInt(document.getElementById('regAge').value);
      if (age) clearErr('ageError');
    });

    // Step navigation
    document.getElementById('step1Next')?.addEventListener('click', () => {
      if (validateStep1()) goToStep(2);
    });
    document.getElementById('step2Back')?.addEventListener('click', () => goToStep(1));
    document.getElementById('step2Next')?.addEventListener('click', () => {
      if (validateStep2()) goToStep(3);
    });
    document.getElementById('step3Back')?.addEventListener('click', () => goToStep(2));
    document.getElementById('submitBtn')?.addEventListener('click', submit);

    // Live budget preview
    document.getElementById('regIncome')?.addEventListener('input', updateBudgetPreview);
  };

  document.addEventListener('DOMContentLoaded', init);
  return { init };
})();
