/* ============================================================
   js/utils/api.js — Centralized API calls for FinAlly Student
   All endpoints match the Spring Boot REST API design
   ============================================================ */

// Automatically determine API base URL depending on the environment
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
// Change 'REPLACE_ME_WITH_YOUR_RENDER_URL' once your backend is deployed (e.g. 'https://finally-backend.onrender.com')
const PROD_API_BASE = 'https://finally-student-app.onrender.com/api';

// You can override the API base by setting 'api_base' in localStorage for testing
const API_BASE = localStorage.getItem('api_base') || (isLocal ? 'http://localhost:8080/api' : PROD_API_BASE);

const ApiUtil = (() => {

  // ── Core fetch wrapper ─────────────────────────────────────
  async function request(method, endpoint, body = null, requiresAuth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (requiresAuth) {
      const token = StorageUtil.getToken();
      if (!token) {
        window.location.href = 'login.html';
        return;
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, config);

    if (res.status === 401) {
      StorageUtil.clear();
      window.location.href = 'login.html';
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
    return data;
  }

  const get  = (ep) => request('GET', ep);
  const post = (ep, body) => request('POST', ep, body);
  const put  = (ep, body) => request('PUT', ep, body);
  const del  = (ep) => request('DELETE', ep);

  // ── Auth ───────────────────────────────────────────────────
  const Auth = {
    register: (payload) => request('POST', '/auth/register', payload, false),
    login:    (payload) => request('POST', '/auth/login', payload, false),
    me:       ()        => get('/auth/me'),
  };

  // ── Income & Budget ────────────────────────────────────────
  const Budget = {
    addIncome:       (p) => post('/income', p),
    generate:        (p) => post('/budget/generate', p),
    current:         ()  => get('/budget/current'),
    setYearlyGoal:   (p) => post('/budget/yearly-goal', p),
    yearlyProgress:  ()  => get('/budget/yearly-progress'),
  };

  // ── Expenses ───────────────────────────────────────────────
  const Expenses = {
    add:            (p)  => post('/expenses', p),
    bulk:           (p)  => post('/expenses/bulk', p),
    list:           ()   => get('/expenses'),
    updateCategory: (id, categoryId) => put(`/expenses/${id}/category`, { categoryId }),
    remove:         (id) => del(`/expenses/${id}`),
    getLoggedDates: ()   => get('/expenses/logged-dates'),
  };

  // ── Safety & Goals ─────────────────────────────────────────
  const Safety = {
    status: () => get('/safety/status'),
  };

  const Goals = {
    list:    ()           => get('/goals'),
    create:  (p)          => post('/goals', p),
    deposit: (id, amount) => put(`/goals/${id}/deposit`, { amount }),
  };

  // ── Alerts & Score ─────────────────────────────────────────
  const Alerts = {
    list:    ()   => get('/alerts'),
    markRead:(id) => put(`/alerts/${id}/read`),
  };

  const Score = {
    current: () => get('/score/current'),
  };

  const Investments = {
    suggestions: () => get('/investments/suggestions'),
  };

  // ── Module endpoints ───────────────────────────────────────
  const Subscriptions = {
    list:       ()             => get('/subscriptions'),
    setStatus:  (id, status)   => put(`/subscriptions/${id}/status`, { status }),
  };

  const Simulator = {
    run: (p) => post('/simulator/whatif', p),
  };

  const Behavioral = {
    patterns:    () => get('/behavioral/patterns'),
    botMessages: () => get('/behavioral/bot-messages'),
  };

  const Predictive = {
    forecast: () => get('/predictive/forecast'),
  };

  const Gamification = {
    status: () => get('/gamification/status'),
  };

  return { Auth, Budget, Expenses, Safety, Goals, Alerts, Score, Investments, Subscriptions, Simulator, Behavioral, Predictive, Gamification };
})();
