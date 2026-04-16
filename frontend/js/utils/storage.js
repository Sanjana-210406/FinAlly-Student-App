/* ============================================================
   js/utils/storage.js — LocalStorage wrapper for FinAlly
   ============================================================ */

const StorageUtil = (() => {
  const KEYS = {
    TOKEN:   'fa_token',
    USER:    'fa_user',
    BUDGET:  'fa_budget_cache',
    SCORE:   'fa_score_cache',
  };

  return {
    getToken:  ()      => localStorage.getItem(KEYS.TOKEN),
    setToken:  (t)     => localStorage.setItem(KEYS.TOKEN, t),
    getUser:   ()      => { try { return JSON.parse(localStorage.getItem(KEYS.USER)); } catch { return null; } },
    setUser:   (u)     => localStorage.setItem(KEYS.USER, JSON.stringify(u)),
    getBudget: ()      => { try { return JSON.parse(localStorage.getItem(KEYS.BUDGET)); } catch { return null; } },
    setBudget: (b)     => localStorage.setItem(KEYS.BUDGET, JSON.stringify(b)),
    getScore:  ()      => { try { return JSON.parse(localStorage.getItem(KEYS.SCORE)); } catch { return null; } },
    setScore:  (s)     => localStorage.setItem(KEYS.SCORE, JSON.stringify(s)),
    clear:     ()      => { Object.values(KEYS).forEach(k => localStorage.removeItem(k)); },
    requireAuth: ()    => { if (!localStorage.getItem(KEYS.TOKEN)) { window.location.href = 'login.html'; return false; } return true; },
  };
})();
