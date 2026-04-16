/* ============================================================
   js/utils/toast.js — Toast notification system
   ============================================================ */

const Toast = (() => {
  const icons = { success: '✅', error: '❌', warn: '⚠️', info: 'ℹ️' };
  const colors = {
    success: 'var(--clr-accent)',
    error:   'var(--clr-accent2)',
    warn:    'var(--clr-warn)',
    info:    'var(--clr-primary-lt)',
  };

  function show(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeft = `3px solid ${colors[type]}`;
    toast.innerHTML = `
      <span style="font-size:1.1rem;">${icons[type]}</span>
      <span style="flex:1;font-size:0.87rem;">${message}</span>
      <button onclick="this.parentElement.remove()" style="color:var(--clr-muted);font-size:1rem;cursor:pointer;background:none;border:none;">✕</button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return {
    success: (msg, d) => show(msg, 'success', d),
    error:   (msg, d) => show(msg, 'error', d),
    warn:    (msg, d) => show(msg, 'warn', d),
    info:    (msg, d) => show(msg, 'info', d),
  };
})();
