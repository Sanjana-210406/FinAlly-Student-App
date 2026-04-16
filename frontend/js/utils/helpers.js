/* ============================================================
   js/utils/helpers.js — Shared helper functions for FinAlly
   ============================================================ */

const Helpers = (() => {

  // ── Currency formatting ────────────────────────────────────
  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  // ── Date helpers ───────────────────────────────────────────
  const todayStr = () => new Date().toISOString().split('T')[0];

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const monthName = (m, y) => {
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const daysLeft = (dateStr) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const timeAgo = (isoStr) => {
    const diff = Date.now() - new Date(isoStr);
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  // ── Health score ───────────────────────────────────────────
  const scoreRating = (s) => {
    if (s >= 85) return { label: 'Excellent 🌟', color: 'var(--clr-accent)' };
    if (s >= 65) return { label: 'Good 👍',      color: 'var(--clr-primary-lt)' };
    if (s >= 45) return { label: 'Fair ⚡',       color: 'var(--clr-warn)' };
    return             { label: 'Needs Attention ⚠️', color: 'var(--clr-accent2)' };
  };

  const scoreDesc = (s) => {
    if (s >= 85) return 'On track — consider increasing investment allocation.';
    if (s >= 65) return 'Minor overspending in wants — small adjustment needed.';
    if (s >= 45) return 'Savings below target — review spending categories.';
    return             'Immediate budget review required.';
  };

  // ── 3-Layer expense classification (frontend preview) ──────
  const KEYWORD_MAP = {
    // Food
    zomato:'Food & Dining', swiggy:'Food & Dining', restaurant:'Food & Dining',
    cafe:'Food & Dining', lunch:'Food & Dining', dinner:'Food & Dining',
    breakfast:'Food & Dining', chai:'Food & Dining', tea:'Food & Dining',
    pizza:'Food & Dining', burger:'Food & Dining', biryani:'Food & Dining',
    // Housing
    rent:'Housing', pg:'Housing', hostel:'Housing', 'paying guest':'Housing',
    // Utilities
    electricity:'Utilities', wifi:'Utilities', 'water bill':'Utilities',
    broadband:'Utilities', 'gas bill':'Utilities', internet:'Utilities',
    // Transport
    metro:'Transport', bus:'Transport', uber:'Transport', ola:'Transport',
    rapido:'Transport', petrol:'Transport', fuel:'Transport', auto:'Transport',
    // Medical
    medicine:'Medical', hospital:'Medical', pharmacy:'Medical',
    doctor:'Medical', clinic:'Medical', apollo:'Medical',
    // Entertainment/Subscriptions
    netflix:'Entertainment', spotify:'Entertainment', hotstar:'Entertainment',
    prime:'Entertainment', movie:'Entertainment', game:'Entertainment',
    steam:'Entertainment', disney:'Entertainment', youtube:'Entertainment',
    discord:'Entertainment', notion:'Entertainment', canva:'Entertainment',
    // Shopping
    amazon:'Shopping', flipkart:'Shopping', myntra:'Shopping',
    meesho:'Shopping', clothing:'Shopping', shoes:'Shopping',
    // Investment
    sip:'Investment', 'mutual fund':'Investment', ppf:'Investment',
    rd:'Investment', fd:'Investment', gold:'Investment', nps:'Investment',
    // Education
    book:'Education', course:'Education', udemy:'Education',
    coursera:'Education', tutorial:'Education', fees:'Education',
    college:'Education', notes:'Education', stationery:'Education',
    // Loan
    emi:'Loan Repayment', loan:'Loan Repayment',
    // Grocery
    grocery:'Grocery', supermarket:'Grocery', reliance:'Grocery',
    dmart:'Grocery', bigbasket:'Grocery', blinkit:'Grocery',
    swiggyinstamart:'Grocery', zepto:'Grocery',
  };

  const CATEGORY_META = {
    'Food & Dining':  { id: 1,  icon: '🍽️', type: 'WANT',   chipClass: 'chip-want'  },
    'Housing':        { id: 2,  icon: '🏠', type: 'NEED',   chipClass: 'chip-need'  },
    'Utilities':      { id: 3,  icon: '⚡', type: 'NEED',   chipClass: 'chip-need'  },
    'Transport':      { id: 4,  icon: '🚌', type: 'NEED',   chipClass: 'chip-need'  },
    'Medical':        { id: 5,  icon: '💊', type: 'NEED',   chipClass: 'chip-need'  },
    'Entertainment':  { id: 6,  icon: '🎮', type: 'WANT',   chipClass: 'chip-want'  },
    'Shopping':       { id: 7,  icon: '🛍️', type: 'WANT',   chipClass: 'chip-want'  },
    'Investment':     { id: 8,  icon: '📈', type: 'INVEST', chipClass: 'chip-invest'},
    'Education':      { id: 9,  icon: '📚', type: 'NEED',   chipClass: 'chip-need'  },
    'Loan Repayment': { id: 10, icon: '💳', type: 'NEED',   chipClass: 'chip-need'  },
    'Grocery':        { id: 11, icon: '🛒', type: 'NEED',   chipClass: 'chip-need'  },
    'Other':          { id: 12, icon: '📦', type: 'WANT',   chipClass: 'chip-want'  },
  };

  const classifyExpense = (description, amount) => {
    const desc = (description || '').toLowerCase();

    // Layer 1: keyword matching
    for (const [kw, cat] of Object.entries(KEYWORD_MAP)) {
      if (desc.includes(kw)) return { category: cat, confidence: 'HIGH', ...CATEGORY_META[cat] };
    }

    // Layer 2: amount heuristic
    const amt = Number(amount);
    if (amt < 200)        return { category: 'Food & Dining',  confidence: 'MEDIUM', ...CATEGORY_META['Food & Dining']  };
    if (amt < 500)        return { category: 'Food & Dining',  confidence: 'MEDIUM', ...CATEGORY_META['Food & Dining']  };
    if (amt < 2000)       return { category: 'Shopping',       confidence: 'LOW',    ...CATEGORY_META['Shopping']       };
    return                       { category: 'Other',          confidence: 'LOW',    ...CATEGORY_META['Other']          };
  };

  // All categories list for UI
  const ALL_CATEGORIES = Object.entries(CATEGORY_META).map(([name, meta]) => ({ name, ...meta }));

  // ── Budget helpers ─────────────────────────────────────────
  const budgetAllocation = (income) => {
    const savings = Math.round(income * 0.10);
    const needs   = Math.round(income * 0.50);
    const wants   = Math.round(income * 0.30);
    const buffer  = income - savings - needs - wants;
    return { savings, needs, wants, buffer };
  };

  // ── Behavioral Bot personalization ─────────────────────────
  // Adapts messages by gender and age group
  const getBotPersona = (user) => {
    const age    = user?.age || 20;
    const gender = (user?.gender || 'OTHER').toUpperCase();

    let ageGroup = 'mid'; // 18-22
    if (age <= 17)      ageGroup = 'teen';
    else if (age >= 23) ageGroup = 'senior';

    // Tone modifiers per persona
    const personas = {
      teen_MALE:   { greeting: 'Hey',  style: 'casual',      emoji: true,  focusAreas: ['gaming budget', 'saving for gadgets', 'food spending'] },
      teen_FEMALE: { greeting: 'Hey',  style: 'encouraging', emoji: true,  focusAreas: ['shopping habits', 'saving streaks', 'subscription check'] },
      teen_OTHER:  { greeting: 'Hey',  style: 'casual',      emoji: true,  focusAreas: ['saving habits', 'budget basics', 'spending patterns'] },
      mid_MALE:    { greeting: 'Hi',   style: 'direct',      emoji: false, focusAreas: ['monthly savings', 'transport spend', 'dining control'] },
      mid_FEMALE:  { greeting: 'Hi',   style: 'motivating',  emoji: true,  focusAreas: ['savings goals', 'shopping budget', 'subscription leaks'] },
      mid_OTHER:   { greeting: 'Hi',   style: 'direct',      emoji: false, focusAreas: ['monthly plan', 'savings target', 'spending review'] },
      senior_MALE:   { greeting: 'Hello', style: 'analytical', emoji: false, focusAreas: ['savings velocity', 'investment readiness', 'budget adherence'] },
      senior_FEMALE: { greeting: 'Hello', style: 'supportive', emoji: true,  focusAreas: ['goal progress', 'savings consistency', 'smart spending'] },
      senior_OTHER:  { greeting: 'Hello', style: 'analytical', emoji: false, focusAreas: ['monthly targets', 'investment path', 'spending discipline'] },
    };

    const key = `${ageGroup}_${gender}`;
    return personas[key] || personas['mid_OTHER'];
  };

  const buildBotMessage = (user, alerts, score, budget) => {
    const persona = getBotPersona(user);
    const name    = user?.name?.split(' ')[0] || 'there';
    const age     = user?.age || 20;
    const gender  = (user?.gender || '').toUpperCase();
    const scoreVal = score?.score || 0;
    const em = persona.emoji;

    // Priority message logic
    if (score && scoreVal < 45) {
      return `${persona.greeting} ${name}${em ? ' 👋' : ','} your Financial Health Score dropped to <strong>${Math.round(scoreVal)}</strong>. Let's fix this — check your Budget Breakdown to find where you're overspending.`;
    }

    // Predictive breach alert
    const breach = alerts?.find(a => a.alertType === 'PREDICTIVE');
    if (breach) {
      return `${em ? '⚡ ' : ''}${persona.greeting} ${name}, ${breach.message}`;
    }

    // Subscription leak
    const subLeak = alerts?.find(a => a.alertType === 'SUBSCRIPTION_LEAK');
    if (subLeak) {
      return `${em ? '🔄 ' : ''}You have active subscriptions that may be draining money. Head to <strong>Subscriptions</strong> to review them.`;
    }

    // Positive momentum
    if (scoreVal >= 80) {
      if (age <= 17 && gender === 'FEMALE') return `${em ? '🌟 ' : ''}You're doing amazing ${name}! Your score is <strong>${Math.round(scoreVal)}</strong> — one of the best! Keep that savings streak going 💪`;
      if (age <= 17 && gender === 'MALE')   return `${em ? '🔥 ' : ''}Nice work ${name}! Score at <strong>${Math.round(scoreVal)}</strong>. You're crushing it! Keep the budget in check this week.`;
      if (gender === 'FEMALE') return `${em ? '✨ ' : ''}Great momentum ${name}! Your score is <strong>${Math.round(scoreVal)}</strong>. You're consistently staying within budget — that's a real achievement.`;
      return `${persona.greeting} ${name}, your score is strong at <strong>${Math.round(scoreVal)}</strong>. ${em ? '📊 ' : ''}Budget adherence is your main strength this month.`;
    }

    // Budget warning
    const warn = alerts?.find(a => a.alertType === 'WARNING' || a.alertType === 'SAVINGS_RISK');
    if (warn) {
      return `${persona.greeting} ${name}${em ? ' ⚠️' : ','} ${warn.message}`;
    }

    // Default motivational by age/gender
    const tips = {
      teen_MALE:    `${em ? '🎯 ' : ''}Log every expense this week ${name} — even small ones. Small habits build big savings.`,
      teen_FEMALE:  `${em ? '💜 ' : ''}Your savings goal is on track ${name}! Check your subscription panel — there may be one you forgot about.`,
      mid_MALE:     `${persona.greeting} ${name}, you're on track this month. Review your wants category to see if there's room to boost savings.`,
      mid_FEMALE:   `${em ? '🌸 ' : ''}You're doing well ${name}! A quick review of your Food & Dining spend could help you hit next month's savings target.`,
      senior_MALE:  `${persona.greeting} ${name}, your financial habits are solid. Consider checking investment readiness once your Emergency Fund is complete.`,
      senior_FEMALE:`${em ? '💡 ' : ''}${persona.greeting} ${name}, consistent saving builds real freedom. Your current trajectory looks great — keep it up!`,
    };
    const genderKey = gender === 'OTHER' ? 'MALE' : gender;
    const ageGroup  = age <= 17 ? 'teen' : age >= 23 ? 'senior' : 'mid';
    return tips[`${ageGroup}_${genderKey}`] || `${persona.greeting} ${name}, keep logging your expenses to get the most accurate financial insights.`;
  };

  // ── Pct bar color ──────────────────────────────────────────
  const pctClass = (pct) => {
    if (pct >= 100) return 'danger';
    if (pct >= 70)  return 'warn';
    return '';
  };

  // ── Subscription icons ─────────────────────────────────────
  const subIcon = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('netflix'))    return '🎬';
    if (n.includes('spotify'))    return '🎵';
    if (n.includes('hotstar') || n.includes('disney')) return '🌟';
    if (n.includes('prime'))      return '📦';
    if (n.includes('gym'))        return '💪';
    if (n.includes('adobe'))      return '🎨';
    if (n.includes('youtube'))    return '▶️';
    if (n.includes('discord'))    return '💬';
    if (n.includes('notion'))     return '📝';
    if (n.includes('canva'))      return '🖌️';
    if (n.includes('google'))     return '🔍';
    if (n.includes('apple'))      return '🍎';
    return '🔄';
  };

  // ── Alert icons ────────────────────────────────────────────
  const alertIcon = (type) => {
    const map = {
      BEHAVIORAL_BOT:   { icon: '🤖', bg: 'rgba(108,99,255,0.15)', cls: 'info' },
      WARNING:          { icon: '⚠️', bg: 'rgba(255,209,102,0.15)', cls: 'warn-alert' },
      DANGER:           { icon: '🔴', bg: 'rgba(255,107,107,0.15)', cls: 'danger-alert' },
      PREDICTIVE:       { icon: '📊', bg: 'rgba(108,99,255,0.12)', cls: 'info' },
      SUBSCRIPTION_LEAK:{ icon: '🔄', bg: 'rgba(255,209,102,0.12)', cls: 'warn-alert' },
      EMOTIONAL_SPEND:  { icon: '💭', bg: 'rgba(255,209,102,0.12)', cls: 'warn-alert' },
      ANOMALY:          { icon: '📈', bg: 'rgba(255,107,107,0.12)', cls: 'danger-alert' },
      GOAL_DEADLINE:    { icon: '🎯', bg: 'rgba(0,229,160,0.12)',   cls: 'info' },
      SAVINGS_RISK:     { icon: '💰', bg: 'rgba(255,209,102,0.15)', cls: 'warn-alert' },
    };
    return map[type] || { icon: '🔔', bg: 'rgba(108,99,255,0.1)', cls: 'info' };
  };

  // ── Sidebar active page detection ─────────────────────────
  const currentPage = () => window.location.pathname.split('/').pop().replace('.html', '');

  return {
    fmt, todayStr, formatDate, monthName, daysLeft, timeAgo,
    scoreRating, scoreDesc,
    classifyExpense, ALL_CATEGORIES, CATEGORY_META,
    budgetAllocation,
    getBotPersona, buildBotMessage,
    pctClass, subIcon, alertIcon, currentPage,
  };
})();
