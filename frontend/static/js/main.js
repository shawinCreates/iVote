const API = '/api';

/* ── Storage helpers ─────────────────────────────────────────── */
const store = {
  getToken: ()     => localStorage.getItem('ivote_token'),
  setToken: t      => localStorage.setItem('ivote_token', t),
  getUser:  ()     => { try { return JSON.parse(localStorage.getItem('ivote_user')||'null'); } catch { return null; } },
  setUser:  u      => localStorage.setItem('ivote_user', JSON.stringify(u)),
  clear:    ()     => { localStorage.removeItem('ivote_token'); localStorage.removeItem('ivote_user'); },
};

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/* ── Core API call ───────────────────────────────────────────── */
async function api(path, opts = {}) {
  const headers = {};
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const tok = store.getToken();
  if (tok) headers['Authorization'] = `Bearer ${tok}`;

  const res = await fetch(API + path, { ...opts, headers: { ...headers, ...opts.headers } });

  if (res.status === 401) { logout(); return; }

  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.text();

  if (!res.ok) throw new Error((data && data.detail) || `HTTP ${res.status}`);
  return data;
}

/* ── Auth ────────────────────────────────────────────────────── */
async function login(email, password) {
  const fd = new FormData();
  fd.append('username', email);
  fd.append('password', password);
  const res = await fetch(`${API}/auth/login`, { method: 'POST', body: fd });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Login failed'); }
  const data = await res.json();
  store.setToken(data.access_token);
  store.setUser(data.user);
  return data;
}

function logout() {
  store.clear();
  window.location.href = '/';
}

/* ── API namespace ───────────────────────────────────────────── */
const $ = {
  auth: {
    me:               ()     => api('/auth/me'),
    notifications:    ()     => api('/auth/notifications'),
    markRead:         ()     => api('/auth/notifications/read', { method: 'POST' }),
  },
  elections: {
    all:              ()     => api('/elections'),
    get:              id     => api(`/elections/${id}`),
    heKey:            id     => api(`/elections/${id}/he-public-key`),
    results:          id     => api(`/elections/${id}/results`),
    hasVoted:         id     => api(`/elections/${id}/has-voted`),
  },
  candidates: {
    forPosition:      id     => api(`/positions/${id}/candidates`),
    get:              id     => api(`/candidates/${id}`),
    mine:             ()     => api('/my-candidacy'),
  },
  vote:               ballot => api('/vote', { method: 'POST', body: JSON.stringify(ballot) }),
  admin: {
    stats:            ()     => api('/admin/stats'),
    students: {
      pending:        ()     => api('/admin/students/pending'),
      all:            ()     => api('/admin/students/all'),
      verify:         id     => api(`/admin/students/${id}/verify`, { method: 'POST' }),
      reject:         (id,r) => api(`/admin/students/${id}/reject`, { method:'POST', body:JSON.stringify({reason:r}) }),
    },
    elections: {
      all:            ()     => api('/admin/elections'),
      create:         d      => api('/admin/elections', { method:'POST', body:JSON.stringify(d) }),
      lock:           id     => api(`/admin/elections/${id}/lock-candidates`, { method:'POST' }),
      publish:        id     => api(`/admin/elections/${id}/publish-results`, { method:'POST' }),
      results:        id     => api(`/admin/elections/${id}/results`),
    },
    candidates: {
      pending:        eid    => api(`/admin/candidates/pending${eid?'?election_id='+eid:''}`),
      all:            eid    => api(`/admin/candidates/all${eid?'?election_id='+eid:''}`),
      approve:        id     => api(`/admin/candidates/${id}/approve`, { method:'POST' }),
      reject:         (id,r) => api(`/admin/candidates/${id}/reject`, { method:'POST', body:JSON.stringify({reason:r}) }),
    },
    audit:            (s,l)  => api(`/admin/audit-logs?skip=${s||0}&limit=${l||200}`),
  },
};

/* ── UI Utilities ────────────────────────────────────────────── */
function showAlert(msg, type = 'info', container = null) {
  const icons = { success:'✓', danger:'✕', warning:'⚠', info:'ℹ' };
  const el = document.createElement('div');
  el.className = `alert alert-${type}`;
  el.innerHTML = `<span>${icons[type]||'ℹ'}</span>`;
  const msgSpan = document.createElement('span');
  msgSpan.textContent = msg;
  el.appendChild(msgSpan);
  const target = container
    || document.querySelector('#alert-box')
    || document.querySelector('.page')
    || document.body;
  target.insertBefore(el, target.firstChild);
  setTimeout(() => el.remove(), 5500);
}

function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function showSpinner() {
  if (document.getElementById('_spin')) return;
  const d = document.createElement('div');
  d.id = '_spin'; d.className = 'spinner-overlay';
  d.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(d);
}
function hideSpinner() { document.getElementById('_spin')?.remove(); }

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { dateStyle:'medium', timeStyle:'short' });
}
function fmtDateShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}
function timeRemaining(end) {
  const diff = new Date(end) - new Date();
  if (diff <= 0) return 'Ended';
  const d = Math.floor(diff/86400000), h = Math.floor((diff%86400000)/3600000), m = Math.floor((diff%3600000)/60000);
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h ${m}m`;
}

/* ── Badge helpers ───────────────────────────────────────────── */
const STATUS_LABELS = {
  draft:'Draft', nomination_open:'Nominations Open',
  voting_open:'Voting Open', closed:'Closed', results_published:'Results Published'
};
function statusBadge(s) {
  // s comes from the API and is an enum — safe to use directly in class, but escape label
  return `<span class="badge badge-${esc(s)}">${esc(STATUS_LABELS[s]||s)}</span>`;
}
function approvalBadge(s) {
  const lbl = { pending:'Pending', approved:'Approved', rejected:'Rejected', candidate:'Candidate' };
  return `<span class="badge badge-${esc(s)}">${esc(lbl[s]||s)}</span>`;
}

/* ── Tabs ────────────────────────────────────────────────────── */
function initTabs(container = document) {
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      container.getElementById?.(target)?.classList.add('active')
        || document.getElementById(target)?.classList.add('active');
    });
  });
}

/* ── Sidebar init ────────────────────────────────────────────── */
function initSidebar() {
  const u = store.getUser();
  if (!u) return;
  const nameEl = document.getElementById('sb-name');
  const roleEl = document.getElementById('sb-role');
  const avEl   = document.getElementById('sb-avatar');
  // Fix #8: use textContent — never innerHTML with user data
  if (nameEl) nameEl.textContent = u.full_name;
  if (roleEl) roleEl.textContent = u.role === 'election_head' ? 'Election Head' : 'Student';
  if (avEl)   avEl.textContent   = (u.full_name?.[0] || '?').toUpperCase();
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === path);
  });
}

/* ── Notifications ───────────────────────────────────────────── */
async function loadNotifications() {
  try {
    const notifs = await $.auth.notifications();
    const unread = notifs.filter(n => !n.is_read).length;
    const dot    = document.getElementById('notif-dot');
    if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
    const list = document.getElementById('notif-list');
    if (!list) return;
    if (!notifs.length) {
      list.textContent = '';
      const emptyDiv = document.createElement('div');
      emptyDiv.style.cssText = 'padding:24px;text-align:center;font-size:12px;color:var(--g400)';
      emptyDiv.textContent = 'No notifications';
      list.appendChild(emptyDiv);
      return;
    }
    // Fix #8: Build notification items via DOM — no innerHTML with user data
    list.textContent = '';
    notifs.slice(0, 10).forEach(n => {
      const item = document.createElement('div');
      item.className = `notif-item${n.is_read ? '' : ' unread'}`;
      const title = document.createElement('div');
      title.className = 'notif-item-title';
      title.textContent = n.title;          // textContent — safe
      const msg = document.createElement('div');
      msg.className = 'notif-item-msg';
      msg.textContent = n.message;          // textContent — safe
      const time = document.createElement('div');
      time.className = 'notif-item-time';
      time.textContent = fmtDate(n.created_at);
      item.appendChild(title);
      item.appendChild(msg);
      item.appendChild(time);
      list.appendChild(item);
    });
  } catch(e) { /* silent */ }
}

function initNotifBtn() {
  const btn   = document.getElementById('notif-btn');
  const panel = document.getElementById('notif-panel');
  if (!btn || !panel) return;
  btn.addEventListener('click', async e => {
    e.stopPropagation();
    const open = panel.classList.toggle('open');
    if (open) {
      await loadNotifications();
      await $.auth.markRead().catch(()=>{});
      const dot = document.getElementById('notif-dot');
      if (dot) dot.style.display = 'none';
    }
  });
  document.addEventListener('click', e => {
    if (!panel.contains(e.target) && e.target !== btn) panel.classList.remove('open');
  });
}

/* ── Modal close on overlay click ───────────────────────────── */
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
  if (e.target.classList.contains('modal-close'))   e.target.closest('.modal-overlay')?.classList.remove('open');
});

/* ── Auth guard ──────────────────────────────────────────────── */
function authGuard() {
  if (!store.getToken()) { window.location.href = '/'; return false; }
  const u    = store.getUser();
  const path = window.location.pathname;
  if (u) {
    if (u.role === 'election_head' && path.startsWith('/student/')) { window.location.href = '/admin/dashboard'; return false; }
    if (u.role !== 'election_head' && path.startsWith('/admin/'))   { window.location.href = '/student/dashboard'; return false; }
  }
  return true;
}

/* ── DOMContentLoaded ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.app')) {
    if (!authGuard()) return;
    initSidebar();
    initNotifBtn();
    loadNotifications();
    initTabs();
  }
  if (document.querySelector('.auth-wrap') && store.getToken()) {
    const u = store.getUser();
    if (u) window.location.href = u.role === 'election_head' ? '/admin/dashboard' : '/student/dashboard';
  }
});

/* ── Paillier Browser Encryption ─────────────────────────────
   Pure BigInt implementation — no external library needed.
   ──────────────────────────────────────────────────────────── */
const Paillier = (() => {
  function modPow(b, e, m) {
    b = b % m; let r = 1n;
    while (e > 0n) { if (e & 1n) r = r * b % m; e >>= 1n; b = b * b % m; }
    return r;
  }
  function randBelow(n) {
    const bits = n.toString(2).length;
    const bytes = Math.ceil(bits / 8);
    let r;
    do {
      const arr = new Uint8Array(bytes);
      crypto.getRandomValues(arr);
      r = arr.reduce((acc, v) => (acc << 8n) | BigInt(v), 0n);
      r = r & ((1n << BigInt(bits)) - 1n);
    } while (r >= n || r === 0n);
    return r;
  }
  function gcd(a, b) { while (b) { [a,b] = [b, a%b]; } return a; }

  function encrypt(m, nStr) {
    const n  = BigInt(nStr);
    const n2 = n * n;
    const g  = n + 1n;
    let r;
    do { r = randBelow(n); } while (gcd(r, n) !== 1n);
    const c = modPow(g, BigInt(m), n2) * modPow(r, n, n2) % n2;
    return { c: c.toString(), x: 0 };
  }

  function encryptBallot(selectedIndices, numCandidates, nStr) {
    const vec = new Array(numCandidates).fill(0);
    selectedIndices.forEach(i => { if (i >= 0 && i < numCandidates) vec[i] = 1; });
    return JSON.stringify(vec.map(v => encrypt(v, nStr)));
  }

  return { encrypt, encryptBallot };
})();

/* ── Exports ─────────────────────────────────────────────────── */
window.iVote = {
  store, api, login, logout, $,
  showAlert, showSpinner, hideSpinner,
  openModal, closeModal,
  fmtDate, fmtDateShort, timeRemaining,
  statusBadge, approvalBadge,
  esc,
  Paillier,
};
