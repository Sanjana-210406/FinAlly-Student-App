/* ============================================================
   js/modules/auth.js — Login & Demo logic
   ============================================================ */

const AuthModule = (() => {

  const showError = (elId, msg) => {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  };

  const hideError = (elId) => {
    const el = document.getElementById(elId);
    if (el) el.classList.add('hidden');
  };

  const setLoading = (loading) => {
    const btn     = document.getElementById('loginBtn');
    const txt     = document.getElementById('loginBtnText');
    const spinner = document.getElementById('loginSpinner');
    if (!btn) return;
    btn.disabled = loading;
    if (txt)     txt.textContent = loading ? 'Signing in…' : 'Sign In';
    if (spinner) spinner.classList.toggle('hidden', !loading);
  };

  const login = async (email, password) => {
    hideError('loginError');

    // Validate
    let valid = true;
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      document.getElementById('loginEmail')?.classList.add('error');
      document.getElementById('emailError')?.classList.add('show');
      valid = false;
    } else {
      document.getElementById('loginEmail')?.classList.remove('error');
      document.getElementById('emailError')?.classList.remove('show');
    }
    if (!password) {
      document.getElementById('loginPassword')?.classList.add('error');
      document.getElementById('passwordError')?.classList.add('show');
      valid = false;
    } else {
      document.getElementById('loginPassword')?.classList.remove('error');
      document.getElementById('passwordError')?.classList.remove('show');
    }
    if (!valid) return;

    setLoading(true);
    try {
      const res = await ApiUtil.Auth.login({ email, password });
      StorageUtil.setToken(res.token);
      StorageUtil.setUser(res.user);
      window.location.href = 'dashboard.html';
    } catch (err) {
      showError('loginError', err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = async () => {
    // Use demo credentials — backend should have a seeded demo account
    await login('demo_new@student.finally', 'Demo@1234');
  };

  return { login, loginDemo };
})();
