'use strict';
// Mock Oracle Health (Millennium-style) EHR for Genesys Cloud screen-pop demos.
// Zero dependencies: node server.js  (Node 18+)

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { seed } = require('./lib/seed');
const fhir = require('./lib/fhir');

const PORT = Number(process.env.PORT || 8080);
const API_KEY = process.env.API_KEY || '';                 // optional: protects integration endpoints
// Who may iframe the UI (Genesys Scripts / Interaction Widget). Stray wrapping quotes (e.g. "*" typed into a
// hosting dashboard) would make the CSP invalid and block every frame, so strip them.
const FRAME_ANCESTORS = (process.env.FRAME_ANCESTORS || '').trim().replace(/^"(.*)"$/, '$1').trim() || '*';
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
const DEMO_TZ = process.env.DEMO_TZ || 'America/Chicago';
const GENESYS = {
  region: process.env.GENESYS_REGION || 'mypurecloud.com',
  clientId: process.env.GENESYS_CLIENT_ID || '',
  clientSecret: process.env.GENESYS_CLIENT_SECRET || '',
};
const PUBLIC_DIR = path.join(__dirname, 'public');

let db = seed(new Date(), DEMO_TZ);
const todayInTz = () => new Intl.DateTimeFormat('en-CA', { timeZone: DEMO_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
function ensureFresh() {
  // Demo data is relative to "today"; reseed when the date rolls over so schedules never go stale.
  if (process.env.RESET_DAILY !== 'false' && db.seededOn !== todayInTz()) db = seed(new Date(), DEMO_TZ);
}

// ---------- helpers ----------
const digits = (s) => String(s || '').replace(/\D/g, '');
const phoneKey = (s) => { const d = digits(s); return d.length >= 10 ? d.slice(-10) : d; };
const fmtPhone = (s) => { const d = phoneKey(s); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : s; };
const nowLocal = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: DEMO_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}:${g('second')}`;
};
const ageOf = (dob) => { const b = new Date(dob), n = new Date(todayInTz()); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
let idSeq = 9000;
const newId = (p) => `${p}-${++idSeq}`;

function send(res, status, body, headers = {}) {
  const isStr = typeof body === 'string' || Buffer.isBuffer(body);
  res.writeHead(status, { 'Content-Type': isStr ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', ...corsHeaders(), ...headers });
  res.end(isStr ? body : JSON.stringify(body, null, 2));
}
function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key', 'Cache-Control': 'no-store' };
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      if (!data) return resolve({});
      const type = req.headers['content-type'] || '';
      try {
        if (type.includes('application/x-www-form-urlencoded')) return resolve(Object.fromEntries(new URLSearchParams(data)));
        resolve(JSON.parse(data));
      } catch (e) { reject(Object.assign(new Error('Invalid JSON body'), { status: 400 })); }
    });
  });
}
function authorized(req, url) {
  if (!API_KEY) return true;
  const h = req.headers.authorization || '';
  if (h === `Bearer ${API_KEY}`) return true;
  if (h.startsWith('Basic ')) { const [, pass] = Buffer.from(h.slice(6), 'base64').toString().split(':'); if (pass === API_KEY) return true; }
  return req.headers['x-api-key'] === API_KEY || url.searchParams.get('apiKey') === API_KEY;
}
function baseUrl(req) {
  if (PUBLIC_URL) return PUBLIC_URL;
  const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0];
  return `${proto}://${req.headers['x-forwarded-host'] || req.headers.host}`;
}

// ---------- domain ----------
const provider = (id) => db.providers.find((p) => p.id === id);
const getPatient = (id) => db.patients.find((p) => p.id === id || p.mrn === id);

function summary(p) {
  const next = upcomingAppointments(p.id)[0];
  return {
    id: p.id, mrn: p.mrn, fin: p.fin, firstName: p.firstName, lastName: p.lastName, preferredName: p.preferredName,
    fullName: `${p.firstName} ${p.lastName}`, sex: p.sex, dob: p.dob, age: ageOf(p.dob), language: p.language,
    phone: (p.phones.find((x) => x.primary) || p.phones[0] || {}).number || '', phones: p.phones, email: p.email || '',
    pcp: provider(p.pcpId)?.name || '', insurance: p.insurance?.payer || '', allergyCount: p.allergies.length,
    flags: p.flags, balance: p.account?.balance || 0,
    nextAppointment: next ? { id: next.id, start: next.start, type: next.type, provider: provider(next.providerId)?.name, location: next.location } : null,
  };
}
function upcomingAppointments(patientId) {
  const now = nowLocal().slice(0, 10);
  return db.appointments.filter((a) => a.patientId === patientId && a.start.slice(0, 10) >= now && !['Cancelled', 'Completed', 'No Show'].includes(a.status)).sort((a, b) => a.start.localeCompare(b.start));
}
function search(params) {
  const q = (params.q || '').trim().toLowerCase();
  const phone = phoneKey(params.phone || params.ani || '');
  const mrn = (params.mrn || '').trim();
  const fin = (params.fin || '').trim();
  const dob = (params.dob || params.birthdate || '').trim();
  const last = (params.lastName || params.family || '').trim().toLowerCase();
  const first = (params.firstName || params.given || '').trim().toLowerCase();
  const email = (params.email || '').trim().toLowerCase();
  const memberId = (params.memberId || '').trim().toLowerCase();
  if (params.all) return db.patients;
  if (!q && !phone && !mrn && !fin && !dob && !last && !first && !email && !memberId) return [];
  return db.patients.filter((p) => {
    if (phone && !(phone.length >= 7 && p.phones.some((x) => phoneKey(x.number).endsWith(phone)))) return false;
    if (mrn && p.mrn !== mrn) return false;
    if (fin && p.fin !== fin && !p.encounters.some((e) => e.fin === fin)) return false;
    if (dob && p.dob !== dob) return false;
    if (last && !p.lastName.toLowerCase().startsWith(last)) return false;
    if (first && !p.firstName.toLowerCase().startsWith(first) && !p.preferredName.toLowerCase().startsWith(first)) return false;
    if (email && (p.email || '').toLowerCase() !== email) return false;
    if (memberId && (p.insurance?.memberId || '').toLowerCase() !== memberId) return false;
    if (q) {
      const qd = digits(q);
      const hay = [p.firstName, p.lastName, p.preferredName, `${p.firstName} ${p.lastName}`, `${p.lastName}, ${p.firstName}`, p.mrn, p.fin, p.dob, p.email].join(' | ').toLowerCase();
      const phoneHit = qd.length >= 4 && p.phones.some((x) => phoneKey(x.number).includes(qd));
      if (!hay.includes(q) && !phoneHit) return false;
    }
    return true;
  });
}
function fullChart(p) {
  const appts = db.appointments.filter((a) => a.patientId === p.id).sort((a, b) => b.start.localeCompare(a.start)).map(decorateAppt);
  return { ...p, age: ageOf(p.dob), pcp: provider(p.pcpId) || null, appointments: appts };
}
function decorateAppt(a) {
  const p = getPatient(a.patientId); const pr = provider(a.providerId);
  return { ...a, providerName: pr?.name, specialty: pr?.specialty, patientName: p ? `${p.firstName} ${p.lastName}` : '' };
}
function slots(providerId, fromDate, days = 10) {
  const pr = provider(providerId); if (!pr) return [];
  const out = []; const start = new Date(`${fromDate}T00:00:00Z`);
  const nowStr = nowLocal();
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setUTCDate(d.getUTCDate() + i);
    const dow = d.getUTCDay(); if (dow === 0 || dow === 6) continue;
    const ds = d.toISOString().slice(0, 10);
    for (let h = 8; h < 17; h++) for (const m of [0, 30]) {
      if (h === 12) continue;
      const t = `${ds}T${String(h).padStart(2, '0')}:${m ? '30' : '00'}:00`;
      if (t <= nowStr) continue;
      const hash = [...(providerId + t)].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7);
      if (hash % 10 < 6) continue; // ~60% already booked
      if (db.appointments.some((a) => a.providerId === providerId && a.start === t && a.status !== 'Cancelled')) continue;
      out.push({ start: t, durationMin: 30, providerId, providerName: pr.name, location: pr.location });
    }
  }
  return out;
}
function lookupResult(matches, req, extra = {}) {
  const base = baseUrl(req);
  const qs = new URLSearchParams(Object.entries(extra).filter(([, v]) => v));
  const first = matches[0];
  const s = first ? summary(first) : null;
  return {
    found: matches.length > 0, count: matches.length, multipleMatches: matches.length > 1,
    patientId: s?.id || '', mrn: s?.mrn || '', firstName: s?.firstName || '', lastName: s?.lastName || '', fullName: s?.fullName || '',
    dob: s?.dob || '', age: s?.age ?? null, language: s?.language || '', balance: s?.balance ?? 0, pcp: s?.pcp || '',
    nextAppointmentStart: s?.nextAppointment?.start || '', nextAppointmentType: s?.nextAppointment?.type || '', nextAppointmentProvider: s?.nextAppointment?.provider || '',
    popUrl: `${base}/pop?${matches.length === 1 ? `patientId=${s.id}` : ''}${matches.length === 1 && qs.toString() ? '&' : ''}${qs.toString()}`,
    matches: matches.map(summary),
  };
}

// ---------- screen pop push (SSE) ----------
const sseClients = new Set();
function pushScreenPop(pop) {
  db.screenpops.unshift(pop); db.screenpops = db.screenpops.slice(0, 50);
  let delivered = 0;
  for (const c of sseClients) {
    const target = (pop.agent || '*').toLowerCase();
    if (target === '*' || target === c.agent || target === c.userId) { c.res.write(`event: screenpop\ndata: ${JSON.stringify(pop)}\n\n`); delivered++; }
  }
  return delivered;
}
setInterval(() => { for (const c of sseClients) c.res.write(': keepalive\n\n'); }, 25000).unref();

// ---------- Genesys Cloud (optional, server-side client credentials) ----------
let gcToken = { value: '', exp: 0 };
async function genesysToken() {
  if (gcToken.value && Date.now() < gcToken.exp - 60000) return gcToken.value;
  const r = await fetch(`https://login.${GENESYS.region}/oauth/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${Buffer.from(`${GENESYS.clientId}:${GENESYS.clientSecret}`).toString('base64')}` }, body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw Object.assign(new Error(`Genesys OAuth failed: ${r.status}`), { status: 502 });
  const j = await r.json(); gcToken = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 }; return gcToken.value;
}
async function genesysConversation(id) {
  const token = await genesysToken();
  const r = await fetch(`https://api.${GENESYS.region}/api/v2/conversations/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw Object.assign(new Error(`Genesys conversation lookup failed: ${r.status}`), { status: r.status === 404 ? 404 : 502 });
  const c = await r.json();
  const cust = (c.participants || []).find((p) => ['customer', 'external'].includes(p.purpose)) || {};
  const addr = cust.ani || cust.address || (cust.calls?.[0]?.other?.addressNormalized) || '';
  const acd = (c.participants || []).find((p) => p.purpose === 'acd') || {};
  return { conversationId: c.id, phone: addr.replace(/^tel:/, ''), customerName: cust.name || '', attributes: cust.attributes || {}, mediaType: cust.calls ? 'voice' : (cust.chats || cust.messages ? 'message' : 'other'), queue: acd.queueName || cust.queueName || '' };
}

// ---------- router ----------
const routes = [];
const route = (method, pattern, handler, opts = {}) => routes.push({ method, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), handler, ...opts });

route('GET', '/api/health', () => ({ status: 'ok', seededOn: db.seededOn, time: nowLocal(), timeZone: DEMO_TZ, patients: db.patients.length, genesysLookup: !!GENESYS.clientId }));
route('GET', '/api/config', (req) => ({ baseUrl: baseUrl(req), timeZone: DEMO_TZ, today: todayInTz(), now: nowLocal(), genesysLookup: !!GENESYS.clientId, apiKeyRequired: !!API_KEY, organization: 'Lakeview Health (fictional)' }));
route('GET', '/api/users', () => db.users);
route('GET', '/api/providers', () => db.providers);

route('GET', '/api/patients', (req, url) => search(Object.fromEntries(url.searchParams)).map(summary));
route('GET', '/api/patients/lookup', (req, url) => {
  const p = Object.fromEntries(url.searchParams);
  const matches = p.patientId ? [getPatient(p.patientId)].filter(Boolean) : search(p);
  return lookupResult(matches, req, { phone: p.phone || p.ani, conversationId: p.conversationId });
}, { secure: true });
route('POST', '/api/patients', async (req) => {
  const b = await readBody(req);
  if (!b.firstName || !b.lastName || !b.dob) throw Object.assign(new Error('firstName, lastName and dob are required'), { status: 400 });
  const mrn = String(700100 + db.patients.length + 1 + Math.floor(Math.random() * 50));
  const p = {
    id: newId('p'), mrn, fin: String(304100 + db.patients.length + 50), firstName: b.firstName, lastName: b.lastName, preferredName: b.preferredName || b.firstName,
    sex: b.sex || 'Unknown', dob: b.dob, language: b.language || 'English', interpreter: false,
    phones: b.phone ? [{ type: b.phoneType || 'Mobile', number: fmtPhone(b.phone), primary: true }] : [], email: b.email || '',
    address: { line: b.addressLine || '', city: b.city || '', state: b.state || '', zip: b.zip || '' },
    insurance: { payer: b.payer || 'Self-pay', plan: b.plan || '', memberId: b.memberId || '', group: b.group || '', status: b.payer ? 'Eligibility pending' : 'Self-pay' },
    pcpId: b.pcpId || 'pr-1', allergies: [], codeStatus: 'Full Code', advanceDirective: 'None', portal: 'Not enrolled', onStudy: false,
    riskIndicators: [], programs: [], problems: [], medications: [], vitals: [], results: [], encounters: [], documents: [], careTeam: [],
    activities: [], account: { balance: 0, guarantor: b.guarantor || `${b.firstName} ${b.lastName}`, statements: [], payments: [] }, immunizations: [], flags: ['New registration'], emergencyContact: null, orders: [],
  };
  db.patients.push(p);
  return created(fullChart(p));
});
route('GET', '/api/patients/:id', (req, url, { id }) => { const p = getPatient(id); if (!p) throw nf(); return fullChart(p); });
route('PATCH', '/api/patients/:id', async (req, url, { id }) => {
  const p = getPatient(id); if (!p) throw nf();
  const b = await readBody(req);
  for (const k of ['preferredName', 'language', 'email', 'address', 'insurance', 'phones', 'emergencyContact', 'portal']) if (b[k] !== undefined) p[k] = b[k];
  if (b.phones) p.phones = b.phones.map((x) => ({ ...x, number: fmtPhone(x.number) }));
  return fullChart(p);
});
route('GET', '/api/patients/:id/appointments', (req, url, { id }) => db.appointments.filter((a) => a.patientId === id).map(decorateAppt));
route('POST', '/api/patients/:id/appointments', async (req, url, { id }) => {
  const p = getPatient(id); if (!p) throw nf();
  const b = await readBody(req); const pr = provider(b.providerId);
  if (!pr || !b.start) throw Object.assign(new Error('providerId and start are required'), { status: 400 });
  if (db.appointments.some((a) => a.providerId === pr.id && a.start === b.start && a.status !== 'Cancelled')) throw Object.assign(new Error('Slot no longer available'), { status: 409 });
  const a = { id: newId('ap'), patientId: p.id, providerId: pr.id, start: b.start, durationMin: Number(b.durationMin || 30), type: b.type || 'Follow-up', reason: b.reason || '', status: 'Confirmed', location: pr.location, room: null, visitMode: b.visitMode || 'In person', notes: b.notes || '', bookedBy: b.bookedBy || '', conversationId: b.conversationId || '' };
  db.appointments.push(a);
  return created(decorateAppt(a));
});
route('PATCH', '/api/appointments/:id', async (req, url, { id }) => {
  const a = db.appointments.find((x) => x.id === id); if (!a) throw nf();
  const b = await readBody(req);
  for (const k of ['status', 'start', 'providerId', 'reason', 'notes', 'room', 'type', 'visitMode']) if (b[k] !== undefined) a[k] = b[k];
  if (b.providerId) a.location = provider(b.providerId)?.location || a.location;
  return decorateAppt(a);
});
route('GET', '/api/schedule', (req, url) => {
  const providerId = url.searchParams.get('providerId') || 'pr-1';
  const d = url.searchParams.get('date') || todayInTz();
  return db.appointments.filter((a) => a.providerId === providerId && a.start.startsWith(d)).sort((a, b) => a.start.localeCompare(b.start)).map((a) => ({ ...decorateAppt(a), patient: summary(getPatient(a.patientId)) }));
});
route('GET', '/api/slots', (req, url) => {
  const sp = url.searchParams; const from = sp.get('from') || todayInTz(); const days = Number(sp.get('days') || 10);
  const ids = sp.get('providerId') ? [sp.get('providerId')] : db.providers.filter((p) => !sp.get('specialty') || p.specialty === sp.get('specialty')).map((p) => p.id);
  return ids.flatMap((pid) => slots(pid, from, days)).sort((a, b) => a.start.localeCompare(b.start)).slice(0, Number(sp.get('limit') || 200));
});
route('POST', '/api/patients/:id/prescriptions', async (req, url, { id }) => {
  const p = getPatient(id); if (!p) throw nf();
  const b = await readBody(req); if (!b.name) throw Object.assign(new Error('name is required'), { status: 400 });
  const m = { name: b.name, sig: b.sig || '', status: 'Active', refills: Number(b.refills || 0), prescriber: b.prescriber || 'pr-1', start: todayInTz(), pharmacy: b.pharmacy || '' };
  const i = p.medications.findIndex((x) => x.name === b.name);
  if (i >= 0 && b.renew) { p.medications[i].refills = m.refills; p.medications[i].lastRenewed = m.start; } else p.medications.unshift(m);
  return created(m);
});
route('POST', '/api/patients/:id/activities', async (req, url, { id }) => {
  const p = getPatient(id); if (!p) throw nf();
  const b = await readBody(req);
  const a = { id: newId('ac'), datetime: b.datetime || nowLocal(), method: b.method || 'Phone call', direction: b.direction || 'Inbound', outcome: b.outcome || '', contact: b.contact || `${p.lastName.toUpperCase()}, ${p.firstName.toUpperCase()} (Patient)`, createdBy: b.createdBy || 'Genesys Cloud', durationMin: Number(b.durationMin || 0), note: b.note || '', conversationId: b.conversationId || '', queue: b.queue || '', source: b.source || '' };
  p.activities.unshift(a);
  return created(a);
});
route('POST', '/api/patients/:id/documents', async (req, url, { id }) => {
  const p = getPatient(id); if (!p) throw nf();
  const b = await readBody(req);
  const d = { id: newId('dc'), date: nowLocal(), title: b.title || 'Note', type: b.type || 'Progress Note', author: b.author || '', text: b.text || '' };
  p.documents.unshift(d); return created(d);
});
route('POST', '/api/patients/:id/payments', async (req, url, { id }) => {
  const p = getPatient(id); if (!p) throw nf();
  const b = await readBody(req); const amt = Math.round(Number(b.amount || 0) * 100) / 100;
  if (!(amt > 0)) throw Object.assign(new Error('amount must be > 0'), { status: 400 });
  p.account.balance = Math.max(0, Math.round((p.account.balance - amt) * 100) / 100);
  const pay = { id: newId('pay'), date: nowLocal(), amount: amt, method: b.method || 'Card', confirmation: `PMT${Math.floor(Math.random() * 9e6 + 1e6)}`, takenBy: b.takenBy || '' };
  p.account.lastPayment = { date: pay.date.slice(0, 10), amount: amt };
  (p.account.payments = p.account.payments || []).unshift(pay);
  if (p.account.balance === 0) p.account.statements.forEach((s) => { s.status = 'Paid'; });
  return created({ payment: pay, balance: p.account.balance });
});
route('GET', '/api/messages', (req, url) => {
  const to = url.searchParams.get('to');
  return db.messages.filter((m) => !to || m.to === to).sort((a, b) => b.date.localeCompare(a.date)).map((m) => ({ ...m, patientName: (() => { const p = getPatient(m.patientId); return p ? `${p.firstName} ${p.lastName}` : ''; })() }));
});
route('PATCH', '/api/messages/:id', async (req, url, { id }) => { const m = db.messages.find((x) => x.id === id); if (!m) throw nf(); Object.assign(m, await readBody(req)); return m; });

// Screen pop: Genesys (Script data action, Architect, Process Automation, or anything) pushes a pop to an agent's open EHR.
route('POST', '/api/screenpop', async (req, url) => {
  const b = { ...Object.fromEntries(url.searchParams), ...(await readBody(req)) };
  delete b.apiKey;
  const phone = b.phone || b.ani || '';
  const matches = b.patientId || b.mrn ? [getPatient(b.patientId || b.mrn)].filter(Boolean) : search({ phone, dob: b.dob, lastName: b.lastName, fin: b.fin });
  const pop = { id: newId('pop'), receivedAt: nowLocal(), agent: (b.agent || b.agentEmail || b.userId || '*').toLowerCase(), phone: fmtPhone(phone), conversationId: b.conversationId || '', direction: b.direction || 'Inbound', queue: b.queue || '', mediaType: b.mediaType || 'voice', customerName: b.customerName || '', intent: b.intent || '', patientIds: matches.map((m) => m.id), tab: b.tab || '' };
  const delivered = pushScreenPop(pop);
  return { ...lookupResult(matches, req, { phone, conversationId: pop.conversationId }), screenPopId: pop.id, deliveredTo: delivered };
}, { secure: true });
route('GET', '/api/screenpop/recent', () => db.screenpops);
route('GET', '/api/genesys/conversations/:id', async (req, url, { id }) => {
  if (!GENESYS.clientId) throw Object.assign(new Error('Genesys lookup not configured (set GENESYS_CLIENT_ID, GENESYS_CLIENT_SECRET, GENESYS_REGION)'), { status: 501 });
  const c = await genesysConversation(id);
  return { ...c, ...lookupResult(c.phone ? search({ phone: c.phone }) : [], req, { phone: c.phone, conversationId: id }) };
});
route('POST', '/api/admin/reset', () => { db = seed(new Date(), DEMO_TZ); return { status: 'reset', seededOn: db.seededOn }; });

// FHIR R4-flavoured read endpoints (subset), shaped like Oracle Health Millennium FHIR
route('GET', '/fhir/r4/metadata', (req) => fhir.capability(baseUrl(req)));
route('GET', '/fhir/r4/Patient', (req, url) => {
  const sp = url.searchParams; const tel = sp.get('phone') || sp.get('telecom') || '';
  const ident = (sp.get('identifier') || '').split('|').pop();
  const matches = search({ phone: tel.split('|').pop(), mrn: ident, family: sp.get('family') || '', given: sp.get('given') || '', birthdate: sp.get('birthdate') || '', q: sp.get('name') || '' });
  return fhir.bundle(baseUrl(req), matches.map((p) => fhir.patient(p, baseUrl(req))));
}, { secure: true, fhir: true });
route('GET', '/fhir/r4/Patient/:id', (req, url, { id }) => { const p = getPatient(id); if (!p) throw nf(); return fhir.patient(p, baseUrl(req)); }, { secure: true, fhir: true });
route('GET', '/fhir/r4/Appointment', (req, url) => {
  const pid = (url.searchParams.get('patient') || '').replace('Patient/', '');
  return fhir.bundle(baseUrl(req), db.appointments.filter((a) => !pid || a.patientId === pid).map((a) => fhir.appointment(decorateAppt(a))));
}, { secure: true, fhir: true });
route('GET', '/fhir/r4/AllergyIntolerance', (req, url) => { const p = getPatient((url.searchParams.get('patient') || '').replace('Patient/', '')); return fhir.bundle(baseUrl(req), p ? fhir.allergies(p) : []); }, { secure: true, fhir: true });
route('GET', '/fhir/r4/Condition', (req, url) => { const p = getPatient((url.searchParams.get('patient') || '').replace('Patient/', '')); return fhir.bundle(baseUrl(req), p ? fhir.conditions(p) : []); }, { secure: true, fhir: true });
route('GET', '/fhir/r4/MedicationRequest', (req, url) => { const p = getPatient((url.searchParams.get('patient') || '').replace('Patient/', '')); return fhir.bundle(baseUrl(req), p ? fhir.medications(p) : []); }, { secure: true, fhir: true });

class Created { constructor(body) { this.body = body; } }
const created = (body) => new Created(body);
const nf = () => Object.assign(new Error('Not found'), { status: 404 });

// ---------- static ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
function serveStatic(req, res, pathname) {
  let file = path.normalize(path.join(PUBLIC_DIR, decodeURIComponent(pathname)));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden');
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    const html = `${file}.html`;
    file = fs.existsSync(html) ? html : path.join(PUBLIC_DIR, 'index.html'); // SPA fallback (/pop, /chart/..., etc.)
  }
  const headers = { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
  if (FRAME_ANCESTORS !== '*') headers['Content-Security-Policy'] = `frame-ancestors ${FRAME_ANCESTORS}`; // no header = any site may frame it
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'OPTIONS') return send(res, 204, '');
  ensureFresh();
  try {
    if (url.pathname === '/api/screenpop/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive', ...corsHeaders(), 'X-Accel-Buffering': 'no' });
      const client = { res, agent: (url.searchParams.get('agent') || '').toLowerCase(), userId: (url.searchParams.get('userId') || '').toLowerCase() };
      sseClients.add(client); res.write(`event: hello\ndata: ${JSON.stringify({ connected: true, agent: client.agent })}\n\n`);
      req.on('close', () => sseClients.delete(client));
      return;
    }
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = url.pathname.replace(/\/$/, '').match(r.re); if (!m) continue;
      if (r.secure && !authorized(req, url)) return send(res, 401, { error: 'Unauthorized: supply Authorization: Bearer <API_KEY> or x-api-key' });
      const out = await r.handler(req, url, m.groups || {});
      const status = out instanceof Created ? 201 : 200;
      const body = out instanceof Created ? out.body : out;
      return send(res, status, body, r.fhir ? { 'Content-Type': 'application/fhir+json; charset=utf-8' } : {});
    }
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/fhir/')) return send(res, 404, { error: 'No such endpoint' });
    return serveStatic(req, res, url.pathname === '/' ? '/index.html' : url.pathname);
  } catch (e) {
    if (!e.status) console.error(e);
    return send(res, e.status || 500, { error: e.message });
  }
});

if (require.main === module) server.listen(PORT, () => console.log(`Mock Oracle Health EHR listening on http://localhost:${PORT} (tz ${DEMO_TZ})`));
module.exports = { server };
