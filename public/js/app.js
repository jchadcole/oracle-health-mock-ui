/* Mock Oracle Health EHR - single page app (vanilla JS, no build step). Fictional data only. */
(function () {
  'use strict';

  // ---------------------------------------------------------------- utils
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ohmock.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('ohmock.' + k, JSON.stringify(v)); } catch { /* storage blocked (e.g. 3rd-party iframe) */ } },
  };
  const fmtD = (s) => s ? new Date(s.length === 10 ? s + 'T12:00:00' : s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const fmtDnum = (s) => s ? new Date(s.length === 10 ? s + 'T12:00:00' : s).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '';
  const fmtT = (s) => new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const fmtDT = (s) => s ? `${fmtDnum(s)} ${fmtT(s)}` : '';
  const fmtLong = (s) => new Date(s + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const fmtPhone = (s) => { const d = digits(s).slice(-10); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : (s || ''); };
  const age = (dob) => { const b = new Date(dob + 'T12:00:00'), n = new Date(S.today + 'T12:00:00'); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
  const initials = (f, l) => ((f || '?')[0] + (l || '')[0]).toUpperCase();
  const COLORS = ['#7b5e57', '#5b7c99', '#8a6d3b', '#4f7d6a', '#7a5c8e', '#9a5b4b', '#3f6f8f', '#6b7d3a'];
  const colorFor = (s) => COLORS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  const avatar = (p, cls = '') => `<div class="avatar ${cls}" style="background:${colorFor(p.id || p.firstName)}">${initials(p.firstName, p.lastName)}</div>`;
  const nowLocal = () => { const d = new Date(Date.now() + S.clockSkew); const pad = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`; };
  const clean = (v) => { v = (v ?? '').toString().trim(); return /\{\{.*\}\}|^\$\{.*\}$|^undefined$|^null$/i.test(v) ? '' : v; }; // ignore unsubstituted Genesys templates

  const I = {
    cal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    inbox: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 13h5l1 3h6l1-3h5"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    reg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M19 8v6M16 11h6"/></svg>',
    list: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    phone: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    mic: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    side: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="1"/><path d="M10 4v16M6 9h2M6 12h2"/></svg>',
    x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>',
    more: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
    clock: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    door: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M3 21h18M15 12h.01"/></svg>',
    warn: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm1 15h-2v-2h2v2zm0-4h-2V9h2v4z"/></svg>',
    up: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 11v9H4v-9zM7 11l4-8a2 2 0 0 1 2 2v4h6a2 2 0 0 1 2 2l-2 7a2 2 0 0 1-2 2H7"/></svg>',
    down: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="transform:rotate(180deg)"><path d="M7 11v9H4v-9zM7 11l4-8a2 2 0 0 1 2 2v4h6a2 2 0 0 1 2 2l-2 7a2 2 0 0 1-2 2H7"/></svg>',
    copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="1"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/></svg>',
    refresh: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/></svg>',
    bell: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11a6 6 0 0 0-5-5.9V4a1 1 0 0 0-2 0v1.1A6 6 0 0 0 6 11v5l-2 2v1h16v-1z"/></svg>',
    home: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z"/></svg>',
    gc: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity=".25"/><circle cx="12" cy="12" r="5"/></svg>',
  };

  // ---------------------------------------------------------------- state
  const S = {
    user: store.get('user', null),
    settings: Object.assign({ autoPop: true, agentEmail: '', classic: false, providerId: 'pr-1' }, store.get('settings', {})),
    config: {}, providers: [], users: [], today: new Date().toISOString().slice(0, 10), clockSkew: 0,
    charts: {}, openTabs: store.get('tabs', []), interaction: null, popResult: null, aiOpen: false, aiLog: [], sse: null, sseOn: false,
    embed: false, unread: 0,
  };
  const saveSettings = () => store.set('settings', S.settings);

  async function api(path, opts = {}) {
    const r = await fetch(path, { method: opts.method || 'GET', headers: { 'Content-Type': 'application/json' }, body: opts.body ? JSON.stringify(opts.body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
    return j;
  }
  async function loadChart(id, force) {
    if (!S.charts[id] || force) S.charts[id] = await api(`/api/patients/${id}`);
    return S.charts[id];
  }
  const provider = (id) => S.providers.find((p) => p.id === id) || { name: id, short: id };

  // ---------------------------------------------------------------- toast & modal
  function toast(html, opts = {}) {
    let wrap = $('.toast-wrap'); if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
    const t = document.createElement('div'); t.className = 'toast ' + (opts.cls || ''); t.innerHTML = html; wrap.appendChild(t);
    const close = () => t.remove();
    t.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; if (opts.on) opts.on(b.dataset.act); close(); });
    if (!opts.sticky) setTimeout(close, opts.ms || 3500);
    return close;
  }
  function modal(title, body, foot, opts = {}) {
    closeModal();
    const back = document.createElement('div'); back.className = 'modal-back'; back.id = 'modal';
    back.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-label="${esc(title)}"><div class="modal-h"><h2>${title}</h2><button class="icon-btn" data-close>${I.x}</button></div><div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}</div>`;
    back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-close]')) closeModal(); });
    document.body.appendChild(back);
    const f = $('input,select,textarea', back); if (f && !opts.nofocus) f.focus();
    return back;
  }
  const closeModal = () => $('#modal')?.remove();

  // ---------------------------------------------------------------- routing
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function parseRoute() {
    const h = location.hash.replace(/^#\/?/, '') || defaultRoute();
    const [pathPart, qs] = h.split('?');
    const parts = pathPart.split('/');
    return { name: parts[0], parts, q: new URLSearchParams(qs || '') };
  }
  const defaultRoute = () => (S.user?.persona === 'provider' ? 'schedule' : S.user?.persona === 'care' ? 'worklist' : 'search');

  // ---------------------------------------------------------------- shell
  function shell() {
    const r = parseRoute();
    const activePt = r.name === 'patient' ? r.parts[1] : null;
    const ctx = topContext(r);
    const ix = S.interaction;
    document.body.classList.toggle('classic', !!S.settings.classic);
    document.body.classList.toggle('embed', S.embed);
    $('#root').innerHTML = `
    <div class="app">
      <header class="topbar">
        <div class="pattern"></div>
        <div class="menubar"><span>Task</span><span>Edit</span><span>View</span><span>Patient</span><span>Chart</span><span>Links</span><span>Navigation</span><span>Help</span></div>
        <div class="topbar-inner">
          <div class="context"><h1>${ctx.title}</h1><div class="sub">${ctx.sub}</div></div>
          <div class="aibar" id="aibar">
            <button class="side" title="Toggle AI panel" data-ai-toggle>${I.side}</button>
            <span class="pill"></span>
            <input id="aiInput" placeholder="${activePt ? 'Ask the Clinical AI Agent about this patient' : 'Type a message'}" autocomplete="off" aria-label="Ask the Clinical AI Agent">
            <button class="mic" id="micBtn" title="Dictate">${I.mic}</button>
            <div class="ai-panel hidden" id="aiPanel"></div>
          </div>
          <div class="top-right">
            ${ix ? `<button class="chip" data-go="${ix.patientId ? `#/patient/${ix.patientId}/summary` : '#/pop-results'}" title="Active Genesys Cloud interaction"><span class="dot call"></span><span id="ixTimer">${ix.direction === 'Outbound' ? 'Outbound' : 'On call'} ${timer(ix)}</span></button>` : ''}
            <button class="chip" data-go="#/genesys" title="Genesys Cloud screen pop listener"><span class="dot ${S.sseOn ? 'on' : ''}"></span>Genesys</button>
            <button class="avatar-btn" title="${esc(S.user?.name)} - ${esc(S.user?.role)}" data-usermenu>${esc(S.user ? initials(...S.user.name.split(' ')) : '?')}</button>
          </div>
        </div>
      </header>
      <main class="main"><div class="surface" id="surface"></div></main>
      <nav class="bottombar">
        ${S.user?.persona === 'provider' ? navBtn('schedule', I.cal, 'Schedule', r) : ''}
        ${navBtn('search', I.search, 'Patient Search', r)}
        ${navBtn('register', I.reg, 'Registration', r)}
        ${S.user?.persona !== 'provider' ? navBtn('schedule', I.cal, 'Schedule', r) : ''}
        ${navBtn('worklist', I.list, 'Care Worklist', r)}
        ${navBtn('messages', I.inbox, `Message Center${S.unread ? ` <span class="badge">${S.unread}</span>` : ''}`, r)}
        ${S.openTabs.map((id) => { const c = S.charts[id]; if (!c) return ''; return `<button class="ptab ${activePt === id ? 'active' : ''}" data-go="#/patient/${id}/summary"><span class="mini-avatar" style="background:${colorFor(id)}">${initials(c.firstName, c.lastName)}</span>${esc(c.firstName)} ${esc(c.lastName)} <span class="x" data-closetab="${id}">${I.x}</span></button>`; }).join('')}
      </nav>
    </div>
    <div class="demo-flag">Demo environment - fictional patients</div>`;
    bindShell();
  }
  const navBtn = (name, icon, label, r) => `<button class="${r.name === name ? 'active' : ''}" data-go="#/${name}">${icon}${label}</button>`;
  function topContext(r) {
    const u = S.user || {};
    if (r.name === 'schedule') { const pr = provider(S.settings.providerId); return { title: `${fmtLong(r.q.get('date') || S.today)}`, sub: esc(pr.name) }; }
    if (r.name === 'patient' && S.charts[r.parts[1]]) { const c = S.charts[r.parts[1]]; return { title: `${esc(c.lastName.toUpperCase())}, ${esc(c.firstName.toUpperCase())}`, sub: `MRN ${esc(c.mrn)} &middot; ${esc(u.name || '')}` }; }
    const titles = { search: 'Patient Search', register: 'Patient Registration', messages: 'Message Center', worklist: 'Care Management Worklist', genesys: 'Genesys Cloud Integration', 'pop-results': 'Screen Pop' };
    return { title: titles[r.name] || 'Oracle Health', sub: `${esc(u.name || '')} &middot; ${esc(u.role || '')}` };
  }
  function timer(ix) { const s = Math.max(0, Math.floor((Date.now() - ix.startedAt) / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
  setInterval(() => { const t = $('#ixTimer'); if (t && S.interaction) t.textContent = `${S.interaction.direction === 'Outbound' ? 'Outbound' : 'On call'} ${timer(S.interaction)}`; }, 1000);

  function bindShell() {
    $('#root').onclick = (e) => {
      const close = e.target.closest('[data-closetab]');
      if (close) { e.stopPropagation(); const id = close.dataset.closetab; S.openTabs = S.openTabs.filter((x) => x !== id); store.set('tabs', S.openTabs); if (parseRoute().parts[1] === id) go('#/' + defaultRoute()); else shell(), renderPage(); return; }
      const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); go(g.dataset.go); return; }
      if (e.target.closest('[data-usermenu]')) return userMenu();
      if (e.target.closest('[data-ai-toggle]')) return toggleAI();
    };
    const inp = $('#aiInput');
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && inp.value.trim()) { askAI(inp.value.trim()); inp.value = ''; } if (e.key === 'Escape') toggleAI(false); });
    inp.addEventListener('focus', () => toggleAI(true));
    $('#micBtn').onclick = dictate;
  }

  function userMenu() {
    const u = S.user;
    modal('Settings', `
      <p><b>${esc(u.name)}</b><br><span class="muted">${esc(u.role)} &middot; ${esc(u.email)}</span></p>
      <div class="field"><label>Genesys Cloud agent email (screen pops addressed to this agent open here)</label><input id="sAgent" value="${esc(S.settings.agentEmail || u.email)}"></div>
      <label class="field" style="flex-direction:row;gap:8px;align-items:center"><input type="checkbox" id="sAuto" ${S.settings.autoPop ? 'checked' : ''}> Open the patient chart automatically when a screen pop arrives</label>
      <label class="field" style="flex-direction:row;gap:8px;align-items:center"><input type="checkbox" id="sClassic" ${S.settings.classic ? 'checked' : ''}> Classic PowerChart view for patient charts</label>
      <div class="field"><label>Schedule provider</label><select id="sProv">${S.providers.map((p) => `<option value="${p.id}" ${p.id === S.settings.providerId ? 'selected' : ''}>${esc(p.name)} (${esc(p.specialty)})</option>`).join('')}</select></div>`,
      `<button class="btn danger" id="sReset">Reset demo data</button><button class="btn" id="sOut">Switch user</button><button class="btn primary" id="sSave">Save</button>`);
    $('#sSave').onclick = () => { S.settings.agentEmail = $('#sAgent').value.trim(); S.settings.autoPop = $('#sAuto').checked; S.settings.classic = $('#sClassic').checked; S.settings.providerId = $('#sProv').value; saveSettings(); connectSSE(); closeModal(); render(); };
    $('#sOut').onclick = () => { S.user = null; store.set('user', null); closeModal(); render(); };
    $('#sReset').onclick = async () => { await api('/api/admin/reset', { method: 'POST' }); S.charts = {}; S.openTabs = []; store.set('tabs', []); S.interaction = null; closeModal(); toast('Demo data reset'); go('#/' + defaultRoute()); };
  }

  // ---------------------------------------------------------------- AI agent
  function currentPatient() { const r = parseRoute(); return r.name === 'patient' ? S.charts[r.parts[1]] : null; }
  function toggleAI(force) {
    S.aiOpen = force ?? !S.aiOpen;
    const panel = $('#aiPanel'); if (!panel) return;
    panel.classList.toggle('hidden', !S.aiOpen);
    if (S.aiOpen) { renderAI(); setTimeout(() => document.addEventListener('click', function h(e) { if (!e.target.closest('#aibar')) { toggleAI(false); document.removeEventListener('click', h); } }), 0); }
  }
  function renderAI() {
    const p = currentPatient(); const panel = $('#aiPanel'); if (!panel) return;
    const log = S.aiLog.filter((x) => x.pid === (p?.id || null));
    panel.innerHTML = `${log.map((x) => `<div class="q">${esc(x.q)}</div><div class="a">${x.a ? x.a.html : '<span class="typing">Thinking</span>'}</div>
      ${x.a?.sources?.length ? `<table class="src"><tr><th>Author</th><th>Date</th><th>Title</th></tr>${x.a.sources.map((s) => `<tr><td>${esc(s.author)}</td><td>${esc(s.date)}</td><td><a href="#">${esc(s.title)}</a></td></tr>`).join('')}</table>` : ''}
      ${x.a ? `<div class="fb">Is this answer helpful? <button class="icon-btn" title="Copy">${I.copy}</button><button class="icon-btn" title="Helpful">${I.up}</button><button class="icon-btn" title="Not helpful">${I.down}</button></div>` : ''}`).join('')}
      ${!log.length ? `<div class="muted small" style="margin-bottom:8px">Clinical AI Agent (demo). Answers are generated from ${p ? `${esc(p.firstName)}'s chart` : 'your schedule'} and are not medical advice.</div>` : ''}
      <div class="sugg">${MockAI.suggestions(p).map((s) => `<button data-sugg="${esc(s)}">${esc(s)}</button>`).join('')}</div>`;
    panel.onclick = (e) => { const s = e.target.closest('[data-sugg]'); if (s) { e.stopPropagation(); askAI(s.dataset.sugg); } };
    panel.scrollTop = panel.scrollHeight;
  }
  async function askAI(q) {
    const p = currentPatient();
    const entry = { q, pid: p?.id || null, a: null }; S.aiLog.push(entry); toggleAI(true); renderAI();
    let ctx = {};
    if (!p) ctx.schedule = await api(`/api/schedule?providerId=${S.settings.providerId}&date=${S.today}`).catch(() => []);
    setTimeout(() => { entry.a = MockAI.answer(q, p, ctx); renderAI(); }, 650);
  }
  function dictate() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast('Voice input is not supported in this browser');
    const rec = new SR(); rec.lang = 'en-US'; rec.interimResults = false;
    const mic = $('#micBtn'); mic.classList.add('listening');
    rec.onresult = (e) => { askAI(e.results[0][0].transcript); };
    rec.onend = () => mic.classList.remove('listening');
    rec.start();
  }

  // ---------------------------------------------------------------- login
  function renderLogin() {
    document.body.className = '';
    $('#root').innerHTML = `
    <div class="login">
      <div class="brand">
        <div class="logo"><span class="mark"></span><span><b>ORACLE</b> Health</span></div>
        <h1>Oracle Health<br>Electronic Health Record</h1>
        <p style="max-width:440px;opacity:.85">Demonstration environment for Genesys Cloud contact center integration. All patients, providers and data are fictional.</p>
      </div>
      <div class="panel">
        <h2 style="font-size:22px;margin-bottom:6px">Sign in</h2>
        <p class="muted" style="margin-top:0">Choose a demo persona. No password needed.</p>
        ${S.users.map((u) => `<button class="persona" data-user="${u.id}"><div class="avatar" style="background:${colorFor(u.id)}">${initials(...u.name.split(' '))}</div><div><b>${esc(u.name)}</b><br><span class="muted small">${esc(u.role)}</span></div></button>`).join('')}
        <p class="small muted">Position: Lakeview Health (fictional) &middot; Domain: P1810</p>
      </div>
    </div>`;
    $$('[data-user]').forEach((b) => b.onclick = () => { S.user = S.users.find((u) => u.id === b.dataset.user); store.set('user', S.user); if (S.user.providerId) { S.settings.providerId = S.user.providerId; saveSettings(); } connectSSE(); go('#/' + defaultRoute()); });
  }

  // ---------------------------------------------------------------- render
  async function render() {
    if (!S.user) return renderLogin();
    shell();
    await renderPage();
  }
  async function renderPage() {
    const r = parseRoute(); const el = $('#surface');
    try {
      switch (r.name) {
        case 'schedule': return await pageSchedule(el, r);
        case 'search': return await pageSearch(el, r);
        case 'register': return pageRegister(el, r);
        case 'messages': return await pageMessages(el, r);
        case 'worklist': return await pageWorklist(el, r);
        case 'genesys': return await pageGenesys(el, r);
        case 'pop-results': return pagePopResults(el);
        case 'patient': return await pagePatient(el, r);
        default: go('#/' + defaultRoute());
      }
    } catch (e) { console.error(e); el.innerHTML = `<div class="page"><div class="card card-b" style="padding:20px"><h3>Something went wrong</h3><p class="muted">${esc(e.message)}</p></div></div>`; }
  }

  // ---------------------------------------------------------------- schedule (provider day view)
  async function pageSchedule(el, r) {
    const date = r.q.get('date') || S.today;
    const list = await api(`/api/schedule?providerId=${S.settings.providerId}&date=${date}`);
    const charts = await Promise.all(list.map((a) => loadChart(a.patientId)));
    const seen = list.filter((a) => ['Completed', 'Checked Out'].includes(a.status)).length;
    const shift = (n) => { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    const now = nowLocal();
    el.innerHTML = `
      <div class="sched-head">
        <div style="display:flex;gap:10px;align-items:center"><h2>${list.length} patients scheduled</h2>
          <button class="icon-btn" data-go="#/schedule?date=${shift(-1)}" title="Previous day">&lsaquo;</button><button class="btn sm" data-go="#/schedule">Today</button><button class="icon-btn" data-go="#/schedule?date=${shift(1)}" title="Next day">&rsaquo;</button></div>
        <div class="progress">${seen} of ${list.length} patients seen<div class="bar"><i style="width:${list.length ? (seen / list.length) * 100 : 0}%"></i></div></div>
        <div class="muted small">${esc(provider(S.settings.providerId).location)}</div>
      </div>
      <div class="page" style="padding-top:6px">
        ${list.length ? list.map((a, i) => { const p = charts[i]; const late = a.start < now && ['Confirmed', 'Unconfirmed'].includes(a.status) && date === S.today; return `
          <div class="appt ${i === 0 ? 'expanded' : ''} ${late ? 'late' : ''}" data-appt="${a.id}">
            <div class="time">${fmtT(a.start)}, <small>${a.durationMin} mins ${late ? `<span class="red">${I.clock}</span>` : ''}</small><div class="small muted" style="margin-top:4px">${a.room ? `${I.door} ${esc(a.room)}` : esc(a.visitMode)}</div></div>
            <div class="who">${avatar(p)}<div><b>${esc(p.firstName)} ${esc(p.lastName)}</b><div class="small">${age(p.dob)}y &nbsp; ${p.sex[0]} &nbsp; ${fmtDnum(p.dob)}</div></div></div>
            <div><div class="small muted">${esc(a.type)}</div><b style="font-size:13px">${esc(a.reason)}</b></div>
            <div style="text-align:right"><span class="tag ${a.status === 'Arrived' || a.status === 'Checked In' ? 'teal' : a.status === 'Completed' ? 'green' : 'light'}">${esc(a.status)}</span></div>
            <div class="ai ${i === 0 ? '' : 'hidden'}">${esc(MockAI.previsit(p))}<div class="small muted" style="margin-top:4px">Generated from ${Math.min(4, p.encounters.length + 1)} sources &middot; <a href="#/patient/${p.id}/summary">Open chart</a> &middot; ${['Confirmed', 'Unconfirmed'].includes(a.status) ? `<a href="#" data-checkin="${a.id}">Check in</a>` : a.status === 'Arrived' ? `<a href="#" data-complete="${a.id}">Mark seen</a>` : ''}</div></div>
          </div>`; }).join('') : '<div class="empty">No appointments scheduled for this day.</div>'}
      </div>`;
    el.onclick = async (e) => {
      const ci = e.target.closest('[data-checkin]'); const cm = e.target.closest('[data-complete]');
      if (ci || cm) { e.preventDefault(); e.stopPropagation(); await api(`/api/appointments/${(ci || cm).dataset.checkin || (ci || cm).dataset.complete}`, { method: 'PATCH', body: { status: ci ? 'Arrived' : 'Completed' } }); toast(ci ? 'Patient checked in' : 'Visit marked as seen'); return renderPage(); }
      const card = e.target.closest('[data-appt]'); if (!card || e.target.closest('a')) return;
      if (card.classList.contains('expanded')) { const a = list.find((x) => x.id === card.dataset.appt); return openPatient(a.patientId); }
      $$('.appt', el).forEach((c) => { c.classList.remove('expanded'); $('.ai', c).classList.add('hidden'); });
      card.classList.add('expanded'); $('.ai', card).classList.remove('hidden');
    };
  }

  // ---------------------------------------------------------------- search
  async function pageSearch(el, r) {
    const q = r.q.get('q') || ''; const phone = r.q.get('phone') || '';
    const results = q || phone ? await api(`/api/patients?${new URLSearchParams(phone ? { phone } : { q })}`) : [];
    el.innerHTML = `<div class="page">
      <div class="page-head"><h2>Patient Search</h2><button class="btn" data-go="#/register">${I.reg} Register new patient</button></div>
      <div class="card card-b" style="padding:16px">
        <form class="searchbar" id="sf">
          <div class="field" style="flex:2;min-width:240px"><label>Name, MRN, FIN, DOB (YYYY-MM-DD) or phone</label><input name="q" value="${esc(q || phone)}" placeholder="e.g. Gonzalez, 700101, 312-555-0142"></div>
          <button class="btn primary" type="submit">${I.search} Search</button>
        </form>
        <div class="small muted" style="margin-top:8px">Try: <a href="#/search?q=Whitfield">Whitfield</a> &middot; <a href="#/search?phone=3125550131">(312) 555-0131</a> (shared household phone) &middot; <a href="#/search?q=700104">700104</a></div>
      </div>
      ${q || phone ? `<h3 class="section-title">${results.length} result${results.length === 1 ? '' : 's'}</h3>${results.length ? resultsTable(results) : `<div class="card empty">No patients found. <a href="#/register${phone ? `?phone=${encodeURIComponent(phone)}` : ''}">Register a new patient</a>.</div>`}` : recentList()}
    </div>`;
    $('#sf').onsubmit = (e) => { e.preventDefault(); const v = e.target.q.value.trim(); go(`#/search?${digits(v).length >= 7 && /^[\d\s()+.-]+$/.test(v) ? 'phone' : 'q'}=${encodeURIComponent(v)}`); };
    bindResults(el);
  }
  function resultsTable(rows) {
    return `<div class="card"><table class="tbl"><tr><th>Name</th><th>MRN</th><th>DOB / Age</th><th>Sex</th><th>Phone</th><th>PCP</th><th>Next appointment</th></tr>
      ${rows.map((p) => `<tr class="click" data-open="${p.id}"><td><div class="who" style="display:flex;gap:10px;align-items:center">${avatar(p)}<div><b>${esc(p.lastName.toUpperCase())}, ${esc(p.firstName)}</b>${p.flags?.length ? `<div class="small orange">${esc(p.flags[0])}</div>` : ''}</div></div></td><td>${esc(p.mrn)}</td><td>${fmtDnum(p.dob)} (${p.age}y)</td><td>${esc(p.sex)}</td><td>${esc(p.phone)}</td><td>${esc(p.pcp)}</td><td>${p.nextAppointment ? `${fmtDT(p.nextAppointment.start)}<div class="small muted">${esc(p.nextAppointment.type)}</div>` : '<span class="muted">None</span>'}</td></tr>`).join('')}</table></div>`;
  }
  function recentList() {
    const ids = store.get('recent', []).filter((id) => S.charts[id]);
    return ids.length ? `<h3 class="section-title">Recent patients</h3><div class="card"><table class="tbl">${ids.map((id) => { const p = S.charts[id]; return `<tr class="click" data-open="${id}"><td><b>${esc(p.lastName.toUpperCase())}, ${esc(p.firstName)}</b></td><td>MRN ${esc(p.mrn)}</td><td>${fmtDnum(p.dob)}</td></tr>`; }).join('')}</table></div>` : '';
  }
  function bindResults(el) { el.onclick = (e) => { const o = e.target.closest('[data-open]'); if (o) { e.preventDefault(); openPatient(o.dataset.open); } }; }
  async function openPatient(id, tab = 'summary') {
    await loadChart(id);
    if (!S.openTabs.includes(id)) { S.openTabs.push(id); S.openTabs = S.openTabs.slice(-5); store.set('tabs', S.openTabs); }
    store.set('recent', [id, ...store.get('recent', []).filter((x) => x !== id)].slice(0, 8));
    go(`#/patient/${id}/${tab}`);
  }

  // ---------------------------------------------------------------- patient chart
  const TABS = [['summary', 'Summary'], ['problems', 'Problems'], ['medications', 'Medications'], ['results', 'Results'], ['documents', 'Documents'], ['allergies', 'Allergies'], ['visits', 'Visits'], ['careteam', 'Care Team'], ['activity', 'Activity Log'], ['account', 'Account'], ['histories', 'Histories']];
  async function pagePatient(el, r) {
    const id = r.parts[1]; const tab = r.parts[2] || 'summary';
    const p = await loadChart(id);
    if (!S.openTabs.includes(id)) { S.openTabs.push(id); store.set('tabs', S.openTabs); shell(); return renderPage(); }
    if (S.settings.classic) return chartClassic(el, p, tab);
    const appt = (p.appointments || []).find((a) => a.start.startsWith(S.today) && a.status !== 'Cancelled');
    el.innerHTML = `<div class="chart">
      ${patientSide(p, appt)}
      <div class="cmain">
        ${interactionBanner(p)}
        <nav class="ctabs">${TABS.map(([k, l]) => `<a href="#/patient/${id}/${k}" class="${k === tab ? 'on' : ''}">${l}${k === 'activity' && p.activities.length ? ` (${p.activities.length})` : ''}</a>`).join('')}</nav>
        <div id="tabBody">${tabBody(p, tab)}</div>
      </div>
      ${needsAttention(p)}
    </div>`;
    bindChart(el, p);
  }
  function patientSide(p, appt) {
    const pr = p.pcp?.name || '--';
    return `<aside class="pside">
      <div class="top">${avatar(p, 'lg')}<div class="meta">${appt ? `<span>${I.clock} ${fmtT(appt.start)} - ${fmtT(new Date(new Date(appt.start).getTime() + appt.durationMin * 60000))}</span><span>${I.door} ${esc(appt.room || appt.visitMode)}</span><span><span class="status-pill">${esc(appt.status)}</span></span>` : `<span class="muted">No visit today</span>`}</div></div>
      <h2>${esc(p.firstName)} ${esc(p.lastName)} ${p.preferredName !== p.firstName ? `<span>(${esc(p.preferredName)})</span>` : ''}</h2>
      <div class="small">${esc(p.sex)} &nbsp;|&nbsp; ${p.age} years</div>
      <div class="sec"><div class="kv"><span>DOB</span><b>${fmtD(p.dob)}</b></div><div class="kv"><span>MRN</span><b>${esc(p.mrn)}</b></div><div class="kv"><span>FIN</span><b>${esc(p.fin)}</b></div></div>
      <div class="sec"><div class="lbl">Allergies</div><b>${p.allergies.length ? p.allergies.map((a) => esc(a.substance)).join(', ') : 'No known medication allergies'}</b></div>
      <div class="sec">${esc(p.codeStatus)} <span class="muted">(${p.advanceDirective !== 'None' ? 'ACP on file' : 'no ACP'})</span>${p.onStudy ? ' | <span class="orange">On Study</span>' : ''}
        ${p.riskIndicators.length ? `<div class="lbl" style="margin-top:8px">Evidence-based indicators</div>${p.riskIndicators.map((x) => `<div class="risk ${x.level}">${I.warn} ${esc(x.label)}</div>`).join('')}` : ''}</div>
      <div class="sec opt"><div class="kv"><span>Weight</span><b>${p.weight ? p.weight + ' kg' : '--'}</b></div><div class="kv"><span>BMI</span><b>${p.weight && p.height ? (p.weight / ((p.height / 100) ** 2)).toFixed(2) + ' kg/m²' : '--'}</b></div></div>
      <div class="sec opt"><div class="lbl">Advanced Care Plan</div>${esc(p.advanceDirective)}</div>
      <div class="sec opt"><div class="lbl">PCP</div>${esc(pr)}</div>
      <div class="sec"><div class="lbl">Contact <a href="#" data-edit-demo style="float:right">Edit</a></div>${p.phones.map((ph) => `<div class="kv"><span>${esc(ph.type)}</span><b>${esc(ph.number)}</b></div>`).join('')}${p.email ? `<div class="small">${esc(p.email)}</div>` : ''}<div class="small">${esc(p.address?.line)}${p.address?.city ? `, ${esc(p.address.city)}, ${esc(p.address.state)} ${esc(p.address.zip)}` : ''}</div></div>
      <div class="sec opt"><div class="kv"><span>Language</span><b>${esc(p.language)}${p.interpreter ? ' <span class="orange">(Interpreter)</span>' : ''}</b></div><div class="kv"><span>Coverage</span><b>${esc(p.insurance?.payer)}</b></div><div class="kv"><span>Patient Portal</span><b><span class="tag ${p.portal === 'Active' ? '' : 'light'}">${esc(p.portal)}</span></b></div></div>
      ${p.programs.length ? `<div class="sec opt"><div class="lbl">Enrolled Programs</div>${p.programs.map((x) => esc(x.name)).join(' | ')}</div>` : ''}
      ${p.flags.length ? `<div class="sec">${p.flags.map((f) => `<div class="orange small">${I.warn} ${esc(f)}</div>`).join('')}</div>` : ''}
      <button class="ghost small more-btn" onclick="this.closest('.pside').classList.toggle('show-all')">Show more details</button>
    </aside>`;
  }
  function needsAttention(p) {
    const items = [];
    (p.orders || []).filter((o) => /pending|due/i.test(o.status)).forEach((o) => items.push(`<b>${esc(o.name)}</b><br>${esc(o.status)}`));
    if (p.account.balance > 0) items.push(`<b>Balance due ${money(p.account.balance)}</b><br>${p.account.statements.some((s) => s.status === 'Past due') ? '<span class="red">Past due</span>' : 'Statement issued'}`);
    p.medications.filter((m) => m.status === 'Active' && m.refills === 0).forEach((m) => items.push(`<b>${esc(m.name)}</b><br>0 refills remaining`));
    return `<aside class="needs"><h3>Needs Attention (${items.length})</h3>${items.length ? items.map((i) => `<div class="item">${i}</div>`).join('') : '<div class="small">No orders to sign.</div>'}</aside>`;
  }
  function interactionBanner(p) {
    const ix = S.interaction; if (!ix || ix.patientId !== p.id) return '';
    return `<div class="ix">
      <span class="ttl">${I.phone} Genesys Cloud ${esc(ix.direction.toLowerCase())} ${esc(ix.mediaType === 'voice' ? 'call' : ix.mediaType)}</span>
      <span>${esc(ix.phone || 'Unknown number')}</span>${ix.queue ? `<span class="muted">Queue: ${esc(ix.queue)}</span>` : ''}${ix.intent ? `<span class="muted">Intent: ${esc(ix.intent)}</span>` : ''}
      ${ix.matchedOn ? `<span class="small muted">Matched on ${esc(ix.matchedOn)}</span>` : ''}
      <span class="sp"></span>
      ${ix.verified ? `<span class="verify ok">&#10003; Identity verified (name + DOB)</span>` : `<span class="verify"><input id="vDob" placeholder="Caller's DOB (MM/DD/YYYY)" style="padding:4px 6px;border:1px solid #bbb;border-radius:4px;width:190px"><button class="btn sm" id="vBtn">Verify</button></span>`}
      <button class="btn sm genesys" id="wrapBtn">Log call &amp; wrap up</button>
      ${ix.conversationId ? `<span class="small muted" title="Genesys conversation ID">ID ${esc(ix.conversationId.slice(0, 8))}</span>` : ''}
    </div>`;
  }

  function tabBody(p, tab) {
    const f = { summary: tSummary, problems: tProblems, medications: tMeds, results: tResults, documents: tDocs, allergies: tAllergies, visits: tVisits, careteam: tCareTeam, activity: tActivity, account: tAccount, histories: tHistories }[tab] || tSummary;
    return f(p);
  }
  function tSummary(p) {
    const s = MockAI.summary(p); const v = [...p.vitals].sort((a, b) => b.date.localeCompare(a.date))[0];
    return `${timeline(p)}
      <div class="ai-summary">${s.html}<div class="gen">Generated from <a href="#">${s.sources} source${s.sources > 1 ? 's' : ''}</a></div></div>
      <div class="card"><div class="card-h"><h3>Vitals</h3><span class="small muted">${v ? fmtDT(v.date) : ''}</span></div><div class="card-b">${v ? `<div class="vitals">
        <div>Temperature<b>${v.temp} degC</b></div><div>Heart rate<b>${v.hr} bpm</b></div><div>Blood pressure<b class="${v.sys >= 140 ? 'orange' : ''}">${v.sys}/${v.dia} mmHg</b></div><div>SpO2<b class="${v.spo2 < 92 ? 'orange' : ''}">${v.spo2} %</b></div><div>Respiratory rate<b>${v.rr} br/min</b></div><div>Pain<b>${v.pain || '-'}</b></div><div>Height<b>${v.height} cm</b></div><div>Weight<b>${v.weight} kg</b></div></div>` : '<span class="muted">No vitals recorded</span>'}</div></div>
      <div class="two">
        <div class="card"><div class="card-h"><h3>Problems (${p.problems.filter((x) => x.status === 'Active').length})</h3><button class="icon-btn" data-add="problem" title="Add problem">${I.plus}</button></div><div class="card-b">${p.problems.filter((x) => x.status === 'Active').map((x) => `<div class="li"><div><div class="t">${esc(x.name)}</div><div class="s"><span class="tag">This Visit</span> <span class="tag">Ongoing</span> | Active, Priority:${x.priority}</div></div></div>`).join('') || '<div class="muted">No active problems</div>'}</div></div>
        <div class="card"><div class="card-h"><h3>Medications (${p.medications.filter((m) => m.status !== 'Completed').length})</h3><button class="icon-btn" data-add="rx" title="New prescription">${I.plus}</button></div><div class="card-b">${medRows(p, 5)}</div></div>
      </div>`;
  }
  function medRows(p, limit) {
    const meds = p.medications.filter((m) => m.status !== 'Completed').slice(0, limit || 99);
    return meds.map((m) => `<div class="li"><div><div class="t">${esc(m.name)}</div><div class="s">${esc(m.sig)}, ${m.refills} Refill(s)${m.status !== 'Active' ? ` <span class="orange">${esc(m.status)}</span>` : ''}${m.lastRenewed ? ` <span class="green">Renewed ${fmtD(m.lastRenewed)}</span>` : ''}</div></div><button class="icon-btn" data-medmenu="${esc(m.name)}" title="Actions">${I.more}</button></div>`).join('') || '<div class="muted">No active medications</div>';
  }
  function timeline(p) {
    const end = new Date(S.today + 'T12:00:00'); const start = new Date(end); start.setFullYear(end.getFullYear() - 3);
    const W = 1000, H = 64, span = end - start;
    const x = (d) => ((new Date(d + 'T12:00:00') - start) / span) * W;
    const bars = p.encounters.filter((e) => new Date(e.date) >= start).map((e) => { const ip = e.type !== 'Outpatient'; const w = ip ? Math.max(8, (e.los || 1) * 4) : 7; return `<rect x="${x(e.date) - w / 2}" y="${ip ? 6 : 26}" width="${w}" height="${ip ? 48 : 28}" fill="${ip ? '#c0392b' : '#7a7774'}"><title>${esc(fmtD(e.date))}: ${esc(e.type)} - ${esc(e.reason)}</title></rect>`; }).join('');
    const yrs = []; for (let y = start.getFullYear() + 1; y <= end.getFullYear(); y++) { const xx = x(`${y}-01-01`); yrs.push(`<line x1="${xx}" x2="${xx}" y1="0" y2="${H - 8}" stroke="#ccc"/><text x="${xx}" y="${H + 6}" font-size="11" text-anchor="middle" fill="#6f6c68">${y}</text>`); }
    return `<div class="timeline"><div style="display:flex;justify-content:space-between"><b>Encounters</b><div class="legend"><span><i style="background:#7a7774"></i>Outpatient</span><span><i style="background:#c0392b"></i>Inpatient &amp; ED</span></div></div>
      <svg viewBox="0 -2 ${W} ${H + 12}" width="100%" height="80" preserveAspectRatio="none" style="display:block">${yrs.join('')}<line x1="0" x2="${W}" y1="${H - 8}" y2="${H - 8}" stroke="#bbb"/>${bars}</svg></div>`;
  }
  function tProblems(p) {
    return `<div class="page-head" style="margin-top:14px"><h2>Problems</h2><button class="btn" data-add="problem">${I.plus} Add problem</button></div>
      <div class="card"><table class="tbl"><tr><th>Problem</th><th>ICD-10</th><th>Status</th><th>Onset</th><th>Priority</th></tr>${p.problems.map((x) => `<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.code)}</td><td>${esc(x.status)}</td><td>${fmtD(x.onset)}</td><td>${x.priority}</td></tr>`).join('')}</table>${p.problems.length ? '' : '<div class="empty">No problems documented</div>'}</div>`;
  }
  function tMeds(p) {
    return `<div class="page-head" style="margin-top:14px"><h2>Medications</h2><button class="btn primary" data-add="rx">${I.plus} New Prescription</button></div>
      <div class="card"><table class="tbl"><tr><th>Medication</th><th>Instructions</th><th>Status</th><th>Refills</th><th>Start</th><th>Prescriber</th><th></th></tr>${p.medications.map((m) => `<tr><td><b>${esc(m.name)}</b></td><td>${esc(m.sig)}</td><td>${esc(m.status)}</td><td class="${m.refills === 0 && m.status === 'Active' ? 'red' : ''}">${m.refills}</td><td>${fmtD(m.start)}</td><td>${esc(provider(m.prescriber).short || m.prescriber)}</td><td>${m.status === 'Active' ? `<button class="btn sm" data-renew="${esc(m.name)}">Renew</button>` : ''}</td></tr>`).join('')}</table></div>`;
  }
  function tResults(p) {
    const rs = [...p.results].sort((a, b) => b.date.localeCompare(a.date));
    return `<h2 style="margin:14px 0">Results</h2>${rs.length ? rs.map((r) => `<div class="card" style="margin-bottom:12px"><div class="card-h"><h3>${esc(r.panel)}</h3><span class="small muted">${fmtDT(r.date)}</span></div><table class="tbl"><tr><th>Test</th><th>Result</th><th>Units</th><th>Reference</th></tr>${r.items.map((i) => `<tr><td>${esc(i.name)}</td><td class="flag-${i.flag}">${esc(i.value)} ${i.flag ? `(${i.flag})` : ''}</td><td>${esc(i.unit)}</td><td>${esc(i.range)}</td></tr>`).join('')}</table></div>`).join('') : '<div class="card empty">No results</div>'}`;
  }
  function tDocs(p) {
    return `<div class="page-head" style="margin-top:14px"><h2>Documents</h2><button class="btn" data-add="note">${I.plus} New note</button></div>
      <div class="card"><table class="tbl"><tr><th>Date</th><th>Title</th><th>Type</th><th>Author</th></tr>${p.documents.map((d) => `<tr class="click" data-doc="${d.id}"><td class="nowrap">${fmtDT(d.date)}</td><td><b>${esc(d.title)}</b></td><td>${esc(d.type)}</td><td>${esc(d.author)}</td></tr>`).join('')}</table>${p.documents.length ? '' : '<div class="empty">No documents</div>'}</div>`;
  }
  function tAllergies(p) {
    return `<div class="page-head" style="margin-top:14px"><h2>Allergies</h2><button class="btn" data-add="allergy">${I.plus} Add allergy</button></div>
      <div class="card"><table class="tbl"><tr><th>Substance</th><th>Reaction</th><th>Severity</th></tr>${p.allergies.map((a) => `<tr><td><b>${esc(a.substance)}</b></td><td>${esc(a.reaction)}</td><td class="${a.severity === 'Severe' ? 'red' : ''}">${esc(a.severity)}</td></tr>`).join('')}</table>${p.allergies.length ? '' : '<div class="empty">No known allergies</div>'}</div>`;
  }
  function tVisits(p) {
    const up = p.appointments.filter((a) => a.start.slice(0, 10) >= S.today && !['Completed', 'Cancelled'].includes(a.status)).sort((a, b) => a.start.localeCompare(b.start));
    const past = p.appointments.filter((a) => !up.includes(a));
    return `<div class="page-head" style="margin-top:14px"><h2>Appointments</h2><button class="btn primary" data-add="appt">${I.cal} Schedule appointment</button></div>
      <div class="card"><table class="tbl"><tr><th>Date / time</th><th>Type</th><th>Provider</th><th>Location</th><th>Status</th><th></th></tr>
      ${up.map((a) => `<tr><td class="nowrap"><b>${fmtDT(a.start)}</b><div class="small muted">${a.durationMin} min &middot; ${esc(a.visitMode)}</div></td><td>${esc(a.type)}<div class="small muted">${esc(a.reason)}</div>${a.notes ? `<div class="small orange">${esc(a.notes)}</div>` : ''}</td><td>${esc(a.providerName)}<div class="small muted">${esc(a.specialty)}</div></td><td>${esc(a.location)}</td><td><span class="tag light">${esc(a.status)}</span></td>
        <td class="nowrap">${a.start.startsWith(S.today) && a.status !== 'Arrived' ? `<button class="btn sm" data-apptact="Arrived" data-id="${a.id}">Check in</button> ` : ''}<button class="btn sm" data-resched="${a.id}">Reschedule</button> <button class="btn sm danger" data-apptact="Cancelled" data-id="${a.id}">Cancel</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">No upcoming appointments</td></tr>'}</table></div>
      <h3 class="section-title">Past appointments and encounters</h3>
      <div class="card"><table class="tbl"><tr><th>Date</th><th>Type</th><th>Reason</th><th>Provider</th><th>Location</th><th>Status</th></tr>
      ${[...past.map((a) => ({ d: a.start, type: a.type, reason: a.reason, prov: a.providerName, loc: a.location, st: a.status })), ...p.encounters.filter((e) => e.type !== 'Outpatient').map((e) => ({ d: e.date, type: e.type, reason: e.reason, prov: provider(e.providerId).name, loc: e.location, st: e.los ? `${e.los} day stay` : 'Discharged' }))].sort((a, b) => b.d.localeCompare(a.d)).map((x) => `<tr><td class="nowrap">${fmtD(x.d)}</td><td>${esc(x.type)}</td><td>${esc(x.reason)}</td><td>${esc(x.prov)}</td><td>${esc(x.loc)}</td><td>${esc(x.st)}</td></tr>`).join('')}</table></div>`;
  }
  function tCareTeam(p) {
    return `<h2 style="margin:14px 0">Care Team (${p.careTeam.length})</h2><div class="card"><table class="tbl"><tr><th>Role</th><th>Name</th><th>Contact</th></tr>
      <tr class="grp"><td colspan="3">&#9662; Ongoing</td></tr>${p.careTeam.map((c) => `<tr><td>${esc(c.role)}</td><td>${esc(c.name)}</td><td>${esc(c.phone)}</td></tr>`).join('')}
      <tr class="grp"><td colspan="3">&#9662; Personal</td></tr>${p.emergencyContact ? `<tr><td>${esc(p.emergencyContact.relationship)}</td><td>${esc(p.emergencyContact.name)}</td><td>${esc(p.emergencyContact.phone)}</td></tr>` : '<tr><td colspan="3" class="muted">No Care Team Members</td></tr>'}</table></div>`;
  }
  function tActivity(p) {
    return `<div class="page-head" style="margin-top:14px"><h2>Activity Log (${p.activities.length})</h2><button class="btn" data-add="activity">${I.plus} Log contact</button></div>
      <div class="card"><table class="tbl"><tr><th>Date/Duration</th><th>Method/Type</th><th>Outcome</th><th>Contact/Contact Type</th><th>Created By</th><th>Notes</th></tr>
      ${[...p.activities].sort((a, b) => b.datetime.localeCompare(a.datetime)).map((a) => `<tr><td class="nowrap">${fmtDT(a.datetime)}<div class="small muted">(${a.durationMin} min)</div></td><td>${esc(a.method)}<div class="small muted">(${esc(a.direction)})</div></td><td>${esc(a.outcome)}</td><td>${esc(a.contact)}</td><td>${esc(a.createdBy)}</td><td class="small">${esc(a.note)}${a.conversationId ? `<div class="muted">Genesys ID ${esc(a.conversationId)}</div>` : ''}</td></tr>`).join('')}</table>${p.activities.length ? '' : '<div class="empty">No activity logged</div>'}</div>`;
  }
  function tAccount(p) {
    const a = p.account; const ins = p.insurance || {};
    return `<div class="page-head" style="margin-top:14px"><h2>Patient Account</h2><div style="display:flex;gap:8px"><button class="btn" data-add="elig">Check eligibility</button><button class="btn primary" data-add="pay" ${a.balance > 0 ? '' : 'disabled'}>Take payment</button></div></div>
      <div class="two" style="margin-top:0">
        <div class="card card-b" style="padding:16px"><div class="muted small">Patient balance</div><div style="font-size:30px;font-weight:300">${money(a.balance)}</div>
          <div class="small">Guarantor: ${esc(a.guarantor)}</div>${a.lastPayment ? `<div class="small">Last payment ${money(a.lastPayment.amount)} on ${fmtD(a.lastPayment.date)}</div>` : ''}
          ${a.paymentPlan ? `<div class="small" style="margin-top:6px"><span class="tag teal">Payment plan</span> ${money(a.paymentPlan.monthly)}/month, ${a.paymentPlan.remaining} payments left${a.paymentPlan.autopay ? ', autopay on' : ''}</div>` : ''}
          ${a.financialAssistance ? `<div class="small orange" style="margin-top:6px">Financial assistance: ${esc(a.financialAssistance)}</div>` : ''}</div>
        <div class="card card-b" style="padding:16px"><div class="muted small">Coverage</div><b>${esc(ins.payer)}</b><div>${esc(ins.plan)}</div><div class="small">Member ID ${esc(ins.memberId || '--')} &middot; Group ${esc(ins.group || '--')}</div>${ins.secondary ? `<div class="small">Secondary: ${esc(ins.secondary)}</div>` : ''}<div style="margin-top:6px"><span class="tag ${/eligible/i.test(ins.status) ? 'green' : 'amber'}">${esc(ins.status)}</span></div></div>
      </div>
      <h3 class="section-title">Statements</h3><div class="card"><table class="tbl"><tr><th>Statement date</th><th>Amount</th><th>Due</th><th>Status</th></tr>${a.statements.map((s) => `<tr><td>${fmtD(s.date)}</td><td>${money(s.amount)}</td><td>${fmtD(s.dueDate)}</td><td class="${s.status === 'Past due' ? 'red' : ''}">${esc(s.status)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No statements</td></tr>'}</table></div>
      ${(a.payments || []).length ? `<h3 class="section-title">Payments this session</h3><div class="card"><table class="tbl"><tr><th>Date</th><th>Amount</th><th>Method</th><th>Confirmation</th></tr>${a.payments.map((x) => `<tr><td>${fmtDT(x.date)}</td><td>${money(x.amount)}</td><td>${esc(x.method)}</td><td>${esc(x.confirmation)}</td></tr>`).join('')}</table></div>` : ''}`;
  }
  function tHistories(p) {
    return `<h2 style="margin:14px 0">Histories</h2><div class="two" style="margin-top:0">
      <div class="card"><div class="card-h"><h3>Immunizations</h3></div><div class="card-b">${p.immunizations.map((i) => `<div class="li"><span>${esc(i.name)}</span><span class="muted">${fmtD(i.date)}</span></div>`).join('') || '<div class="muted">None recorded</div>'}</div></div>
      <div class="card"><div class="card-h"><h3>Orders</h3></div><div class="card-b">${(p.orders || []).map((o) => `<div class="li"><div><div class="t">${esc(o.name)}</div><div class="s">${esc(o.status)}</div></div><span class="muted small">${fmtD(o.date)}</span></div>`).join('') || '<div class="muted">No open orders</div>'}</div></div>
      <div class="card"><div class="card-h"><h3>Advance directive &amp; code status</h3></div><div class="card-b">${esc(p.codeStatus)}<br>${esc(p.advanceDirective)}</div></div>
      <div class="card"><div class="card-h"><h3>Emergency contact</h3></div><div class="card-b">${p.emergencyContact ? `${esc(p.emergencyContact.name)} (${esc(p.emergencyContact.relationship)})<br>${esc(p.emergencyContact.phone)}` : '<span class="muted">None on file</span>'}</div></div></div>`;
  }

  // ---------------------------------------------------------------- classic PowerChart layout
  const PC_NAV = [['summary', 'Summary'], ['problems', 'Problems'], ['careteam', 'Care Team'], ['activity', 'Activity Log'], ['medications', 'Medications'], ['results', 'Labs'], ['allergies', 'Allergies'], ['visits', 'Appointments'], ['documents', 'Documents'], ['account', 'Account'], ['histories', 'Histories']];
  function chartClassic(el, p, tab) {
    const notif = (p.orders || []).filter((o) => /pending/i.test(o.status)).length + (p.account.balance > 0 ? 1 : 0);
    el.innerHTML = `
      <div class="pc-banner">
        <div class="avatar" style="width:50px;height:50px;background:${colorFor(p.id)}">${initials(p.firstName, p.lastName)}</div>
        <div><div class="name">${esc(p.lastName)}, ${esc(p.firstName)}</div>Allergies: ${p.allergies.length ? p.allergies.map((a) => esc(a.substance)).join(', ') : 'NKA'}<br>Care Team: <u>View Details</u></div>
        <div>DOB: ${fmtDnum(p.dob)}<br>MRN: ${esc(p.mrn)}<br>Loc: ${esc((p.appointments.find((a) => a.start.startsWith(S.today)) || {}).room || 'Outpatient')}</div>
        <div>Age: ${p.age} years<br>At Risk: ${esc(p.insurance.payer.split(' ')[0])}<br>Language: ${esc(p.language)}</div>
        <div>Sex: ${esc(p.sex)}<br>Resuscitation Status: ${esc(p.codeStatus)}<br>Patient Portal: ${p.portal === 'Active' ? 'Yes' : 'No'}</div>
        <div>FIN: ${esc(p.fin)}<br>Clinical Trials: ${p.onStudy ? 'Yes' : 'No'}<br>Advance Dir: ${p.advanceDirective !== 'None' ? 'Yes' : ''}</div>
        <div class="notif">Notifications<div style="margin-top:4px">${I.bell} <span class="tag" style="background:#ff8a00;border-radius:2px;padding:0 5px">${notif}</span></div></div>
      </div>
      <div class="pc-toolbar"><span class="home">${I.home} HealtheCare</span><span style="flex:1"></span><span>Normal view</span><span>Print</span><span>${I.refresh} 0 minutes ago</span></div>
      <div class="pc-tabs"><a class="${p.programs.length ? '' : 'on'}" href="#/patient/${p.id}/summary">Enrollment</a><a class="${p.programs.length ? 'on' : ''}" href="#/patient/${p.id}/${tab}">Active Case</a><a href="#/patient/${p.id}/activity">Close Case</a></div>
      ${interactionBanner(p) ? `<div style="padding:0 12px">${interactionBanner(p)}</div>` : ''}
      <div class="pc-body">
        <nav class="pc-nav">${PC_NAV.map(([k, l]) => `<a href="#/patient/${p.id}/${k}" class="${k === tab ? 'on' : ''}">${l}${k === 'careteam' ? ` (${p.careTeam.length})` : k === 'activity' ? ` (${p.activities.length})` : k === 'documents' ? ` (${p.documents.length})` : ''}</a>`).join('')}
          <div class="hd">Create Note</div><a class="lk" href="#" data-add="note">Case Summary Note</a><a class="lk" href="#" data-add="note">Care Plan Note</a><a class="lk" href="#" data-add="activity">Log Contact</a></nav>
        <div class="pc-content">${tab === 'summary'
          ? `<div class="pc-section"><h3>Problems <button class="icon-btn" data-add="problem">${I.plus}</button></h3><div>${tProblems(p).replace(/<div class="page-head"[\s\S]*?<\/button><\/div>/, '').replace('<div class="card">', '<div>')}</div></div>
             <div class="pc-section"><h3>Care Team (${p.careTeam.length})</h3><div>${tCareTeam(p).replace(/<h2[\s\S]*?<\/h2>/, '')}</div></div>
             <div class="pc-section"><h3>Activity Log (${p.activities.length}) <button class="icon-btn" data-add="activity">${I.plus}</button></h3><div>${tActivity(p).replace(/<div class="page-head"[\s\S]*?<\/button><\/div>/, '')}</div></div>`
          : `<div class="pc-section"><div>${tabBody(p, tab)}</div></div>`}</div>
        <div class="pc-right"><div style="display:flex;gap:4px;margin-bottom:8px"><span class="btn sm">Entry</span><span class="btn sm" style="font-weight:600">Check In Prep</span></div>
          <h3 style="font-weight:400;font-size:18px">Check In Prep</h3><button class="btn sm" id="genSum" style="margin:8px 0">Generate Summary</button>
          <div id="cip" class="small">${MockAI.checkInPrep(p)}</div>
          <div class="small" style="display:flex;justify-content:space-between;margin-top:14px;border-top:1px solid #ddd;padding-top:8px"><a href="#">Supporting Facts</a><span>Feedback ${I.up} ${I.down}</span></div></div>
      </div>
      <div class="pc-status"><span>P1810</span><span>${esc(S.user.position || 'PHCASEMGR')}</span><span>${new Date(Date.now() + S.clockSkew).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span><span>${new Date(Date.now() + S.clockSkew).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span></div>`;
    $('#genSum', el).onclick = () => { $('#cip', el).innerHTML = '<span class="typing">Generating</span>'; setTimeout(() => { $('#cip', el).innerHTML = MockAI.checkInPrep(p); }, 700); };
    bindChart(el, p);
  }

  // ---------------------------------------------------------------- chart actions
  function bindChart(el, p) {
    el.onclick = async (e) => {
      const t = e.target;
      const tabLink = t.closest('[data-tab]'); if (tabLink) { e.preventDefault(); return go(`#/patient/${p.id}/${tabLink.dataset.tab}`); }
      const add = t.closest('[data-add]'); if (add) { e.preventDefault(); return chartAction(add.dataset.add, p); }
      const renew = t.closest('[data-renew]'); if (renew) return renewRx(p, renew.dataset.renew);
      const mm = t.closest('[data-medmenu]'); if (mm) return renewRx(p, mm.dataset.medmenu);
      const doc = t.closest('[data-doc]'); if (doc) { const d = p.documents.find((x) => x.id === doc.dataset.doc); return modal(esc(d.title), `<p class="muted small">${fmtDT(d.date)} &middot; ${esc(d.author)} &middot; ${esc(d.type)}</p><p style="white-space:pre-wrap">${esc(d.text)}</p>`, '<button class="btn" data-close>Close</button>', { nofocus: true }); }
      const aa = t.closest('[data-apptact]'); if (aa) { if (aa.dataset.apptact === 'Cancelled' && !confirm('Cancel this appointment?')) return; await api(`/api/appointments/${aa.dataset.id}`, { method: 'PATCH', body: { status: aa.dataset.apptact } }); await refreshChart(p, aa.dataset.apptact === 'Cancelled' ? 'Appointment cancelled' : 'Patient checked in', { outcome: aa.dataset.apptact === 'Cancelled' ? 'Appointment cancelled' : null }); return; }
      const rs = t.closest('[data-resched]'); if (rs) return scheduleModal(p, p.appointments.find((a) => a.id === rs.dataset.resched));
      if (t.closest('[data-edit-demo]')) { e.preventDefault(); return editDemographics(p); }
      if (t.closest('#vBtn')) return verifyIdentity(p);
      if (t.closest('#wrapBtn')) return wrapUp(p);
    };
    const v = $('#vDob', el); if (v) v.onkeydown = (e) => { if (e.key === 'Enter') verifyIdentity(p); };
  }
  async function refreshChart(p, msg, ixNote) {
    await loadChart(p.id, true);
    if (ixNote?.outcome && S.interaction?.patientId === p.id) (S.interaction.outcomes = S.interaction.outcomes || []).push(ixNote.outcome);
    if (msg) toast(msg);
    renderPage();
  }
  function chartAction(kind, p) {
    if (kind === 'rx') return rxModal(p);
    if (kind === 'appt') return scheduleModal(p);
    if (kind === 'pay') return payModal(p);
    if (kind === 'elig') { toast('Checking eligibility with payer...'); return setTimeout(() => toast(`<b>Eligibility response</b><br>${esc(p.insurance.payer)}: ${/self/i.test(p.insurance.payer) ? 'No active coverage found' : 'Active coverage. Copay $25 office visit, deductible met 62%.'}`, { ms: 6000 }), 1200); }
    if (kind === 'activity') return activityModal(p);
    if (kind === 'note') return noteModal(p);
    if (kind === 'problem') return simpleAdd(p, 'Add problem', [['name', 'Problem'], ['code', 'ICD-10 code']], (v) => { S.charts[p.id].problems.push({ name: v.name, code: v.code, status: 'Active', onset: S.today, priority: p.problems.length + 1 }); });
    if (kind === 'allergy') return simpleAdd(p, 'Add allergy', [['substance', 'Substance'], ['reaction', 'Reaction'], ['severity', 'Severity (Mild/Moderate/Severe)']], (v) => { S.charts[p.id].allergies.push(v); });
  }
  function simpleAdd(p, title, fields, apply) {
    modal(title, fields.map(([k, l]) => `<div class="field"><label>${l}</label><input id="f_${k}"></div>`).join('') + '<p class="small muted">Saved for this browser session only.</p>', '<button class="btn" data-close>Cancel</button><button class="btn primary" id="fOk">Save</button>');
    $('#fOk').onclick = () => { const v = Object.fromEntries(fields.map(([k]) => [k, $('#f_' + k).value.trim()])); if (!Object.values(v)[0]) return; apply(v); closeModal(); toast('Saved'); renderPage(); };
  }

  const FREQUENT = ['lisinopril 10 mg oral tablet', 'Tamiflu 75 mg oral capsule', 'metFORMIN 500 mg oral tablet', 'Macrobid 100 mg oral capsule'];
  const FORMULARY = [...FREQUENT, 'amLODIPine 5 mg oral tablet', 'atorvastatin 20 mg oral tablet', 'rosuvastatin 10 mg oral tablet', 'amoxicillin 500 mg oral capsule', 'azithromycin 250 mg oral tablet', 'albuterol 90 mcg/inh HFA', 'prednisone 20 mg oral tablet', 'sertraline 50 mg oral tablet', 'omeprazole 20 mg oral capsule', 'gabapentin 300 mg oral capsule', 'losartan 50 mg oral tablet', 'hydrochlorothiazide 25 mg oral tablet', 'levothyroxine 50 mcg oral tablet', 'ondansetron 4 mg oral tablet', 'cephalexin 500 mg oral capsule', 'montelukast 10 mg oral tablet'];
  function rxModal(p, preset) {
    const back = modal('New Prescription', `
      <div id="rxStep1"><div class="field" style="max-width:420px"><input id="rxQ" placeholder="Drug" style="padding:10px 12px;font-size:15px;border:1.5px solid var(--teal-700)"></div>
      <div class="card" style="max-width:600px"><div id="rxList"></div><div class="small" style="text-align:right;padding:6px 12px"><u>Based on my frequent order history</u></div></div></div>
      <div id="rxStep2" class="hidden"></div>`, '', { wide: true });
    const list = (q) => { const items = (q ? FORMULARY.filter((d) => d.toLowerCase().includes(q.toLowerCase())) : FREQUENT).slice(0, 8); $('#rxList').innerHTML = items.map((d) => `<div class="li" style="padding:12px 18px;cursor:pointer" data-drug="${esc(d)}"><span>${esc(d)}</span><span>&rsaquo;</span></div>`).join('') || `<div class="li" style="padding:12px 18px;cursor:pointer" data-drug="${esc(q)}"><span>Free-text: ${esc(q)}</span><span>&rsaquo;</span></div>`; };
    list(''); $('#rxQ').oninput = (e) => list(e.target.value);
    const allergyHit = (d) => p.allergies.find((a) => (a.substance.toLowerCase() === 'penicillin' && /amox|cephalex|penicil/i.test(d)) || (/sulfa/i.test(a.substance) && /sulfameth|bactrim/i.test(d)) || (/ace inhib/i.test(a.substance) && /pril\b/i.test(d)));
    back.addEventListener('click', (e) => {
      const d = e.target.closest('[data-drug]'); if (!d) return;
      const drug = d.dataset.drug; const hit = allergyHit(drug);
      $('#rxStep1').classList.add('hidden');
      $('#rxStep2').classList.remove('hidden');
      $('#rxStep2').innerHTML = `<h3 style="margin-bottom:10px">${esc(drug)}</h3>${hit ? `<div class="ix" style="background:#fdecea;border-color:#f5b7b1;border-left-color:var(--red);margin-bottom:12px"><b class="red">${I.warn} Allergy alert:</b> ${esc(p.firstName)} is allergic to ${esc(hit.substance)} (${esc(hit.reaction)}). Override requires a reason.</div>` : ''}
        <div class="grid3"><div class="field"><label>Dose</label><input id="rxDose" value="1 tab"></div><div class="field"><label>Route</label><select id="rxRoute"><option>Oral</option><option>Inhaled</option><option>Subcut</option><option>Topical</option></select></div><div class="field"><label>Frequency</label><select id="rxFreq"><option>Daily</option><option>BID</option><option>TID</option><option>q8h PRN</option><option>at bedtime</option><option>Weekly</option></select></div>
        <div class="field"><label>Duration / Qty</label><input id="rxQty" value="30 tab"></div><div class="field"><label>Refills</label><input id="rxRef" type="number" value="0" min="0" max="11"></div><div class="field"><label>Pharmacy</label><select id="rxPh"><option>Walgreens #4471 - N Clark St</option><option>CVS #8820 - W Belmont Ave</option><option>Lakeview Outpatient Pharmacy</option><option>Mail order - Express Scripts</option></select></div></div>
        ${hit ? '<div class="field"><label>Override reason</label><input id="rxOv" placeholder="Required"></div>' : ''}
        <div class="modal-f" style="padding:12px 0 0"><button class="btn" id="rxBack">Back</button><button class="btn dark" id="rxSign">Sign</button></div>`;
      $('#rxBack').onclick = () => { $('#rxStep2').classList.add('hidden'); $('#rxStep1').classList.remove('hidden'); };
      $('#rxSign').onclick = async () => {
        if (hit && !$('#rxOv').value.trim()) return toast('Enter an override reason');
        const pharmacy = $('#rxPh').value;
        await api(`/api/patients/${p.id}/prescriptions`, { method: 'POST', body: { name: drug, sig: `${$('#rxDose').value}, ${$('#rxRoute').value}, ${$('#rxFreq').value}, ${$('#rxQty').value}`, refills: $('#rxRef').value, pharmacy, prescriber: S.user.providerId || 'pr-1' } });
        closeModal(); refreshChart(p, `Prescription signed and sent to ${esc(pharmacy)}`, { outcome: 'Prescription sent' });
      };
    });
    if (preset) $(`[data-drug="${CSS.escape(preset)}"]`, back)?.click();
  }
  async function renewRx(p, name) {
    const m = p.medications.find((x) => x.name === name); if (!m) return;
    modal('Renew prescription', `<p><b>${esc(m.name)}</b><br>${esc(m.sig)}</p><div class="grid2"><div class="field"><label>Refills</label><input id="rnRef" type="number" value="3"></div><div class="field"><label>Pharmacy</label><select id="rnPh"><option>Walgreens #4471 - N Clark St</option><option>CVS #8820 - W Belmont Ave</option><option>Mail order - Express Scripts</option></select></div></div>`, '<button class="btn" data-close>Cancel</button><button class="btn dark" id="rnOk">Sign renewal</button>');
    $('#rnOk').onclick = async () => { await api(`/api/patients/${p.id}/prescriptions`, { method: 'POST', body: { name: m.name, sig: m.sig, refills: $('#rnRef').value, renew: true, pharmacy: $('#rnPh').value } }); closeModal(); refreshChart(p, 'Renewal signed', { outcome: 'Refill processed' }); };
  }

  // scheduling (shared by chart, reschedule and registration wizard)
  const APPT_TYPES = ['Follow-up', 'New Patient', 'Wellness', 'Telehealth', 'Lab', 'Procedure', 'Surgery', 'Prenatal', 'Post-op', 'Research'];
  function schedulerHtml(p, existing) {
    const specs = [...new Set(S.providers.map((x) => x.specialty))];
    const spec = existing?.specialty || provider(p?.pcpId || 'pr-1').specialty || specs[0];
    return `<div class="grid2">
      <div class="field"><label>Type of appointment</label><select id="scType">${APPT_TYPES.map((t) => `<option ${t === (existing?.type || 'Follow-up') ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="field"><label>Specialty</label><select id="scSpec">${specs.map((s) => `<option ${s === spec ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
      <div class="field"><label>Reason for appointment</label><textarea id="scReason" rows="3">${esc(existing?.reason || '')}</textarea><span class="req">Required</span></div>
      <div><div class="field"><label>Provider</label><select id="scProv"></select></div><div class="field"><label>Location</label><input id="scLoc" readonly></div></div>
      <div class="field"><label>Start Date</label><input id="scFrom" type="date" value="${S.today}"></div>
      <div class="field"><label>Visit mode</label><select id="scMode"><option>In person</option><option>Video</option><option>Phone</option></select></div>
    </div><div id="scSlots"></div>`;
  }
  function bindScheduler(root, onPick) {
    let sel = null;
    const fillProv = () => { const s = $('#scSpec', root).value; const opts = S.providers.filter((x) => x.specialty === s); $('#scProv', root).innerHTML = opts.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join(''); $('#scLoc', root).value = opts[0]?.location || ''; loadSlots(); };
    const loadSlots = async () => {
      const pid = $('#scProv', root).value; $('#scLoc', root).value = provider(pid).location || '';
      $('#scSlots', root).innerHTML = '<div class="muted small">Finding open slots...</div>';
      const slots = await api(`/api/slots?providerId=${pid}&from=${$('#scFrom', root).value}&days=10&limit=12`);
      sel = null; onPick(null);
      const byDay = {}; slots.forEach((s) => (byDay[s.start.slice(0, 10)] = byDay[s.start.slice(0, 10)] || []).push(s));
      $('#scSlots', root).innerHTML = Object.keys(byDay).length ? Object.entries(byDay).map(([d, ss]) => `<div class="small" style="margin:10px 0 4px;font-weight:600">${fmtLong(d)}</div>${ss.map((s) => `<div class="slot" data-slot="${s.start}">${I.cal}<div><b>${new Date(s.start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${fmtT(s.start)}</b> (30 Minutes)<div class="small muted">${esc(s.providerName)}, ${esc(s.location)}</div></div></div>`).join('')}`).join('') : '<div class="muted">No open slots in the next 10 days.</div>';
    };
    $('#scSpec', root).onchange = fillProv; $('#scProv', root).onchange = loadSlots; $('#scFrom', root).onchange = loadSlots;
    root.addEventListener('click', (e) => { const s = e.target.closest('[data-slot]'); if (!s) return; $$('.slot', root).forEach((x) => x.classList.remove('sel')); s.classList.add('sel'); sel = s.dataset.slot; onPick(sel); });
    fillProv();
    return () => ({ start: sel, providerId: $('#scProv', root).value, type: $('#scType', root).value, reason: $('#scReason', root).value.trim(), visitMode: $('#scMode', root).value });
  }
  function scheduleModal(p, existing) {
    const back = modal(existing ? `Reschedule appointment for ${esc(p.preferredName)}` : `Schedule an appointment for ${esc(p.preferredName)}`, `<div class="wiz-pt">${avatar(p)}<div><b>${esc(p.lastName)}, ${esc(p.firstName)}</b><br>Date of Birth: ${fmtDnum(p.dob)}<br>MRN: ${esc(p.mrn)}</div></div>${schedulerHtml(p, existing)}`, `<button class="btn" data-close>Cancel</button><button class="btn dark" id="scOk" disabled>${existing ? 'Reschedule' : 'Schedule Appointment'}</button>`, { wide: true });
    const get = bindScheduler(back, (s) => { $('#scOk').disabled = !s; });
    $('#scOk').onclick = async () => {
      const v = get(); if (!v.reason) v.reason = existing?.reason || v.type;
      if (existing) await api(`/api/appointments/${existing.id}`, { method: 'PATCH', body: { start: v.start, providerId: v.providerId, type: v.type, reason: v.reason, visitMode: v.visitMode, status: 'Confirmed' } });
      else await api(`/api/patients/${p.id}/appointments`, { method: 'POST', body: { ...v, bookedBy: S.user.name, conversationId: S.interaction?.conversationId } });
      closeModal(); refreshChart(p, `${existing ? 'Rescheduled' : 'Scheduled'}: ${fmtDT(v.start)} with ${provider(v.providerId).name}`, { outcome: existing ? 'Appointment rescheduled' : 'Appointment scheduled' });
    };
  }
  function payModal(p) {
    modal('Take payment', `<p>Balance <b>${money(p.account.balance)}</b> &middot; Guarantor ${esc(p.account.guarantor)}</p>
      <div class="grid2"><div class="field"><label>Amount</label><input id="pyAmt" type="number" step="0.01" value="${p.account.balance.toFixed(2)}"></div><div class="field"><label>Method</label><select id="pyM"><option>Card on file (Visa ...4421)</option><option>New card</option><option>ACH / bank account</option><option>Genesys secure IVR payment</option></select></div></div>
      <p class="small muted">Demo only: no card data is collected. In production, card capture would be handed to a PCI-compliant IVR (for example Genesys Secure Pause or a secure flow) rather than typed here.</p>`, '<button class="btn" data-close>Cancel</button><button class="btn primary" id="pyOk">Post payment</button>');
    $('#pyOk').onclick = async () => { const r = await api(`/api/patients/${p.id}/payments`, { method: 'POST', body: { amount: $('#pyAmt').value, method: $('#pyM').value, takenBy: S.user.name } }); closeModal(); refreshChart(p, `Payment posted. Confirmation ${r.payment.confirmation}`, { outcome: 'Payment taken' }); };
  }
  const OUTCOMES = ['Appointment scheduled', 'Appointment rescheduled', 'Appointment cancelled', 'Billing question resolved', 'Payment taken', 'Refill request routed', 'Clinical question - routed to nurse', 'Demographics updated', 'Care plan review', 'Post-discharge check-in', 'Information provided', 'Left voicemail', 'Other'];
  function activityModal(p, defaults = {}) {
    modal('Log contact', `<div class="grid2">
      <div class="field"><label>Method</label><select id="acM">${['Phone call', 'Video visit', 'Web chat', 'SMS', 'Email', 'Portal message', 'In person'].map((m) => `<option ${m === (defaults.method || 'Phone call') ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
      <div class="field"><label>Direction</label><select id="acD"><option ${defaults.direction !== 'Outbound' ? 'selected' : ''}>Inbound</option><option ${defaults.direction === 'Outbound' ? 'selected' : ''}>Outbound</option></select></div>
      <div class="field"><label>Outcome</label><select id="acO">${OUTCOMES.map((o) => `<option ${o === defaults.outcome ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
      <div class="field"><label>Duration (min)</label><input id="acDur" type="number" value="${defaults.durationMin ?? 5}"></div>
      <div class="field"><label>Contact</label><input id="acC" value="${esc(`${p.lastName.toUpperCase()}, ${p.firstName.toUpperCase()} (Patient)`)}"></div>
      <div class="field"><label>Genesys conversation ID</label><input id="acCid" value="${esc(defaults.conversationId || '')}"></div></div>
      <div class="field"><label>Notes</label><textarea id="acN" rows="3">${esc(defaults.note || '')}</textarea></div>`, `<button class="btn" data-close>Cancel</button><button class="btn primary" id="acOk">${defaults.wrap ? 'Save and end interaction' : 'Save'}</button>`);
    $('#acOk').onclick = async () => {
      await api(`/api/patients/${p.id}/activities`, { method: 'POST', body: { method: $('#acM').value, direction: $('#acD').value, outcome: $('#acO').value, durationMin: $('#acDur').value, contact: $('#acC').value, note: $('#acN').value, conversationId: $('#acCid').value, createdBy: shortName(S.user.name), queue: defaults.queue || '', source: defaults.wrap ? 'Genesys Cloud' : 'Manual' } });
      if (defaults.wrap) S.interaction = null;
      closeModal(); shell(); refreshChart(p, defaults.wrap ? 'Interaction logged and wrapped up' : 'Contact logged');
    };
  }
  const shortName = (n) => { const [f, ...rest] = n.split(' '); const l = rest.join(' '); return l ? `${l.replace(/,.*/, '')}${n.includes(',') ? ' ' + n.split(', ')[1] : ''}, ${f}` : n; };
  function noteModal(p) {
    modal('New note', `<div class="grid2"><div class="field"><label>Type</label><select id="nT"><option>Telephone Encounter</option><option>Care Management</option><option>Progress Note</option><option>Case Summary Note</option><option>Care Plan Note</option></select></div><div class="field"><label>Title</label><input id="nTi" value="Telephone Encounter"></div></div><div class="field"><label>Note</label><textarea id="nX" rows="6"></textarea></div>`, '<button class="btn" data-close>Cancel</button><button class="btn dark" id="nOk">Sign</button>');
    $('#nT').onchange = (e) => { $('#nTi').value = e.target.value; };
    $('#nOk').onclick = async () => { await api(`/api/patients/${p.id}/documents`, { method: 'POST', body: { type: $('#nT').value, title: $('#nTi').value, text: $('#nX').value, author: shortName(S.user.name) } }); closeModal(); refreshChart(p, 'Note signed'); };
  }
  function editDemographics(p) {
    modal('Update demographics', `${p.phones.map((ph, i) => `<div class="grid2"><div class="field"><label>Phone type</label><input id="phT${i}" value="${esc(ph.type)}"></div><div class="field"><label>Number</label><input id="phN${i}" value="${esc(ph.number)}"></div></div>`).join('')}
      <div class="grid2"><div class="field"><label>Add phone type</label><input id="phTn" placeholder="e.g. Work"></div><div class="field"><label>Number</label><input id="phNn"></div></div>
      <div class="field"><label>Email</label><input id="dEm" value="${esc(p.email)}"></div>
      <div class="grid2"><div class="field"><label>Street</label><input id="dL" value="${esc(p.address?.line)}"></div><div class="field"><label>City</label><input id="dC" value="${esc(p.address?.city)}"></div><div class="field"><label>State</label><input id="dS" value="${esc(p.address?.state)}"></div><div class="field"><label>ZIP</label><input id="dZ" value="${esc(p.address?.zip)}"></div></div>
      <div class="field"><label>Preferred language</label><input id="dLang" value="${esc(p.language)}"></div>`, '<button class="btn" data-close>Cancel</button><button class="btn primary" id="dOk">Save</button>');
    $('#dOk').onclick = async () => {
      const phones = p.phones.map((ph, i) => ({ ...ph, type: $('#phT' + i).value, number: $('#phN' + i).value })).filter((x) => x.number);
      if ($('#phNn').value) phones.push({ type: $('#phTn').value || 'Other', number: $('#phNn').value });
      await api(`/api/patients/${p.id}`, { method: 'PATCH', body: { phones, email: $('#dEm').value, language: $('#dLang').value, address: { line: $('#dL').value, city: $('#dC').value, state: $('#dS').value, zip: $('#dZ').value } } });
      closeModal(); refreshChart(p, 'Demographics updated', { outcome: 'Demographics updated' });
    };
  }
  function verifyIdentity(p) {
    const v = $('#vDob').value.trim(); if (!v) return;
    const d = new Date(v); const iso = isNaN(d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (iso === p.dob || digits(v) === digits(fmtDnum(p.dob))) { S.interaction.verified = true; toast('Identity verified'); renderPage(); }
    else toast('<b class="red">DOB does not match</b><br>Do not disclose PHI until identity is verified.', { ms: 5000 });
  }
  function wrapUp(p) {
    const ix = S.interaction;
    activityModal(p, { wrap: true, direction: ix.direction, method: ix.mediaType === 'voice' ? 'Phone call' : ix.mediaType === 'chat' ? 'Web chat' : ix.mediaType === 'sms' ? 'SMS' : 'Phone call', outcome: (ix.outcomes || []).slice(-1)[0] || 'Information provided', durationMin: Math.max(1, Math.round((Date.now() - ix.startedAt) / 60000)), conversationId: ix.conversationId, queue: ix.queue, note: `${ix.verified ? 'Identity verified (name + DOB). ' : ''}${(ix.outcomes || []).join('; ')}` });
  }

  // ---------------------------------------------------------------- registration wizard (patient access)
  function pageRegister(el, r) {
    const d = { phone: r.q.get('phone') || S.interaction?.phone || '', firstName: '', lastName: '', dob: '', sex: 'Female', email: '', addressLine: '', city: '', state: 'IL', zip: '', language: 'English', payer: 'BlueCross BlueShield of Illinois', plan: '', memberId: '', group: '', guarantor: 'Self' };
    let step = 1; let created = null; let getSched = null; let slotPicked = null;
    const steps = ['Patient Information', 'Financial Responsibility', 'Schedule Appointment'];
    const draw = () => {
      el.innerHTML = `<div class="page"><div class="wizard">
        <div class="wmain" id="wm">${step === 1 ? `<h2 style="font-size:22px;margin-bottom:16px">Patient information</h2>
            <div class="grid2"><div class="field"><label>Legal first name</label><input id="r_firstName" value="${esc(d.firstName)}"></div><div class="field"><label>Legal last name</label><input id="r_lastName" value="${esc(d.lastName)}"></div>
            <div class="field"><label>Date of birth</label><input id="r_dob" type="date" value="${esc(d.dob)}"></div><div class="field"><label>Sex</label><select id="r_sex">${['Female', 'Male', 'Unknown'].map((s) => `<option ${s === d.sex ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
            <div class="field"><label>Mobile phone</label><input id="r_phone" value="${esc(fmtPhone(d.phone))}"></div><div class="field"><label>Email</label><input id="r_email" value="${esc(d.email)}"></div>
            <div class="field"><label>Street address</label><input id="r_addressLine" value="${esc(d.addressLine)}"></div><div class="field"><label>City</label><input id="r_city" value="${esc(d.city)}"></div>
            <div class="field"><label>State</label><input id="r_state" value="${esc(d.state)}"></div><div class="field"><label>ZIP</label><input id="r_zip" value="${esc(d.zip)}"></div>
            <div class="field"><label>Preferred language</label><select id="r_language">${['English', 'Spanish', 'Polish', 'Arabic', 'Mandarin', 'Tagalog'].map((s) => `<option ${s === d.language ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div><div id="dup"></div>`
          : step === 2 ? `<div class="wiz-pt"><div class="avatar" style="background:${colorFor(d.firstName)}">${initials(d.firstName, d.lastName)}</div><div><b>${esc(d.lastName)}, ${esc(d.firstName)}</b><br>Date of Birth: ${fmtDnum(d.dob)}</div></div><h2 style="font-size:22px;margin-bottom:16px">Financial responsibility</h2>
            <div class="grid2"><div class="field"><label>Primary insurance</label><select id="r_payer">${['BlueCross BlueShield of Illinois', 'Aetna', 'Cigna', 'UnitedHealthcare', 'Humana', 'Medicare', 'Illinois Medicaid', 'Self-pay'].map((s) => `<option ${s === d.payer ? 'selected' : ''}>${s}</option>`).join('')}</select></div><div class="field"><label>Plan</label><input id="r_plan" value="${esc(d.plan)}"></div>
            <div class="field"><label>Member ID</label><input id="r_memberId" value="${esc(d.memberId)}"></div><div class="field"><label>Group number</label><input id="r_group" value="${esc(d.group)}"></div>
            <div class="field"><label>Guarantor</label><select id="r_guarantor"><option>Self</option><option>Parent / guardian</option><option>Spouse</option></select></div></div>
            <button class="btn" id="eligBtn">Check eligibility</button> <span id="eligRes" class="small"></span>`
          : `<div class="wiz-pt"><div class="avatar" style="background:${colorFor(created.id)}">${initials(created.firstName, created.lastName)}</div><div><b>${esc(created.lastName)}, ${esc(created.firstName)}</b><br>Date of Birth: ${fmtDnum(created.dob)}<br>MRN: ${esc(created.mrn)}</div></div><h2 style="font-size:22px;margin-bottom:16px">Schedule an appointment for ${esc(created.firstName)}</h2>${schedulerHtml(created, { type: 'New Patient', specialty: 'Internal Medicine' })}`}
          <div class="wfoot"><button class="btn" id="wCancel">Cancel</button>${step > 1 && step < 3 ? '<button class="btn" id="wPrev">Previous</button>' : ''}${step === 3 ? '<button class="btn" id="wSkip">Skip scheduling</button>' : ''}<button class="btn dark" id="wNext" ${step === 3 ? 'disabled' : ''}>${step === 1 ? 'Next' : step === 2 ? 'Register patient' : 'Schedule Appointment'}</button></div>
        </div>
        <div class="wside"><div class="count"><b>${step}</b> | ${steps.length}</div><div class="steps">${steps.map((s, i) => `<div class="${i + 1 === step ? 'on' : i + 1 < step ? 'done' : ''}"><span>${s}</span><span>${i + 1 < step ? '&#10003;' : ''}</span></div>`).join('')}</div></div>
      </div></div>`;
      $('#wCancel').onclick = () => go('#/search');
      $('#wPrev') && ($('#wPrev').onclick = () => { collect(); step--; draw(); });
      $('#wSkip') && ($('#wSkip').onclick = () => openPatient(created.id));
      if (step === 1) { const dupCheck = async () => { collect(); if (!d.lastName || !d.dob) return; const m = await api(`/api/patients?${new URLSearchParams({ lastName: d.lastName, dob: d.dob })}`); $('#dup').innerHTML = m.length ? `<div class="ix" style="margin:4px 0 0"><b class="orange">${I.warn} Possible duplicate:</b> ${m.map((x) => `<a href="#" data-open="${x.id}">${esc(x.lastName)}, ${esc(x.firstName)} (MRN ${esc(x.mrn)})</a>`).join(', ')}</div>` : ''; }; $('#r_lastName').onchange = dupCheck; $('#r_dob').onchange = dupCheck; }
      if (step === 2) $('#eligBtn').onclick = () => { $('#eligRes').textContent = 'Checking...'; setTimeout(() => { collect(); $('#eligRes').innerHTML = d.payer === 'Self-pay' ? '<span class="orange">Self-pay: offer financial counseling</span>' : `<span class="green">&#10003; Active coverage with ${esc(d.payer)}</span>`; }, 900); };
      if (step === 3) getSched = bindScheduler($('#wm'), (s) => { slotPicked = s; $('#wNext').disabled = !s; });
      $('#wNext').onclick = async () => {
        collect();
        if (step === 1) { if (!d.firstName || !d.lastName || !d.dob) return toast('First name, last name and date of birth are required'); step = 2; return draw(); }
        if (step === 2) { created = await api('/api/patients', { method: 'POST', body: { ...d, guarantor: d.guarantor === 'Self' ? `${d.firstName} ${d.lastName}` : d.guarantor } }); S.charts[created.id] = created; if (S.interaction && !S.interaction.patientId) { S.interaction.patientId = created.id; (S.interaction.outcomes = []).push('New patient registered'); } toast(`Registered ${esc(created.firstName)} ${esc(created.lastName)}, MRN ${created.mrn}`); step = 3; return draw(); }
        if (step === 3 && slotPicked) { const v = getSched(); await api(`/api/patients/${created.id}/appointments`, { method: 'POST', body: { ...v, reason: v.reason || 'New patient visit', bookedBy: S.user.name, conversationId: S.interaction?.conversationId } }); if (S.interaction?.patientId === created.id) S.interaction.outcomes.push('Appointment scheduled'); toast(`Appointment scheduled ${fmtDT(v.start)}`); delete S.charts[created.id]; openPatient(created.id, 'visits'); }
      };
    };
    const collect = () => $$('[id^="r_"]', el).forEach((i) => { d[i.id.slice(2)] = i.value.trim(); });
    draw();
    el.addEventListener('click', (e) => { const o = e.target.closest('[data-open]'); if (o) { e.preventDefault(); openPatient(o.dataset.open); } });
  }

  // ---------------------------------------------------------------- message center
  async function pageMessages(el, r) {
    const all = await api('/api/messages');
    const mine = all.filter((m) => m.to === S.user.id);
    const msgs = mine.length ? mine : all;
    const sel = msgs.find((m) => m.id === r.q.get('id')) || msgs[0];
    el.innerHTML = `<div class="page"><div class="page-head"><h2>Message Center</h2><span class="muted small">${mine.length ? 'My inbox' : 'All pools (no messages addressed to you)'}</span></div>
      <div class="mc"><div class="card" style="overflow:hidden">${msgs.map((m) => `<div class="msg-row ${m.status === 'Unread' ? 'unread' : ''} ${m === sel ? 'sel' : ''}" data-go="#/messages?id=${m.id}"><div style="display:flex;justify-content:space-between"><span class="small muted">${esc(m.type)}</span><span class="small muted">${fmtDT(m.date)}</span></div><div class="subj">${esc(m.subject)}</div><div class="small">${esc(m.patientName)} ${m.priority === 'High' ? '<span class="tag red">High</span>' : ''}</div></div>`).join('')}</div>
      <div class="card card-b" style="padding:18px">${sel ? `<div class="small muted">${esc(sel.type)} &middot; From ${esc(sel.from)} &middot; ${fmtDT(sel.date)}</div><h3 style="margin:8px 0">${esc(sel.subject)}</h3><p>${esc(sel.body)}</p><p>Patient: <a href="#" data-open="${sel.patientId}">${esc(sel.patientName)}</a></p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${sel.type === 'Rx Renewal' ? '<button class="btn dark" data-msgact="approve">Approve renewal</button>' : ''}<button class="btn" data-open="${sel.patientId}">Open chart</button><button class="btn" data-msgact="done">Mark complete</button></div>` : '<div class="empty">No messages</div>'}</div></div></div>`;
    if (sel && sel.status === 'Unread') { api(`/api/messages/${sel.id}`, { method: 'PATCH', body: { status: 'Read' } }).then(updateUnread); }
    el.onclick = async (e) => {
      const o = e.target.closest('[data-open]'); if (o) { e.preventDefault(); return openPatient(o.dataset.open); }
      const a = e.target.closest('[data-msgact]'); if (!a) return;
      if (a.dataset.msgact === 'approve') { const p = await loadChart(sel.patientId); const m = p.medications.find((x) => sel.subject.toLowerCase().includes(x.name.split(' ')[0].toLowerCase())); if (m) await api(`/api/patients/${p.id}/prescriptions`, { method: 'POST', body: { name: m.name, sig: m.sig, refills: 3, renew: true } }); delete S.charts[p.id]; toast('Renewal approved and sent to pharmacy'); }
      await api(`/api/messages/${sel.id}`, { method: 'PATCH', body: { status: 'Complete' } }); renderPage();
    };
  }
  async function updateUnread() { try { const m = await api('/api/messages'); S.unread = m.filter((x) => x.to === S.user?.id && x.status === 'Unread').length; const b = $$('.bottombar button').find((x) => x.dataset.go === '#/messages'); if (b) b.innerHTML = `${I.inbox}Message Center${S.unread ? ` <span class="badge">${S.unread}</span>` : ''}`; } catch { /* offline */ } }

  // ---------------------------------------------------------------- care management worklist
  async function pageWorklist(el) {
    const all = await api('/api/patients?all=1');
    const charts = await Promise.all(all.map((p) => loadChart(p.id)));
    const rows = charts.filter((p) => p.programs.length || p.riskIndicators.some((r) => r.level === 'high')).sort((a, b) => b.riskIndicators.filter((r) => r.level === 'high').length - a.riskIndicators.filter((r) => r.level === 'high').length);
    el.innerHTML = `<div class="page"><div class="page-head"><h2>Care Management Worklist (${rows.length})</h2><span class="small muted">Outbound calls use Genesys Cloud click-to-dial in a real deployment</span></div>
      <div class="card"><table class="tbl"><tr><th>Patient</th><th>Programs</th><th>Risk</th><th>Last contact</th><th>Next appointment</th><th></th></tr>
      ${rows.map((p) => { const last = [...p.activities].sort((a, b) => b.datetime.localeCompare(a.datetime))[0]; const next = p.appointments.filter((a) => a.start.slice(0, 10) >= S.today && !['Cancelled', 'Completed'].includes(a.status)).sort((a, b) => a.start.localeCompare(b.start))[0]; const ph = (p.phones.find((x) => x.primary) || p.phones[0]); return `<tr><td><a href="#" data-open="${p.id}"><b>${esc(p.lastName.toUpperCase())}, ${esc(p.firstName)}</b></a><div class="small muted">${p.age}y ${p.sex[0]} &middot; MRN ${esc(p.mrn)}</div></td><td class="small">${p.programs.map((x) => esc(x.name)).join('<br>') || '--'}</td><td>${p.riskIndicators.map((x) => `<div class="risk ${x.level} small">${I.warn} ${esc(x.label)}</div>`).join('')}</td><td class="small">${last ? `${fmtD(last.datetime)}<br><span class="muted">${esc(last.outcome)}</span>` : '<span class="muted">None</span>'}</td><td class="small">${next ? fmtDT(next.start) : '<span class="muted">None</span>'}</td><td><button class="btn sm genesys" data-dial="${p.id}" data-num="${esc(ph?.number || '')}">${I.phone} Call</button></td></tr>`; }).join('')}</table></div></div>`;
    el.onclick = (e) => {
      const o = e.target.closest('[data-open]'); if (o) { e.preventDefault(); return openPatient(o.dataset.open); }
      const d = e.target.closest('[data-dial]'); if (d) { startInteraction({ patientId: d.dataset.dial, phone: d.dataset.num, direction: 'Outbound', queue: 'Care Management', mediaType: 'voice', verified: false, matchedOn: 'worklist' }); toast(`Dialing ${esc(d.dataset.num)} via Genesys Cloud (simulated)`); openPatient(d.dataset.dial); }
    };
  }

  // ---------------------------------------------------------------- Genesys integration page
  async function pageGenesys(el) {
    const base = S.config.baseUrl || location.origin;
    const recent = await api('/api/screenpop/recent').catch(() => []);
    const samples = [['(312) 555-0142', 'Maria Gonzalez - diabetes, Spanish, balance due'], ['(312) 555-0188', 'James Whitfield - recent discharge'], ['(312) 555-0131', 'Kowalski household - 2 matches'], ['(847) 555-0163', 'Robert Chen - surgery question'], ['(312) 555-0199', 'Thomas Reed - past-due balance'], ['(708) 555-0155', 'Caregiver for Samuel Brooks'], ['(630) 555-0999', 'Unknown caller - new patient']];
    el.innerHTML = `<div class="page">
      <div class="page-head"><h2>Genesys Cloud integration</h2><span><span class="chip" style="color:var(--ink);border-color:#bbb"><span class="dot ${S.sseOn ? 'on' : ''}"></span>${S.sseOn ? 'Listening for screen pops' : 'Not connected'}</span></span></div>
      <div class="two" style="margin-top:0">
        <div class="card"><div class="card-h"><h3>Simulate an interaction</h3></div><div class="card-b">
          <div class="field"><label>Caller (ANI)</label><select id="gPhone">${samples.map(([n, l]) => `<option value="${n}">${n} - ${esc(l)}</option>`).join('')}</select></div>
          <div class="grid2"><div class="field"><label>Queue</label><input id="gQueue" value="Patient Access"></div><div class="field"><label>Media</label><select id="gMedia"><option value="voice">Voice</option><option value="chat">Web chat</option><option value="sms">SMS</option></select></div>
          <div class="field"><label>Intent (from bot/IVR)</label><select id="gIntent"><option value="">(none)</option><option>Schedule appointment</option><option>Billing question</option><option>Prescription refill</option><option>Test results</option></select></div><div class="field"><label>Target agent</label><input id="gAgent" value="${esc(S.settings.agentEmail || S.user.email)}"></div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn genesys" id="gPush">${I.phone} Push screen pop (API)</button><button class="btn" id="gUrl">Open pop URL</button></div>
          <p class="small muted">Push calls <code>POST /api/screenpop</code>, which is what a Genesys Script, Architect data action or Process Automation trigger would do. Open pop URL navigates like a Genesys Script web page or Interaction Widget would.</p>
        </div></div>
        <div class="card"><div class="card-h"><h3>This agent</h3></div><div class="card-b">
          <div class="kv" style="display:flex;justify-content:space-between"><span>Agent email</span><b>${esc(S.settings.agentEmail || S.user.email)}</b></div>
          <div class="kv" style="display:flex;justify-content:space-between"><span>Auto-open chart</span><b>${S.settings.autoPop ? 'On' : 'Off'}</b></div>
          <div class="kv" style="display:flex;justify-content:space-between"><span>Server-side Genesys lookup</span><b>${S.config.genesysLookup ? 'Configured' : 'Not configured'}</b></div>
          <p class="small"><a href="#" data-usermenu-open>Change settings</a> &middot; <a href="/api-docs.html" target="_blank">API reference</a></p>
          <h4 style="margin:12px 0 6px">URL templates</h4>
          <div class="small" style="font-family:ui-monospace,Menlo,monospace;background:#f6f5f3;padding:10px;border-radius:4px;word-break:break-all">
            <b>Script web page</b><br>${esc(base)}/pop?phone={{Scripter.Raw Customer Number}}&amp;conversationId={{Scripter.Interaction ID}}&amp;queue={{Scripter.Queue Name}}&amp;agent={{Scripter.Agent Email}}&amp;embed=1<br><br>
            <b>Interaction Widget</b><br>${esc(base)}/pop?conversationId={{gcConversationId}}&amp;embed=1<br><br>
            <b>By MRN (collected in IVR/bot, passed as participant data)</b><br>${esc(base)}/pop?mrn={{MRN}}&amp;conversationId={{Scripter.Interaction ID}}</div>
        </div></div>
      </div>
      <h3 class="section-title">Recent screen pops (${recent.length})</h3>
      <div class="card"><table class="tbl"><tr><th>Received</th><th>Phone</th><th>Agent</th><th>Queue</th><th>Matches</th><th>Conversation</th></tr>${recent.map((x) => `<tr><td class="nowrap">${fmtDT(x.receivedAt)}</td><td>${esc(x.phone)}</td><td>${esc(x.agent)}</td><td>${esc(x.queue)}</td><td>${x.patientIds.length}</td><td class="small">${esc(x.conversationId)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">None yet</td></tr>'}</table></div>
    </div>`;
    const conv = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    $('#gPush').onclick = async () => { const r = await fetch('/api/screenpop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: $('#gPhone').value, agent: $('#gAgent').value, queue: $('#gQueue').value, mediaType: $('#gMedia').value, intent: $('#gIntent').value, conversationId: conv() }) }).then((x) => x.json()); if (r.error) toast(esc(r.error)); else if (!r.deliveredTo) toast('Screen pop sent, but no open EHR is listening for that agent'); };
    $('#gUrl').onclick = () => { location.href = `/pop?${new URLSearchParams({ phone: $('#gPhone').value, conversationId: conv(), queue: $('#gQueue').value, mediaType: $('#gMedia').value, intent: $('#gIntent').value })}`; };
    $('[data-usermenu-open]', el).onclick = (e) => { e.preventDefault(); userMenu(); };
  }

  // ---------------------------------------------------------------- screen pop handling
  function startInteraction(ix) { S.interaction = { startedAt: Date.now(), outcomes: [], ...ix }; }
  async function handlePop(params, source = 'url') {
    const g = (k) => clean(params.get ? params.get(k) : params[k]);
    let phone = (g('phone') || g('ani') || g('callerId') || g('from') || '').replace(/^tel:|^sip:/i, '').replace(/@.*/, '');
    const conversationId = g('conversationId') || g('gcConversationId') || g('interactionId');
    let customerName = g('customerName');
    let lookedUpQueue = '';
    if (!phone && !g('mrn') && !g('patientId') && !g('fin') && conversationId && S.config.genesysLookup) {
      try { const c = await api(`/api/genesys/conversations/${encodeURIComponent(conversationId)}`); phone = c.phone; customerName = customerName || c.customerName; lookedUpQueue = c.queue; } catch (e) { toast(`Genesys lookup failed: ${esc(e.message)}`); }
    }
    const ix = { phone: fmtPhone(phone), conversationId, direction: g('direction') || 'Inbound', queue: g('queue') || g('queueName') || lookedUpQueue, mediaType: g('mediaType') || 'voice', intent: g('intent'), customerName, verified: false, source };
    let matches = [];
    let matchedOn = '';
    if (g('patientId')) { matches = [await api(`/api/patients/${g('patientId')}`).catch(() => null)].filter(Boolean); matchedOn = phone ? `phone ${fmtPhone(phone)}` : 'patient ID'; }
    else if (g('mrn')) { matches = await api(`/api/patients?mrn=${encodeURIComponent(g('mrn'))}`); matchedOn = `MRN ${g('mrn')}`; }
    else if (g('fin')) { matches = await api(`/api/patients?fin=${encodeURIComponent(g('fin'))}`); matchedOn = `FIN ${g('fin')}`; }
    else if (phone) { matches = await api(`/api/patients?phone=${encodeURIComponent(phone)}${g('dob') ? `&dob=${g('dob')}` : ''}`); matchedOn = `phone ${fmtPhone(phone)}`; }
    else if (g('lastName') || g('dob')) { matches = await api(`/api/patients?${new URLSearchParams({ lastName: g('lastName'), dob: g('dob') })}`); matchedOn = 'name/DOB'; }
    ix.matchedOn = matchedOn;
    const tab = g('tab') || (/bill|pay|balance/i.test(ix.intent) ? 'account' : /appoint|schedul/i.test(ix.intent) ? 'visits' : /refill|prescri|medic/i.test(ix.intent) ? 'medications' : /result|lab/i.test(ix.intent) ? 'results' : 'summary');
    if (phone || conversationId || matches.length) startInteraction(ix);
    if (matches.length === 1) { S.interaction && (S.interaction.patientId = matches[0].id); return openPatient(matches[0].id, tab); }
    S.popResult = { matches, ix, tab };
    go('#/pop-results');
  }
  function pagePopResults(el) {
    const r = S.popResult; if (!r) return go('#/search');
    const ix = r.ix;
    el.innerHTML = `<div class="page" style="max-width:900px">
      <div class="ix" style="margin-bottom:16px"><span class="ttl">${I.phone} Genesys Cloud ${esc(ix.direction.toLowerCase())} ${ix.mediaType === 'voice' ? 'call' : esc(ix.mediaType)}</span><span>${esc(ix.phone || 'No caller ID')}</span>${ix.queue ? `<span class="muted">Queue: ${esc(ix.queue)}</span>` : ''}${ix.customerName ? `<span>${esc(ix.customerName)}</span>` : ''}</div>
      ${r.matches.length > 1 ? `<h2 style="margin-bottom:6px">${r.matches.length} patients match ${esc(ix.matchedOn)}</h2><p class="muted" style="margin-top:0">Ask the caller which patient they are calling about, then verify date of birth.</p>
        ${r.matches.map((p) => `<div class="match-card" data-pick="${p.id}">${avatar(p)}<div style="flex:1"><b>${esc(p.lastName.toUpperCase())}, ${esc(p.firstName)}</b> <span class="muted">(${esc(p.preferredName)})</span><div class="small">${esc(p.sex)} &middot; ${p.age}y &middot; DOB ${fmtDnum(p.dob)} &middot; MRN ${esc(p.mrn)}</div>${p.flags?.length ? `<div class="small orange">${esc(p.flags[0])}</div>` : ''}</div><button class="btn primary">Select</button></div>`).join('')}`
      : `<h2 style="margin-bottom:6px">No patient found for ${esc(ix.matchedOn || 'this interaction')}</h2><p class="muted" style="margin-top:0">Search by name and date of birth, or register the caller as a new patient.</p>
        <div style="display:flex;gap:8px"><button class="btn primary" data-go="#/register${ix.phone ? `?phone=${encodeURIComponent(ix.phone)}` : ''}">${I.reg} Register new patient</button><button class="btn" data-go="#/search">${I.search} Search patients</button></div>`}
    </div>`;
    el.onclick = (e) => { const p = e.target.closest('[data-pick]'); if (p) { S.interaction && (S.interaction.patientId = p.dataset.pick); return openPatient(p.dataset.pick, r.tab); } };
  }

  // live push via Server-Sent Events
  function connectSSE() {
    if (S.sse) S.sse.close();
    if (!S.user || !window.EventSource) return;
    const agent = (S.settings.agentEmail || S.user.email || '').toLowerCase();
    S.sse = new EventSource(`/api/screenpop/events?${new URLSearchParams({ agent, userId: S.user.id })}`);
    S.sse.addEventListener('hello', () => { S.sseOn = true; updateChip(); });
    S.sse.onerror = () => { S.sseOn = false; updateChip(); };
    S.sse.addEventListener('screenpop', async (ev) => {
      const pop = JSON.parse(ev.data);
      const params = { phone: pop.phone, conversationId: pop.conversationId, direction: pop.direction, queue: pop.queue, mediaType: pop.mediaType, intent: pop.intent, customerName: pop.customerName, tab: pop.tab, ...(pop.patientIds.length === 1 ? { patientId: pop.patientIds[0] } : {}) };
      const names = await Promise.all(pop.patientIds.slice(0, 3).map((id) => loadChart(id).then((c) => `${c.firstName} ${c.lastName} (MRN ${c.mrn})`).catch(() => id)));
      if (S.settings.autoPop) { toast(`<h4>${I.phone} Screen pop: ${esc(pop.phone || 'interaction')}</h4><div class="small">${names.length ? esc(names.join(', ')) : 'No matching patient'}${pop.queue ? ` &middot; ${esc(pop.queue)}` : ''}</div>`, { cls: 'genesys', ms: 5000 }); handlePop(params, 'push'); }
      else toast(`<h4>${I.phone} Incoming ${esc(pop.direction.toLowerCase())} ${pop.mediaType === 'voice' ? 'call' : esc(pop.mediaType)}</h4><div>${esc(pop.phone)}</div><div class="small">${names.length ? esc(names.join(', ')) : 'No matching patient'}${pop.queue ? ` &middot; Queue ${esc(pop.queue)}` : ''}</div><div class="actions"><button class="btn sm genesys" data-act="open">Open</button><button class="btn sm" data-act="dismiss">Dismiss</button></div>`, { cls: 'genesys', sticky: true, on: (a) => { if (a === 'open') handlePop(params, 'push'); } });
    });
  }
  function updateChip() { const d = $$('.top-right .chip .dot').find((x) => !x.classList.contains('call')); if (d) d.classList.toggle('on', S.sseOn); }

  // ---------------------------------------------------------------- boot
  async function boot() {
    const qp = new URLSearchParams(location.search);
    S.embed = qp.get('embed') === '1' || (window.self !== window.top && qp.get('embed') !== '0');
    if (qp.get('view')) { S.settings.classic = qp.get('view') === 'classic'; saveSettings(); }
    if (qp.get('agent')) { S.settings.agentEmail = clean(qp.get('agent')); saveSettings(); }
    try {
      const [config, providers, users] = await Promise.all([api('/api/config'), api('/api/providers'), api('/api/users')]);
      Object.assign(S, { config, providers, users, today: config.today });
      window.MOCK_TODAY = config.today;
      S.clockSkew = new Date(config.now) - Date.now();
    } catch (e) { $('#root').innerHTML = `<div style="color:#fff;padding:40px">Cannot reach the mock EHR server: ${esc(e.message)}</div>`; return; }
    // re-hydrate open tabs
    await Promise.all(S.openTabs.map((id) => loadChart(id).catch(() => { S.openTabs = S.openTabs.filter((x) => x !== id); })));
    const isPop = location.pathname.replace(/\/$/, '') === '/pop' || ['phone', 'ani', 'mrn', 'patientId', 'fin', 'conversationId', 'gcConversationId'].some((k) => clean(qp.get(k)));
    if (isPop && !S.user) { S.user = S.users.find((u) => u.persona === (qp.get('persona') || 'access')) || S.users[0]; store.set('user', S.user); }
    window.addEventListener('hashchange', render);
    connectSSE();
    if (isPop) {
      const keep = new URLSearchParams(); if (qp.get('embed')) keep.set('embed', qp.get('embed'));
      history.replaceState(null, '', `/${keep.toString() ? '?' + keep : ''}`);
      await handlePop(qp, 'url');
    } else render();
    updateUnread(); setInterval(updateUnread, 60000);
  }
  boot();
})();
