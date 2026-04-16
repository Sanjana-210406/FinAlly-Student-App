/* ============================================================
   js/modules/investments.js — Investment Suggestions Module
   ============================================================ */

const InvestmentsModule = (() => {

  const STUDENT_INVESTMENTS = [
    {
      type: 'Beginner · ₹500–₹2,000/month',
      name: 'Digital Gold',
      desc: 'Buy gold digitally in small amounts via apps like PhonePe Gold or Paytm Gold. No locker fees, fully liquid, great for beginners.',
      returns: '8–12% (market-linked)',
      risk: 'Low-Medium',
      minAmount: 500,
    },
    {
      type: 'Beginner · ₹500–₹2,000/month',
      name: 'Bank Recurring Deposit (RD)',
      desc: 'Fixed monthly deposits with guaranteed returns. Ideal if you want zero risk and can commit a fixed amount monthly.',
      returns: '6.5–7.5% p.a.',
      risk: 'Very Low',
      minAmount: 500,
    },
    {
      type: 'Intermediate · ₹2,000+/month',
      name: 'Index Mutual Fund SIP',
      desc: 'Invest in Nifty 50 or Sensex index funds via SIP. Low cost, diversified, and historically strong long-term returns. Best for 3+ year horizon.',
      returns: '12–15% p.a. (historical)',
      risk: 'Medium',
      minAmount: 2000,
    },
    {
      type: 'Intermediate · ₹2,000+/month',
      name: 'Public Provident Fund (PPF)',
      desc: 'Government-backed long-term savings with tax-free returns. 15-year lock-in but partial withdrawal allowed after 7 years.',
      returns: '7.1% p.a. (tax-free)',
      risk: 'Very Low',
      minAmount: 500,
    },
  ];

  const init = async () => {
    if (!StorageUtil.requireAuth()) return;
    await loadInvestments();
  };

  const loadInvestments = async () => {
    const container = document.getElementById('investContent');
    if (!container) return;

    try {
      const data = await ApiUtil.Investments.suggestions();
      if (data && data.suggestions) {
        renderSuggestions(data.suggestions, data.surplus);
      } else {
        renderLocked();
      }
    } catch (err) {
      // If 403 (locked) or error, check emergency fund
      if (err.message?.includes('403') || err.message?.includes('locked')) {
        renderLocked();
      } else {
        // Show default student suggestions
        renderSuggestions(STUDENT_INVESTMENTS, null);
      }
    }
  };

  const renderLocked = () => {
    const container = document.getElementById('investContent');
    container.innerHTML = `
      <div class="invest-locked">
        <div class="invest-locked-icon">🔒</div>
        <h2 class="invest-locked-title">Investments Locked</h2>
        <p style="max-width:420px;margin:0 auto 24px;">
          Complete your <strong>Emergency Fund</strong> goal first.
          This protects you from financial emergencies before you start investing.
          Once your emergency fund is 100% funded, investment suggestions unlock automatically.
        </p>
        <a href="goals.html" class="btn btn-primary btn-lg">
          🎯 &nbsp;Go to Goals
        </a>
      </div>`;
  };

  const renderSuggestions = (suggestions, surplus) => {
    const container = document.getElementById('investContent');
    const surplusHtml = surplus ? `
      <div class="alert alert-success" style="margin-bottom:24px;">
        🎉 Your Emergency Fund is complete! You have an estimated surplus of <strong>${Helpers.fmt(surplus)}/month</strong> available for investing.
      </div>` : `
      <div class="alert alert-info" style="margin-bottom:24px;">
        📊 These are personalized suggestions based on your Student profile. Start small and stay consistent.
      </div>`;

    const cards = (suggestions.length ? suggestions : STUDENT_INVESTMENTS).map(inv => `
      <div class="invest-card">
        <div class="invest-type">${inv.type}</div>
        <div class="invest-name">${inv.name}</div>
        <div class="invest-desc">${inv.desc}</div>
        <div class="invest-returns">
          <div>
            <div class="invest-ret-label">Expected Returns</div>
            <div class="invest-ret-val">${inv.returns}</div>
          </div>
          <div style="text-align:right;">
            <div class="invest-ret-label">Risk Level</div>
            <div style="font-family:var(--font-display);font-weight:700;font-size:0.88rem;color:${
              inv.risk === 'Very Low' ? 'var(--clr-accent)' :
              inv.risk === 'Low-Medium' ? 'var(--clr-warn)' : 'var(--clr-primary-lt)'
            };">${inv.risk}</div>
          </div>
        </div>
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--clr-border);font-size:0.78rem;color:var(--clr-muted);">
          Min. start: <strong style="color:var(--clr-text);">${Helpers.fmt(inv.minAmount)}/month</strong>
        </div>
      </div>`).join('');

    container.innerHTML = surplusHtml + `
      <div class="alert alert-warn" style="margin-bottom:20px;font-size:0.83rem;">
        ⚠️ These are educational suggestions only, not financial advice. Consult a SEBI-registered advisor before investing.
      </div>
      <div class="invest-grid">${cards}</div>`;
  };

  return { init };
})();
