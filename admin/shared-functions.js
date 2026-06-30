var API = window.location.protocol === 'file:' ? 'http://localhost:3001' : '';
var userTimezone = 'Europe/Istanbul';

function getToken() {
  var t = localStorage.getItem('vheora_token');
  if (!t) window.location.href = '/admin/';
  return t;
}

function adminToast(title, msg, type, duration) {
  type = type || 'success'; duration = duration || 3500;
  var c = document.getElementById('adminToast'); if (!c) return;
  var t = document.createElement('div'); t.className = 'admin-toast';
  var icons = { success: '\u2705', error: '\u274C', info: '\u2139\uFE0F' };
  t.innerHTML = '<div class="admin-toast-icon ' + type + '">' + icons[type] + '</div><div class="admin-toast-body"><div class="admin-toast-title">' + title + '</div><div class="admin-toast-msg">' + msg + '</div></div>';
  c.appendChild(t);
  setTimeout(function() { t.classList.add('out'); setTimeout(function() { t.remove(); }, 250); }, duration);
}

var confirmResolve = null;
function showConfirm(title, text, btnText) {
  btnText = btnText || 'Sil';
  return new Promise(function(resolve) {
    confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmText').textContent = text;
    document.getElementById('confirmBtn').textContent = btnText;
    document.getElementById('confirmOverlay').classList.add('active');
  });
}
function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('active');
  if (confirmResolve) { confirmResolve(false); confirmResolve = null; }
}

async function logout() {
  try { await fetch('/api/auth/logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('vheora_token') } }); } catch(e) {}
  localStorage.removeItem('vheora_token');
  localStorage.removeItem('vheora_user');
  window.location.href = '/admin/';
}

async function fetchJSON(url, options, timeoutMs) {
  timeoutMs = timeoutMs || 30000;
  var controller = new AbortController();
  var timeout = setTimeout(function() { controller.abort(new Error('Timeout')); }, timeoutMs);
  try {
    var res = await fetch(url, Object.assign({}, options || {}, { signal: controller.signal }));
    if (res.status === 401) { localStorage.removeItem('vheora_token'); adminToast('Oturum Süresi Doldu', 'Lütfen tekrar giriş yapın', 'info'); setTimeout(function() { window.location.href = '/admin/'; }, 1500); return null; }
    if (!res.ok) { var errBody = ''; try { errBody = await res.text(); } catch(_) {} throw new Error('HTTP ' + res.status + ' — ' + errBody.substring(0, 300)); }
    return await res.json();
  } finally { clearTimeout(timeout); }
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

function parseDate(s) {
  if (!s) return null;
  s = String(s).trim();
  if (!s) return null;
  if (s.includes('T')) { if (!/[Zz]|[+-]\d{2}:\d{2}$/.test(s)) s += 'Z'; }
  else { s = s.replace(' ', 'T') + 'Z'; }
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

async function loadTimezone() {
  try {
    var settings = await fetchJSON(API + '/api/admin/settings', { headers: { 'Authorization': 'Bearer ' + getToken() } });
    if (settings && settings.timezone) userTimezone = settings.timezone;
  } catch(e) {}
}

if (!window._confirmListenersAttached) {
  document.addEventListener('DOMContentLoaded', function() {
    var confirmBtn = document.getElementById('confirmBtn');
    var confirmOverlay = document.getElementById('confirmOverlay');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function() {
        document.getElementById('confirmOverlay').classList.remove('active');
        if (confirmResolve) { confirmResolve(true); confirmResolve = null; }
      });
    }
    if (confirmOverlay) {
      confirmOverlay.addEventListener('click', function(e) {
        if (e.target === e.currentTarget) closeConfirm();
      });
    }
  });
  window._confirmListenersAttached = true;
}

function renderSidebar(activePage) {
  document.getElementById('sidebar').innerHTML = '<div class="sidebar-logo">VHEORA</div><div class="sidebar-sub">Admin Panel</div><nav class="sidebar-nav"><div class="sidebar-category">Genel</div><a href="/admin/dashboard.html" class="sidebar-link' + (activePage === 'dashboard' ? ' active' : '') + '">\uD83D\uDCCA Dashboard</a><div class="sidebar-category">İçerik Yönetimi</div><a href="/admin/products.html" class="sidebar-link' + (activePage === 'products' ? ' active' : '') + '">\uD83D\uDC8E Ürünler</a><a href="/admin/hero.html" class="sidebar-link' + (activePage === 'hero' ? ' active' : '') + '">\uD83C\uDFA8 Hero</a><a href="/admin/inventory.html" class="sidebar-link' + (activePage === 'inventory' ? ' active' : '') + '">\uD83D\uDCE6 Stok</a><a href="/admin/testimonials.html" class="sidebar-link' + (activePage === 'testimonials' ? ' active' : '') + '">\u2B50 Yorumlar</a><div class="sidebar-category">Sipariş Yönetimi</div><a href="/admin/orders.html" class="sidebar-link' + (activePage === 'orders' ? ' active' : '') + '">\uD83D\uDCE6 Siparişler</a><div class="sidebar-category">İletişim</div><a href="/admin/messages.html" class="sidebar-link' + (activePage === 'messages' ? ' active' : '') + '">\u2709\uFE0F Mesajlar</a><div class="sidebar-category">Sistem</div><a href="/admin/settings.html" class="sidebar-link' + (activePage === 'settings' ? ' active' : '') + '">\u2699\uFE0F Ayarlar</a><a href="/admin/logs.html" class="sidebar-link' + (activePage === 'logs' ? ' active' : '') + '">\uD83D\uDCCB Loglar</a><div style="flex:1"></div><a href="/" class="sidebar-link">\uD83C\uDF10 Siteye Git</a></nav><button class="sidebar-logout" onclick="logout()">\uD83D\uDEAA Çıkış Yap</button>';
}

function renderBottombar(activePage) {
  document.body.insertAdjacentHTML('beforeend', '<nav class="admin-bottombar"><div class="admin-bottombar-inner"><a href="/admin/dashboard.html"' + (activePage === 'dashboard' ? ' class="active"' : '') + '><span class="bb-icon">\uD83D\uDCCA</span>Dash</a><a href="/admin/products.html"' + (activePage === 'products' ? ' class="active"' : '') + '><span class="bb-icon">\uD83D\uDC8E</span>Ürünler</a><a href="/admin/orders.html"' + (activePage === 'orders' ? ' class="active"' : '') + '><span class="bb-icon">\uD83D\uDCE6</span>Sipariş</a><a href="/admin/messages.html"' + (activePage === 'messages' ? ' class="active"' : '') + '><span class="bb-icon">\u2709\uFE0F</span>Mesaj</a><a href="/admin/settings.html"' + (activePage === 'settings' ? ' class="active"' : '') + '><span class="bb-icon">\u2699\uFE0F</span>Ayarlar</a><a href="/admin/logs.html"' + (activePage === 'logs' ? ' class="active"' : '') + '><span class="bb-icon">\uD83D\uDCCB</span>Loglar</a></div></nav>');
}

function initSidebar(activePage) {
  renderSidebar(activePage);
  document.body.insertAdjacentHTML('afterbegin', '<div class="sidebar-overlay" onclick="closeSidebar()"></div>');
  document.body.insertAdjacentHTML('afterbegin', '<button class="sidebar-toggle" onclick="toggleSidebar()" aria-label="Menüyü aç/kapat">\u2630</button>');
  renderBottombar(activePage);
}

function toggleSidebar() { document.body.classList.toggle('sidebar-open'); }
function closeSidebar() { document.body.classList.remove('sidebar-open'); }
