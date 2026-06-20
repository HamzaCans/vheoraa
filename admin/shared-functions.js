const API = window.location.protocol === 'file:' ? 'http://localhost:3001' : '';

function getToken() {
  const t = localStorage.getItem('vheora_token');
  if (!t) window.location.href = '/admin/';
  return t;
}

function adminToast(title, msg, type = 'success', duration = 3500) {
  const c = document.getElementById('adminToast'); if (!c) return;
  const t = document.createElement('div'); t.className = 'admin-toast';
  const icons = { success: '\u2705', error: '\u274C', info: '\u2139\uFE0F' };
  t.innerHTML = `<div class="admin-toast-icon ${type}">${icons[type]}</div><div class="admin-toast-body"><div class="admin-toast-title">${title}</div><div class="admin-toast-msg">${msg}</div></div>`;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 250); }, duration);
}

let confirmResolve = null;
function showConfirm(title, text, btnText = 'Sil') {
  return new Promise((resolve) => {
    confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmText').textContent = text;
    document.getElementById('confirmBtn').textContent = btnText;
    document.getElementById('confirmOverlay').classList.add('active');
  });
}
function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('active');
  if (confirmResolve) confirmResolve(false);
  confirmResolve = null;
}
async function logout() {
  try { await fetch('/api/auth/logout',{method:'POST',headers:{'Authorization':'Bearer '+localStorage.getItem('vheora_token')}}); } catch(e) {}
  localStorage.removeItem('vheora_token'); localStorage.removeItem('vheora_user');
  window.location.href = '/admin/';
}
async function btnAction(btn, label, verb, actionFn) {
  var origHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> ' + label + '...';
  try {
    await actionFn();
    btn.innerHTML = '<span class="btn-check-icon">\u2713</span> ' + verb;
    btn.className = btn.className.replace(/\b(?:btn-primary|btn-danger|btn-ghost)\b/g,'').trim() + ' btn-success';
    setTimeout(function() { btn.innerHTML = origHTML; btn.disabled = false; btn.className = btn.className.replace('btn-success', 'btn-primary'); }, 2200);
  } catch(e) {
    btn.innerHTML = '\u2717 Hata';
    btn.className += ' btn-error';
    setTimeout(function() { btn.innerHTML = origHTML; btn.disabled = false; btn.className = btn.className.replace(/ btn-error/g,''); }, 2200);
  }
}