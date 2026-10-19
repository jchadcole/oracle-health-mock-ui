/* Mock "Clinical AI Agent": rule-based answers generated from the chart data. No model calls, no network. */
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtD = (s) => s ? new Date(s.length === 10 ? s + 'T12:00:00' : s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const fmtDT = (s) => s ? new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const DRUGS = {
    rosuvastatin: { general: 'Headache, myalgia, abdominal pain, asthenia and nausea.', msk: 'Myalgia and arthralgia.', gi: 'Abdominal pain, nausea and constipation.', rare: 'Myopathy, rhabdomyolysis, hepatic enzyme increases.' },
    atorvastatin: { general: 'Nasopharyngitis, arthralgia, diarrhea, pain in extremity.', msk: 'Myalgia, muscle spasms.', gi: 'Diarrhea, dyspepsia, nausea.', rare: 'Myopathy, rhabdomyolysis, liver enzyme elevation.' },
    metformin: { general: 'Diarrhea, nausea, vomiting, flatulence, asthenia.', gi: 'GI upset is most common early; take with meals.', rare: 'Lactic acidosis (rare; risk higher with renal impairment), vitamin B12 deficiency.' },
    lisinopril: { general: 'Dizziness, headache, cough, fatigue.', cv: 'Hypotension.', rare: 'Angioedema, hyperkalemia, renal impairment.' },
    semaglutide: { general: 'Nausea, vomiting, diarrhea, abdominal pain, constipation.', rare: 'Pancreatitis, gallbladder disease, hypoglycemia with insulin or sulfonylureas.' },
    warfarin: { general: 'Bleeding (minor to major), bruising.', rare: 'Skin necrosis, purple toe syndrome. Many drug and food interactions; monitor INR.' },
    apixaban: { general: 'Bleeding, bruising, nausea, anemia.', rare: 'Major bleeding; spinal/epidural hematoma with neuraxial anesthesia.' },
    furosemide: { general: 'Dizziness, increased urination, electrolyte imbalance (low potassium, sodium).', rare: 'Ototoxicity at high doses, dehydration, gout flares.' },
    sertraline: { general: 'Nausea, diarrhea, insomnia, dizziness, sexual dysfunction.', rare: 'Serotonin syndrome, hyponatremia, increased suicidal thoughts in young adults.' },
    anastrozole: { general: 'Hot flashes, joint pain/stiffness, fatigue, mood changes.', rare: 'Bone density loss, elevated cholesterol.' },
    ticagrelor: { general: 'Bleeding, dyspnea, bruising.', rare: 'Bradyarrhythmia, major bleeding.' },
    meloxicam: { general: 'Dyspepsia, diarrhea, edema, headache.', rare: 'GI bleeding, cardiovascular events, kidney injury.' },
    amlodipine: { general: 'Peripheral edema, dizziness, flushing, palpitations.', rare: 'Hypotension, worsening angina on initiation.' },
    donepezil: { general: 'Nausea, diarrhea, insomnia, muscle cramps.', rare: 'Bradycardia, syncope, GI bleeding.' },
    levothyroxine: { general: 'Usually well tolerated at correct dose; over-replacement causes palpitations, weight loss, insomnia.', rare: 'Arrhythmia, bone loss with chronic over-replacement.' },
  };

  const today = () => window.MOCK_TODAY || new Date().toISOString().slice(0, 10);
  function age(dob) { const b = new Date(dob + 'T12:00:00'), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; }
  function latest(arr, key = 'date') { return [...(arr || [])].sort((a, b) => String(b[key]).localeCompare(String(a[key])))[0]; }

  function summary(p) {
    const a = age(p.dob);
    const active = p.problems.filter((x) => x.status === 'Active');
    const meds = p.medications.filter((m) => m.status === 'Active');
    const lastEnc = latest(p.encounters);
    const next = (p.appointments || []).filter((x) => !['Completed', 'Cancelled'].includes(x.status) && x.start >= today()).sort((x, y) => x.start.localeCompare(y.start))[0];
    const abn = [];
    (p.results || []).slice().sort((x, y) => y.date.localeCompare(x.date)).forEach((r) => r.items.forEach((i) => { if (i.flag && abn.length < 4) abn.push(`${i.name} ${i.value}${i.unit ? ' ' + i.unit : ''} (${i.flag === 'H' ? 'high' : 'low'}, ${fmtD(r.date)})`); }));
    const lead = `${p.firstName} ${p.lastName}, a ${a}-year-old ${p.sex.toLowerCase()}${next ? `, is scheduled for ${next.type.toLowerCase()} (${esc(next.reason)}) on ${fmtD(next.start)}` : ''}.`;
    const parts = [`<p class="lead">${esc(lead)}</p>`];
    if (active.length) parts.push(`<p><b>Relevant History:</b> Active conditions include ${active.map((x) => `<a href="#" data-tab="problems">${esc(x.name.toLowerCase())}</a>`).join(', ')}. ${meds.length ? `Current medications include ${meds.slice(0, 4).map((m) => `<a href="#" data-tab="medications">${esc(m.name.split(' (')[0].split(' ')[0])}</a>`).join(', ')}${meds.length > 4 ? ` and ${meds.length - 4} more` : ''}.` : ''}</p>`);
    if (lastEnc) {
      const d = latest((p.documents || []).filter((x) => x.date.slice(0, 10) >= lastEnc.date));
      parts.push(`<p><b>Last Encounter:</b> ${esc(lastEnc.type)} on ${fmtD(lastEnc.date)} for ${esc(lastEnc.reason.toLowerCase())}${lastEnc.los ? ` (${lastEnc.los}-day stay)` : ''}. ${d ? esc(d.text.split('. ').slice(0, 2).join('. ')) + '.' : ''}</p>`);
    }
    if (abn.length) parts.push(`<p><b>Recent Results:</b> Abnormal results include ${abn.map(esc).join('; ')}.</p>`);
    if (p.allergies.length) parts.push(`<p><b>Allergies:</b> ${p.allergies.map((x) => `${esc(x.substance)} (${esc(x.reaction.toLowerCase())})`).join(', ')}.</p>`);
    const sources = 1 + (lastEnc ? 1 : 0) + (abn.length ? 1 : 0);
    return { html: parts.join(''), sources };
  }

  function previsit(p) {
    const active = p.problems.filter((x) => x.status === 'Active').map((x) => x.name.split(',')[0]);
    const meds = p.medications.filter((m) => m.status === 'Active').map((m) => m.name.split(' (')[0]);
    const enc = latest(p.encounters);
    return `${p.firstName} ${p.lastName}, ${age(p.dob)}-year-old ${p.sex.toLowerCase()}${enc ? `, last seen ${fmtD(enc.date)} for ${enc.reason.toLowerCase()}` : ', new to this practice'}. ${meds.length ? `Medications include ${meds.slice(0, 4).join(', ')}.` : ''} ${active.length ? `Active conditions are ${active.slice(0, 4).join(', ')}.` : ''}`;
  }

  function checkInPrep(p) {
    const active = p.problems.filter((x) => x.status === 'Active');
    const last = latest(p.activities, 'datetime');
    const fut = (p.appointments || []).filter((x) => !['Completed', 'Cancelled'].includes(x.status) && x.start >= today()).sort((x, y) => x.start.localeCompare(y.start));
    return `<p>${esc(p.firstName)} ${esc(p.lastName)} is a ${age(p.dob)} year old ${esc(p.sex.toLowerCase())}${p.allergies.length ? ` with allergies to ${p.allergies.map((a) => esc(a.substance.toLowerCase())).join(' and ')}` : ' with no known allergies'}. The patient has been diagnosed with the following chronic conditions:</p><p>${active.map((x) => `-- ${esc(x.name)}`).join('<br>')}</p>
      <p>${last ? `Last contact: ${esc(last.method.toLowerCase())} (${esc(last.direction.toLowerCase())}) on ${fmtDT(last.datetime)} with ${esc(last.createdBy)}: ${esc(last.note || last.outcome)}` : 'No prior care management contacts.'}</p>
      <p>Future Appointments in the next 60 days:</p><p>${fut.length ? fut.slice(0, 4).map((a) => `-- ${fmtDT(a.start)} ${esc(a.type)} with ${esc(a.providerName)}`).join('<br>') : 'No Future Appointments scheduled.'}</p>
      ${p.riskIndicators.length ? `<p>Risk indicators: ${p.riskIndicators.map((r) => esc(r.label)).join('; ')}.</p>` : ''}`;
  }

  function list(items) { return `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`; }

  // Returns { html, sources: [{author, date, title}] }
  function answer(question, p, ctx = {}) {
    const q = question.toLowerCase();
    const src = (title, date, author = 'Chart') => ({ author, date: date ? fmtD(date) : 'Current', title });
    const drug = Object.keys(DRUGS).find((d) => q.includes(d));
    if (drug && /side|effect|adverse|reaction|risk/.test(q)) {
      const d = DRUGS[drug];
      const rows = [d.general && `<b>General:</b> ${d.general}`, d.msk && `<b>Musculoskeletal:</b> ${d.msk}`, d.gi && `<b>Gastrointestinal:</b> ${d.gi}`, d.cv && `<b>Cardiovascular:</b> ${d.cv}`].filter(Boolean);
      const onIt = p && p.medications.some((m) => m.name.toLowerCase().includes(drug));
      return { html: `<p>The most common side effects of ${drug[0].toUpperCase() + drug.slice(1)} include:</p>${list(rows)}<p>Rare side effects include ${d.rare.charAt(0).toLowerCase() + d.rare.slice(1)}</p>${p ? `<p>${onIt ? `${esc(p.firstName)} is currently taking ${drug}.` : `${esc(p.firstName)} does not have an active order for ${drug}.`}</p>` : ''}`, sources: [{ author: 'Drug reference', date: 'Unknown', title: `Drug Side Effects of ${drug} (demo content)` }] };
    }
    if (!p) {
      if (/schedule|today|next patient|how many/.test(q) && ctx.schedule) {
        const s = ctx.schedule; const left = s.filter((a) => !['Completed', 'Cancelled', 'No Show'].includes(a.status));
        return { html: `<p>You have <b>${s.length}</b> patients scheduled today, ${left.length} not yet seen.</p>${list(left.slice(0, 5).map((a) => `${new Date(a.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}: <b>${esc(a.patientName)}</b>, ${esc(a.type)} (${esc(a.reason)})`))}`, sources: [src('Provider schedule')] };
      }
      return { html: `<p>Open a patient chart to ask about a specific patient, or ask about your schedule. Example questions:</p>${list(['How many patients do I have today?', 'What are the side effects of metformin?'])}`, sources: [] };
    }
    const name = esc(p.firstName);
    if (/summar|overview|brief|tell me about|history/.test(q)) { const s = summary(p); return { html: s.html, sources: [src('Clinical summary', null), src('Encounters', latest(p.encounters)?.date)] }; }
    if (/allerg/.test(q)) return { html: p.allergies.length ? `<p>${name} has ${p.allergies.length} documented allerg${p.allergies.length > 1 ? 'ies' : 'y'}:</p>${list(p.allergies.map((a) => `<b>${esc(a.substance)}</b>: ${esc(a.reaction)} (${esc(a.severity)})`))}` : `<p>${name} has no known allergies.</p>`, sources: [src('Allergies')] };
    if (/medic|meds|taking|prescri|refill/.test(q)) { const m = p.medications.filter((x) => x.status !== 'Completed'); return { html: `<p>${name} has ${m.length} current medications:</p>${list(m.map((x) => `<b>${esc(x.name)}</b>: ${esc(x.sig)}, ${x.refills} refill(s)${x.status !== 'Active' ? ` <i>(${esc(x.status)})</i>` : ''}`))}`, sources: [src('Medication list')] }; }
    if (/balance|bill|owe|pay|statement|insurance|coverage/.test(q)) { const a = p.account; return { html: `<p>Current balance is <b>${money(a.balance)}</b>${a.paymentPlan ? ` on a payment plan of ${money(a.paymentPlan.monthly)}/month${a.paymentPlan.autopay ? ' (autopay)' : ''}` : ''}.${a.lastPayment ? ` Last payment ${money(a.lastPayment.amount)} on ${fmtD(a.lastPayment.date)}.` : ''}</p><p>Coverage: ${esc(p.insurance.payer)} ${esc(p.insurance.plan)} (${esc(p.insurance.status)})${p.insurance.secondary ? `; secondary ${esc(p.insurance.secondary)}` : ''}.</p>${a.financialAssistance ? `<p>Financial assistance: ${esc(a.financialAssistance)}.</p>` : ''}`, sources: [src('Patient account'), src('Coverage')] }; }
    if (/appoint|next visit|scheduled|upcoming|surgery/.test(q)) { const f = (p.appointments || []).filter((x) => !['Completed', 'Cancelled'].includes(x.status) && x.start >= today()).sort((a, b) => a.start.localeCompare(b.start)); return { html: f.length ? `<p>${name} has ${f.length} upcoming appointment(s):</p>${list(f.map((a) => `<b>${fmtDT(a.start)}</b>: ${esc(a.type)} with ${esc(a.providerName)} at ${esc(a.location)}${a.notes ? `. <i>${esc(a.notes)}</i>` : ''}`))}` : `<p>${name} has no upcoming appointments.</p>`, sources: [src('Appointments')] }; }
    if (/care team|care manager|who is|doctor|pcp|physician/.test(q)) return { html: `<p>${name}'s care team:</p>${list(p.careTeam.map((c) => `<b>${esc(c.role)}</b>: ${esc(c.name)} ${esc(c.phone)}`))}`, sources: [src('Care team')] };
    if (/vital|blood pressure|bp|weight|heart rate|pulse|oxygen|spo2/.test(q)) { const v = latest(p.vitals); return { html: v ? `<p>Most recent vitals (${fmtD(v.date)}): BP <b>${v.bp}</b> mmHg, HR ${v.hr} bpm, SpO2 ${v.spo2}%, RR ${v.rr}, Temp ${v.temp} C, Weight ${v.weight} kg, BMI ${v.bmi}.</p>` : `<p>No vitals on file.</p>`, sources: v ? [src('Vital signs', v.date)] : [] }; }
    if (/lab|result|a1c|inr|potassium|creatinine|egfr|bnp|cholesterol|ldl|glucose|hemoglobin|tsh|troponin/.test(q)) {
      const all = (p.results || []).flatMap((r) => r.items.map((i) => ({ ...i, date: r.date, panel: r.panel }))).sort((a, b) => b.date.localeCompare(a.date));
      const key = ['a1c', 'inr', 'potassium', 'creatinine', 'egfr', 'bnp', 'cholesterol', 'ldl', 'glucose', 'hemoglobin', 'tsh', 'troponin'].find((k) => q.includes(k));
      const hits = key ? all.filter((i) => i.name.toLowerCase().includes(key === 'bnp' ? 'natriuretic' : key)) : all.slice(0, 8);
      return { html: hits.length ? list(hits.map((i) => `<b>${esc(i.name)}</b> ${esc(i.value)} ${esc(i.unit)} ${i.flag ? `<span class="red">(${i.flag})</span>` : ''} <span class="muted">ref ${esc(i.range)}, ${fmtD(i.date)}</span>`)) : `<p>No matching results found for ${name}.</p>`, sources: hits.length ? [src('Results', hits[0].date, 'Lab')] : [] };
    }
    if (/problem|diagnos|condition/.test(q)) return { html: list(p.problems.map((x) => `<b>${esc(x.name)}</b> (${esc(x.code)}), ${esc(x.status)}`)), sources: [src('Problem list')] };
    if (/risk|gap|attention|alert/.test(q)) return { html: p.riskIndicators.length ? list(p.riskIndicators.map((r) => esc(r.label))) + (p.orders?.length ? `<p>Open orders: ${p.orders.map((o) => `${esc(o.name)} (${esc(o.status)})`).join('; ')}.</p>` : '') : `<p>No risk indicators flagged.</p>`, sources: [src('Evidence-based indicators')] };
    if (/last visit|encounter|admi|discharg|hospital|er |ed visit|emergency/.test(q)) { const e = [...p.encounters].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5); const ds = p.documents.find((d) => d.type === 'Discharge Summary'); return { html: list(e.map((x) => `<b>${fmtD(x.date)}</b>: ${esc(x.type)}, ${esc(x.reason)}${x.los ? ` (${x.los} days)` : ''}`)) + (ds ? `<p><b>Discharge summary:</b> ${esc(ds.text)}</p>` : ''), sources: [src('Encounters', e[0]?.date)].concat(ds ? [src(ds.title, ds.date, ds.author)] : []) }; }
    if (/contact|call|activity|spoke/.test(q)) { const a = [...p.activities].sort((x, y) => y.datetime.localeCompare(x.datetime)).slice(0, 5); return { html: a.length ? list(a.map((x) => `<b>${fmtDT(x.datetime)}</b> ${esc(x.method)} (${esc(x.direction)}), ${esc(x.outcome)} by ${esc(x.createdBy)}${x.note ? `: ${esc(x.note)}` : ''}`)) : `<p>No contacts logged.</p>`, sources: [src('Activity log')] }; }
    return { html: `<p>I can answer questions about ${name}'s chart. Try one of these:</p>`, sources: [], suggest: true };
  }

  const suggestions = (p) => p ? ['Summarize this patient', 'What medications are they taking?', 'Any allergies?', 'When is the next appointment?', 'What is the balance?', 'Recent abnormal labs', 'Who is on the care team?'] : ['How many patients do I have today?', 'What are the side effects of metformin?'];

  window.MockAI = { summary, previsit, checkInPrep, answer, suggestions };
})();
