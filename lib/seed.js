'use strict';
// Fictional demo data for "Lakeview Health". No real PHI. Phone numbers use the 555-01xx fictional range.
// Dates are generated relative to the day the server seeds, so "today's schedule" is always populated.

function seed(now = new Date(), tz = process.env.DEMO_TZ || 'America/Chicago') {
  // Times are stored as naive wall-clock strings (no Z) in the demo time zone so the UI shows them as-is.
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const [Y, M, D] = ymd.split('-').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  const day = (offset, hhmm = '09:00') => {
    const d = new Date(Date.UTC(Y, M - 1, D + offset));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${hhmm}:00`;
  };
  const date = (offset) => day(offset).slice(0, 10);
  let seq = 1;
  const id = (p) => `${p}-${String(seq++).padStart(4, '0')}`;

  const providers = [
    { id: 'pr-1', name: 'Elena Martinez, MD', short: 'Martinez MD, Elena', specialty: 'Internal Medicine', location: 'Lakeview Medical Center - Internal Medicine', phone: '(312) 555-0100' },
    { id: 'pr-2', name: 'Marcus Hale, MD', short: 'Hale MD, Marcus', specialty: 'Family Medicine', location: 'Northside Family Health', phone: '(312) 555-0101' },
    { id: 'pr-3', name: 'Naomi Fischer, MD', short: 'Fischer MD, Naomi', specialty: 'Cardiology', location: 'Lakeview Heart Institute', phone: '(312) 555-0102' },
    { id: 'pr-4', name: 'Victor Osei, MD', short: 'Osei MD, Victor', specialty: 'Pulmonology', location: 'Lakeview Medical Center - Pulmonary', phone: '(312) 555-0103' },
    { id: 'pr-5', name: 'Rachel Kim, MD', short: 'Kim MD, Rachel', specialty: 'Obstetrics & Gynecology', location: "Lakeview Women's Health", phone: '(312) 555-0104' },
    { id: 'pr-6', name: 'Ahmed Siddiqui, MD', short: 'Siddiqui MD, Ahmed', specialty: 'Pediatrics', location: 'Lakeview Children\'s Clinic', phone: '(312) 555-0105' },
    { id: 'pr-7', name: 'Laura Benton, MD', short: 'Benton MD, Laura', specialty: 'Oncology', location: 'Lakeview Cancer Center', phone: '(312) 555-0106' },
    { id: 'pr-8', name: 'Owen Price, DO', short: 'Price DO, Owen', specialty: 'Orthopedics', location: 'Lakeview Orthopedics & Sports', phone: '(312) 555-0107' },
  ];

  const users = [
    { id: 'u-1', name: 'Taylor Nguyen', role: 'Patient Access Representative', persona: 'access', email: 'taylor.nguyen@lakeviewhealth.example', position: 'PHPATACCESS' },
    { id: 'u-2', name: 'Jordan Blake, RN', role: 'Care Manager', persona: 'care', email: 'jordan.blake@lakeviewhealth.example', position: 'PHCASEMGR' },
    { id: 'u-3', name: 'Elena Martinez, MD', role: 'Physician - Internal Medicine', persona: 'provider', email: 'elena.martinez@lakeviewhealth.example', providerId: 'pr-1', position: 'PHYSICIAN' },
    { id: 'u-4', name: 'Sam Rivera', role: 'Patient Financial Services', persona: 'billing', email: 'sam.rivera@lakeviewhealth.example', position: 'PFSREP' },
  ];

  const P = []; // patients
  const A = []; // appointments

  function patient(p) {
    const base = {
      id: p.id, mrn: p.mrn, fin: p.fin, firstName: p.firstName, lastName: p.lastName, preferredName: p.preferredName || p.firstName,
      sex: p.sex, dob: p.dob, language: p.language || 'English', interpreter: !!p.interpreter,
      phones: p.phones, email: p.email, address: p.address,
      insurance: p.insurance, pcpId: p.pcpId, allergies: p.allergies || [], codeStatus: p.codeStatus || 'Full Code',
      advanceDirective: p.advanceDirective || 'None', portal: p.portal || 'Active', onStudy: !!p.onStudy,
      riskIndicators: p.riskIndicators || [], programs: p.programs || [], problems: p.problems || [], medications: p.medications || [],
      vitals: p.vitals || [], results: p.results || [], encounters: p.encounters || [], documents: p.documents || [],
      careTeam: p.careTeam || [], activities: p.activities || [], account: p.account || { balance: 0, statements: [], payments: [] },
      immunizations: p.immunizations || [], flags: p.flags || [], emergencyContact: p.emergencyContact || null,
      orders: p.orders || [], weight: p.weight, height: p.height,
    };
    P.push(base);
    return base;
  }
  function appt(patientId, providerId, offset, hhmm, durationMin, type, reason, status, extra = {}) {
    const pr = providers.find((x) => x.id === providerId);
    A.push({ id: id('ap'), patientId, providerId, start: day(offset, hhmm), durationMin, type, reason, status: status || (offset < 0 ? 'Completed' : 'Confirmed'), location: pr.location, room: extra.room || null, visitMode: extra.visitMode || 'In person', notes: extra.notes || '' });
  }
  const vit = (offset, t, hr, sys, dia, spo2, rr, wt, ht, pain = 0) => ({ date: day(offset, '09:10'), temp: t, hr, bp: `${sys}/${dia}`, sys, dia, spo2, rr, weight: wt, height: ht, bmi: +(wt / ((ht / 100) ** 2)).toFixed(1), pain });
  const enc = (offset, type, reason, providerId, extra = {}) => ({ id: id('en'), date: date(offset), type, reason, providerId, fin: extra.fin || String(204700 + seq), location: extra.location || providers.find((x) => x.id === providerId).location, los: extra.los || null });
  const act = (offset, hhmm, method, direction, outcome, contact, createdBy, durationMin, note) => ({ id: id('ac'), datetime: day(offset, hhmm), method, direction, outcome, contact, createdBy, durationMin, note });
  const lab = (offset, panel, items) => ({ id: id('lb'), date: day(offset, '07:30'), panel, items: items.map(([name, value, unit, range, flag]) => ({ name, value, unit, range, flag: flag || '' })) });
  const doc = (offset, title, type, author, text) => ({ id: id('dc'), date: day(offset, '11:00'), title, type, author, text });

  // 1. Maria Gonzalez - diabetes / HTN, Spanish speaker, balance due
  const maria = patient({
    id: 'p-1001', mrn: '700101', fin: '304101', firstName: 'Maria', lastName: 'Gonzalez', sex: 'Female', dob: '1968-04-12', language: 'Spanish', interpreter: true,
    phones: [{ type: 'Mobile', number: '(312) 555-0142', primary: true }, { type: 'Home', number: '(312) 555-0143' }],
    email: 'maria.gonzalez@example.com', address: { line: '1420 W Addison St, Apt 3B', city: 'Chicago', state: 'IL', zip: '60613' },
    insurance: { payer: 'BlueCross BlueShield of Illinois', plan: 'PPO Choice', memberId: 'XOF884512901', group: 'GRP-22841', status: 'Eligible' },
    pcpId: 'pr-1', weight: 81.2, height: 162,
    allergies: [{ substance: 'Penicillin', reaction: 'Hives', severity: 'Moderate' }, { substance: 'Shellfish', reaction: 'Swelling', severity: 'Severe' }],
    riskIndicators: [{ label: 'Diabetes - A1c above goal', level: 'high' }, { label: 'SDOH 1.12 (Transportation)', level: 'medium' }, { label: 'Readmission Risk (8%)', level: 'low' }],
    programs: [{ name: 'Diabetes Care Management', status: 'Active', since: date(-210) }],
    problems: [
      { name: 'Type 2 diabetes mellitus with hyperglycemia', code: 'E11.65', status: 'Active', onset: '2016-03-01', priority: 1 },
      { name: 'Essential hypertension', code: 'I10', status: 'Active', onset: '2014-06-15', priority: 2 },
      { name: 'Hyperlipidemia', code: 'E78.5', status: 'Active', onset: '2015-01-20', priority: 3 },
      { name: 'Obesity, BMI 30-30.9', code: 'E66.9', status: 'Active', onset: '2018-08-01', priority: 4 },
    ],
    medications: [
      { name: 'metFORMIN 1000 mg oral tablet', sig: '1 tab, Oral, BID with meals', status: 'Active', refills: 2, prescriber: 'pr-1', start: date(-400) },
      { name: 'lisinopril 20 mg oral tablet', sig: '1 tab, Oral, Daily', status: 'Active', refills: 0, prescriber: 'pr-1', start: date(-700) },
      { name: 'atorvastatin (Lipitor 40 mg oral tablet)', sig: '1 tab, Oral, Daily at bedtime', status: 'Active', refills: 3, prescriber: 'pr-1', start: date(-650) },
      { name: 'semaglutide 0.5 mg/0.5 mL subcutaneous pen', sig: '0.5 mg, Subcut, Weekly', status: 'Active', refills: 1, prescriber: 'pr-1', start: date(-90) },
    ],
    vitals: [vit(-30, 36.8, 82, 142, 88, 98, 16, 81.2, 162, 0), vit(-120, 36.7, 78, 138, 86, 98, 14, 83.0, 162, 1)],
    results: [
      lab(-31, 'Hemoglobin A1c', [['Hemoglobin A1c', '8.4', '%', '4.0-5.6', 'H']]),
      lab(-31, 'Basic Metabolic Panel', [['Glucose', '186', 'mg/dL', '70-99', 'H'], ['Sodium', '139', 'mmol/L', '135-145'], ['Potassium', '4.4', 'mmol/L', '3.5-5.1'], ['Creatinine', '0.9', 'mg/dL', '0.6-1.1'], ['eGFR', '78', 'mL/min/1.73m2', '>60']]),
      lab(-31, 'Lipid Panel', [['Total Cholesterol', '212', 'mg/dL', '<200', 'H'], ['LDL', '128', 'mg/dL', '<100', 'H'], ['HDL', '44', 'mg/dL', '>50', 'L'], ['Triglycerides', '201', 'mg/dL', '<150', 'H']]),
      lab(-122, 'Hemoglobin A1c', [['Hemoglobin A1c', '8.9', '%', '4.0-5.6', 'H']]),
    ],
    encounters: [enc(-30, 'Outpatient', 'Diabetes follow-up', 'pr-1'), enc(-122, 'Outpatient', 'Diabetes follow-up', 'pr-1'), enc(-260, 'Emergency', 'Hyperglycemia', 'pr-2', { location: 'Lakeview Medical Center - Emergency' }), enc(-400, 'Outpatient', 'Annual physical', 'pr-1'), enc(-560, 'Outpatient', 'Hypertension follow-up', 'pr-1')],
    documents: [
      doc(-30, 'Office Visit Note - Diabetes Follow-up', 'Progress Note', 'Martinez MD, Elena', 'A1c improved from 8.9 to 8.4% after starting semaglutide. Patient reports improved diet, occasional missed metformin evening doses. Plan: continue semaglutide, increase to 1 mg in 4 weeks if tolerated, diabetic eye exam referral, recheck A1c in 3 months. Spanish interpreter used.'),
      doc(-60, 'Care Management Telephone Note', 'Care Management', 'Blake RN, Jordan', 'Outbound call to review glucose log. Fasting values 140-170. Discussed transportation barrier to lab appointments; referred to ride benefit.'),
    ],
    careTeam: [{ role: 'Primary Care Physician', name: 'Martinez MD, Elena', phone: '(312) 555-0100' }, { role: 'Care Manager', name: 'Blake RN, Jordan', phone: '(312) 555-0180 ext. 4471' }, { role: 'Diabetes Educator', name: 'Ortiz CDCES, Lucia', phone: '(312) 555-0181' }],
    activities: [act(-60, '10:15', 'Phone call', 'Outbound', 'Care plan review', 'GONZALEZ, MARIA (Patient)', 'Blake RN, Jordan', 18, 'Reviewed glucose log, ride benefit referral.'), act(-14, '14:02', 'Portal message', 'Inbound', 'Refill request', 'GONZALEZ, MARIA (Patient)', 'Nguyen, Taylor', 4, 'Requested lisinopril refill; routed to Dr. Martinez.')],
    account: { balance: 145.2, guarantor: 'Maria Gonzalez', lastPayment: { date: date(-45), amount: 40 }, statements: [{ date: date(-20), amount: 145.2, status: 'Due', dueDate: date(10) }], paymentPlan: null },
    immunizations: [{ name: 'Influenza, seasonal', date: date(-330) }, { name: 'COVID-19 (2025-26)', date: date(-300) }, { name: 'Pneumococcal PCV20', date: date(-700) }],
    orders: [{ name: 'Diabetic retinal exam referral', status: 'Pending scheduling', date: date(-30) }, { name: 'Hemoglobin A1c', status: 'Future, due in 2 months', date: date(-30) }],
  });

  // 2. James Whitfield - COPD/CHF, recent inpatient, care management
  const james = patient({
    id: 'p-1002', mrn: '700102', fin: '304102', firstName: 'James', lastName: 'Whitfield', preferredName: 'Jim', sex: 'Male', dob: '1949-09-03',
    phones: [{ type: 'Home', number: '(312) 555-0188', primary: true }, { type: 'Mobile', number: '(312) 555-0189' }],
    email: 'jwhitfield49@example.com', address: { line: '88 E Schiller St', city: 'Chicago', state: 'IL', zip: '60610' },
    insurance: { payer: 'Medicare', plan: 'Medicare Part A & B', memberId: '1EG4-TE5-MK72', group: '', status: 'Eligible', secondary: 'AARP Medigap Plan G' },
    pcpId: 'pr-1', weight: 92.4, height: 178, codeStatus: 'DNR / DNI', advanceDirective: 'POLST on file',
    allergies: [{ substance: 'Sulfa drugs', reaction: 'Rash', severity: 'Moderate' }],
    riskIndicators: [{ label: 'Hospitalization Risk (High)', level: 'high' }, { label: 'Readmission within 30 days (24%)', level: 'high' }, { label: 'Fall Risk', level: 'medium' }],
    programs: [{ name: 'Transitions of Care', status: 'Active', since: date(-12) }, { name: 'Heart Failure Registry', status: 'Active', since: date(-400) }],
    problems: [
      { name: 'Chronic obstructive pulmonary disease, type B', code: 'J44.9', status: 'Active', onset: '2012-02-01', priority: 1 },
      { name: 'Heart failure with reduced ejection fraction', code: 'I50.22', status: 'Active', onset: '2019-05-11', priority: 2 },
      { name: 'Atrial fibrillation', code: 'I48.91', status: 'Active', onset: '2020-10-02', priority: 3 },
      { name: 'Former tobacco use', code: 'Z87.891', status: 'Resolved', onset: '2010-01-01', priority: 4 },
    ],
    medications: [
      { name: 'umeclidinium (Incruse Ellipta 62.5 mcg/inh)', sig: '1 inhalation, Daily', status: 'Active', refills: 2, prescriber: 'pr-4', start: date(-500) },
      { name: 'albuterol 90 mcg/inh HFA', sig: '2 puffs, Inhaled, q4h PRN wheeze', status: 'Active', refills: 1, prescriber: 'pr-4', start: date(-900) },
      { name: 'furosemide 40 mg oral tablet', sig: '1 tab, Oral, Daily', status: 'Active', refills: 0, prescriber: 'pr-3', start: date(-12) },
      { name: 'sacubitril-valsartan (Entresto 24-26 mg)', sig: '1 tab, Oral, BID', status: 'Active', refills: 2, prescriber: 'pr-3', start: date(-300) },
      { name: 'apixaban (Eliquis 5 mg oral tablet)', sig: '1 tab, Oral, BID', status: 'Active', refills: 3, prescriber: 'pr-3', start: date(-700) },
      { name: 'prednisone 40 mg oral tablet', sig: '1 tab, Oral, Daily x5 days', status: 'Completed', refills: 0, prescriber: 'pr-4', start: date(-15) },
    ],
    vitals: [vit(-9, 36.9, 96, 128, 84, 91, 20, 92.4, 178, 2), vit(-15, 37.4, 104, 134, 88, 88, 24, 94.0, 178, 3)],
    results: [
      lab(-14, 'BNP', [['B-type Natriuretic Peptide', '812', 'pg/mL', '<100', 'H']]),
      lab(-14, 'Basic Metabolic Panel', [['Sodium', '134', 'mmol/L', '135-145', 'L'], ['Potassium', '3.7', 'mmol/L', '3.5-5.1'], ['Creatinine', '1.3', 'mg/dL', '0.7-1.3'], ['Glucose', '132', 'mg/dL', '70-99', 'H']]),
      lab(-14, 'CBC', [['WBC', '15.7', 'x10^3/uL', '4.0-11.0', 'H'], ['Hemoglobin', '13.1', 'g/dL', '13.5-17.5', 'L'], ['Platelets', '244', 'x10^3/uL', '150-400']]),
    ],
    encounters: [enc(-16, 'Inpatient', 'COPD exacerbation with CHF', 'pr-4', { location: 'Lakeview Medical Center - 5 West', los: 4 }), enc(-16, 'Emergency', 'Shortness of breath', 'pr-2', { location: 'Lakeview Medical Center - Emergency' }), enc(-9, 'Outpatient', 'Post-discharge follow-up', 'pr-1'), enc(-120, 'Outpatient', 'Pulmonary follow-up', 'pr-4'), enc(-200, 'Outpatient', 'Cardiology follow-up', 'pr-3'), enc(-380, 'Inpatient', 'CHF exacerbation', 'pr-3', { location: 'Lakeview Medical Center - 4 East', los: 3 })],
    documents: [
      doc(-12, 'Discharge Summary', 'Discharge Summary', 'Osei MD, Victor', 'Admitted for acute exacerbation of COPD with volume overload. Treated with nebulized bronchodilators, IV furosemide, prednisone burst. Discharged home on furosemide 40 mg daily. Follow up with PCP within 7 days and pulmonology in 4 weeks. Daily weights; call if gain > 1 kg/day.'),
      doc(-9, 'Transitional Care Visit', 'Progress Note', 'Martinez MD, Elena', 'Patient seen 7 days post discharge. Breathing improved, SpO2 91% RA. Weight down 1.6 kg. Medication reconciliation completed. Reinforced inhaler technique.'),
    ],
    careTeam: [{ role: 'Primary Care Physician', name: 'Martinez MD, Elena', phone: '(312) 555-0100' }, { role: 'Care Manager', name: 'Blake RN, Jordan', phone: '(312) 555-0180 ext. 4471' }, { role: 'Cardiologist', name: 'Fischer MD, Naomi', phone: '(312) 555-0102' }, { role: 'Pulmonologist', name: 'Osei MD, Victor', phone: '(312) 555-0103' }],
    activities: [act(-11, '11:27', 'Phone call', 'Outbound', 'Post-discharge check-in', 'WHITFIELD, JAMES (Patient)', 'Blake RN, Jordan', 25, '48-hour post discharge call. Has meds, scale at home. Scheduled TCM visit.'), act(-4, '09:40', 'Phone call', 'Inbound', 'Symptom question', 'WHITFIELD, CAROL (Spouse)', 'Nguyen, Taylor', 6, 'Spouse asked about ankle swelling; warm transfer to nurse line.')],
    emergencyContact: { name: 'Carol Whitfield', relationship: 'Spouse', phone: '(312) 555-0189' },
    account: { balance: 0, guarantor: 'James Whitfield', lastPayment: { date: date(-60), amount: 25 }, statements: [], paymentPlan: null },
    orders: [{ name: 'Home health nursing referral', status: 'Accepted', date: date(-12) }, { name: 'Pulmonary rehab referral', status: 'Pending authorization', date: date(-12) }],
  });

  // 3. Aisha Rahman - prenatal
  patient({
    id: 'p-1003', mrn: '700103', fin: '304103', firstName: 'Aisha', lastName: 'Rahman', sex: 'Female', dob: '1991-02-27',
    phones: [{ type: 'Mobile', number: '(773) 555-0119', primary: true }], email: 'aisha.rahman@example.com', address: { line: '5230 N Sheridan Rd, Unit 1204', city: 'Chicago', state: 'IL', zip: '60640' },
    insurance: { payer: 'Aetna', plan: 'Open Access Select', memberId: 'W284719305', group: 'GRP-88120', status: 'Eligible' },
    pcpId: 'pr-2', weight: 68.5, height: 165, allergies: [],
    riskIndicators: [{ label: 'Pregnancy - 24 weeks', level: 'medium' }],
    programs: [{ name: 'Prenatal Care', status: 'Active', since: date(-120) }],
    problems: [{ name: 'Supervision of normal pregnancy, second trimester', code: 'Z34.82', status: 'Active', onset: date(-168), priority: 1 }, { name: 'Iron deficiency anemia', code: 'D50.9', status: 'Active', onset: date(-40), priority: 2 }],
    medications: [{ name: 'prenatal multivitamin oral tablet', sig: '1 tab, Oral, Daily', status: 'Active', refills: 5, prescriber: 'pr-5', start: date(-150) }, { name: 'ferrous sulfate 325 mg oral tablet', sig: '1 tab, Oral, Daily', status: 'Active', refills: 2, prescriber: 'pr-5', start: date(-40) }],
    vitals: [vit(-14, 36.6, 84, 112, 70, 99, 16, 68.5, 165)],
    results: [lab(-42, 'CBC', [['Hemoglobin', '10.4', 'g/dL', '11.5-15.5', 'L'], ['Ferritin', '9', 'ng/mL', '15-150', 'L']]), lab(-14, 'Glucose Tolerance 1 hr', [['Glucose, 1 hr post load', '128', 'mg/dL', '<140']])],
    encounters: [enc(-14, 'Outpatient', 'Prenatal visit, 22 weeks', 'pr-5'), enc(-42, 'Outpatient', 'Anatomy ultrasound, 18 weeks', 'pr-5'), enc(-98, 'Outpatient', 'Prenatal intake', 'pr-5')],
    careTeam: [{ role: 'Obstetrician', name: 'Kim MD, Rachel', phone: '(312) 555-0104' }, { role: 'Primary Care Physician', name: 'Hale MD, Marcus', phone: '(312) 555-0101' }],
    documents: [doc(-14, 'Prenatal Visit', 'Progress Note', 'Kim MD, Rachel', 'G1P0 at 22w. Fetal heart tones 148. Fundal height appropriate. 1-hr GTT normal. Continue iron. Next visit 4 weeks; Tdap at 28 weeks.')],
    account: { balance: 60, guarantor: 'Aisha Rahman', statements: [{ date: date(-10), amount: 60, status: 'Due', dueDate: date(20) }], paymentPlan: null },
  });

  // 4. Robert Chen - ortho, surgery scheduled, payment plan
  patient({
    id: 'p-1004', mrn: '700104', fin: '304104', firstName: 'Robert', lastName: 'Chen', preferredName: 'Rob', sex: 'Male', dob: '1975-11-15',
    phones: [{ type: 'Mobile', number: '(847) 555-0163', primary: true }, { type: 'Work', number: '(847) 555-0164' }], email: 'rchen.ortho@example.com', address: { line: '901 Davis St', city: 'Evanston', state: 'IL', zip: '60201' },
    insurance: { payer: 'UnitedHealthcare', plan: 'Choice Plus', memberId: '981234567', group: 'GRP-71233', status: 'Eligible - prior auth approved' },
    pcpId: 'pr-2', weight: 88, height: 180, allergies: [{ substance: 'Codeine', reaction: 'Nausea/vomiting', severity: 'Mild' }],
    riskIndicators: [{ label: 'Surgical case scheduled', level: 'medium' }],
    problems: [{ name: 'Primary osteoarthritis, right knee', code: 'M17.11', status: 'Active', onset: '2021-05-01', priority: 1 }, { name: 'Low back pain', code: 'M54.50', status: 'Active', onset: '2019-09-01', priority: 2 }],
    medications: [{ name: 'meloxicam 15 mg oral tablet', sig: '1 tab, Oral, Daily with food', status: 'Active', refills: 1, prescriber: 'pr-8', start: date(-180) }, { name: 'acetaminophen 500 mg oral tablet', sig: '2 tab, Oral, q8h PRN pain', status: 'Active', refills: 0, prescriber: 'pr-2', start: date(-365) }],
    vitals: [vit(-21, 36.7, 72, 126, 80, 99, 14, 88, 180, 6)],
    results: [lab(-21, 'Pre-op Panel', [['Hemoglobin', '14.6', 'g/dL', '13.5-17.5'], ['Platelets', '262', 'x10^3/uL', '150-400'], ['INR', '1.0', '', '0.8-1.2'], ['Creatinine', '1.0', 'mg/dL', '0.7-1.3']])],
    encounters: [enc(-21, 'Outpatient', 'Pre-operative evaluation', 'pr-8'), enc(-90, 'Outpatient', 'Knee injection', 'pr-8'), enc(-300, 'Outpatient', 'Annual physical', 'pr-2')],
    careTeam: [{ role: 'Orthopedic Surgeon', name: 'Price DO, Owen', phone: '(312) 555-0107' }, { role: 'Primary Care Physician', name: 'Hale MD, Marcus', phone: '(312) 555-0101' }, { role: 'Surgery Scheduler', name: 'Patel, Nina', phone: '(312) 555-0190' }],
    documents: [doc(-21, 'Orthopedic Pre-op Note', 'Progress Note', 'Price DO, Owen', 'Right total knee arthroplasty planned. Failed conservative management including injections and PT. Pre-op labs normal. Prior authorization approved by UHC.')],
    account: { balance: 1250, guarantor: 'Robert Chen', lastPayment: { date: date(-15), amount: 125 }, statements: [{ date: date(-18), amount: 1250, status: 'Payment plan', dueDate: date(12) }], paymentPlan: { monthly: 125, remaining: 10, autopay: true } },
    orders: [{ name: 'Right total knee arthroplasty', status: 'Scheduled', date: date(-21) }, { name: 'Post-op physical therapy', status: 'Ordered', date: date(-21) }],
  });

  // 5. Linda Okafor - oncology survivorship, on study
  patient({
    id: 'p-1005', mrn: '700105', fin: '304105', firstName: 'Linda', lastName: 'Okafor', sex: 'Female', dob: '1957-07-22', onStudy: true,
    phones: [{ type: 'Home', number: '(630) 555-0177', primary: true }], email: 'lokafor@example.com', address: { line: '412 S Washington St', city: 'Naperville', state: 'IL', zip: '60540' },
    insurance: { payer: 'Humana', plan: 'Medicare Advantage PPO', memberId: 'H71238845', group: '', status: 'Eligible' },
    pcpId: 'pr-1', weight: 70, height: 160, allergies: [{ substance: 'Latex', reaction: 'Contact dermatitis', severity: 'Mild' }],
    riskIndicators: [{ label: 'Clinical Trial Participant', level: 'medium' }, { label: 'Bone density - osteopenia', level: 'low' }],
    programs: [{ name: 'Cancer Survivorship', status: 'Active', since: date(-800) }],
    problems: [{ name: 'Personal history of malignant neoplasm of breast', code: 'Z85.3', status: 'Active', onset: '2021-03-10', priority: 1 }, { name: 'Osteopenia', code: 'M85.80', status: 'Active', onset: '2023-04-01', priority: 2 }, { name: 'Hypothyroidism', code: 'E03.9', status: 'Active', onset: '2015-01-01', priority: 3 }],
    medications: [{ name: 'anastrozole 1 mg oral tablet', sig: '1 tab, Oral, Daily', status: 'Active', refills: 4, prescriber: 'pr-7', start: date(-900) }, { name: 'levothyroxine 75 mcg oral tablet', sig: '1 tab, Oral, Daily before breakfast', status: 'Active', refills: 5, prescriber: 'pr-1', start: date(-1500) }, { name: 'calcium + vitamin D3 600 mg-800 IU', sig: '1 tab, Oral, BID', status: 'Active', refills: 0, prescriber: 'pr-1', start: date(-600) }],
    vitals: [vit(-45, 36.5, 70, 124, 76, 99, 14, 70, 160)],
    results: [lab(-46, 'Thyroid', [['TSH', '2.1', 'mIU/L', '0.4-4.0']]), lab(-46, 'CA 27-29', [['CA 27-29', '22', 'U/mL', '<38']])],
    encounters: [enc(-45, 'Outpatient', 'Survivorship visit', 'pr-7'), enc(-180, 'Outpatient', 'Mammogram', 'pr-7'), enc(-230, 'Outpatient', 'Annual physical', 'pr-1')],
    careTeam: [{ role: 'Oncologist', name: 'Benton MD, Laura', phone: '(312) 555-0106' }, { role: 'Research Coordinator', name: 'Ibarra, Marco', phone: '(312) 555-0191' }, { role: 'Primary Care Physician', name: 'Martinez MD, Elena', phone: '(312) 555-0100' }],
    documents: [doc(-45, 'Survivorship Visit', 'Progress Note', 'Benton MD, Laura', 'No evidence of recurrence. Tolerating anastrozole with mild arthralgias. Continue study protocol LKV-ONC-221 visit schedule. DEXA next spring.')],
    account: { balance: 0, guarantor: 'Linda Okafor', statements: [], paymentPlan: null },
  });

  // 6 + 7. Kowalski household - shared phone (multi-match demo)
  patient({
    id: 'p-1006', mrn: '700106', fin: '304106', firstName: 'Emily', lastName: 'Kowalski', sex: 'Female', dob: '1986-12-05',
    phones: [{ type: 'Mobile', number: '(312) 555-0131', primary: true }], email: 'emily.kowalski@example.com', address: { line: '2210 N Damen Ave', city: 'Chicago', state: 'IL', zip: '60647' },
    insurance: { payer: 'Cigna', plan: 'Open Access Plus', memberId: 'U77812034', group: 'GRP-30017', status: 'Eligible' },
    pcpId: 'pr-2', weight: 62, height: 168, allergies: [{ substance: 'Sulfamethoxazole', reaction: 'Rash', severity: 'Moderate' }],
    problems: [{ name: 'Migraine without aura', code: 'G43.009', status: 'Active', onset: '2010-01-01', priority: 1 }],
    medications: [{ name: 'sumatriptan 50 mg oral tablet', sig: '1 tab, Oral, at onset, may repeat in 2h', status: 'Active', refills: 2, prescriber: 'pr-2', start: date(-200) }],
    vitals: [vit(-200, 36.6, 68, 110, 72, 99, 14, 62, 168)],
    encounters: [enc(-200, 'Outpatient', 'Annual physical', 'pr-2')],
    careTeam: [{ role: 'Primary Care Physician', name: 'Hale MD, Marcus', phone: '(312) 555-0101' }],
    account: { balance: 35, guarantor: 'Emily Kowalski', statements: [{ date: date(-5), amount: 35, status: 'Due', dueDate: date(25) }] },
  });
  patient({
    id: 'p-1007', mrn: '700107', fin: '304107', firstName: 'Daniel', lastName: 'Kowalski', preferredName: 'Danny', sex: 'Male', dob: '2016-06-18',
    phones: [{ type: 'Guardian mobile', number: '(312) 555-0131', primary: true }], email: 'emily.kowalski@example.com', address: { line: '2210 N Damen Ave', city: 'Chicago', state: 'IL', zip: '60647' },
    insurance: { payer: 'Cigna', plan: 'Open Access Plus (dependent)', memberId: 'U77812034-02', group: 'GRP-30017', status: 'Eligible' },
    pcpId: 'pr-6', weight: 31, height: 137, allergies: [{ substance: 'Peanut', reaction: 'Anaphylaxis', severity: 'Severe' }],
    riskIndicators: [{ label: 'Asthma - ED visit in last 6 months', level: 'high' }],
    problems: [{ name: 'Mild persistent asthma', code: 'J45.30', status: 'Active', onset: '2020-09-01', priority: 1 }, { name: 'Peanut allergy', code: 'Z91.010', status: 'Active', onset: '2018-02-01', priority: 2 }],
    medications: [{ name: 'fluticasone 44 mcg/inh HFA', sig: '2 puffs, Inhaled, BID', status: 'Active', refills: 3, prescriber: 'pr-6', start: date(-300) }, { name: 'albuterol 90 mcg/inh HFA with spacer', sig: '2 puffs, Inhaled, q4h PRN', status: 'Active', refills: 2, prescriber: 'pr-6', start: date(-300) }, { name: 'EPINEPHrine 0.3 mg auto-injector', sig: '0.3 mg, IM, once PRN anaphylaxis', status: 'Active', refills: 1, prescriber: 'pr-6', start: date(-300) }],
    vitals: [vit(-60, 37.0, 92, 102, 64, 97, 20, 31, 137)],
    encounters: [enc(-60, 'Outpatient', 'Asthma follow-up', 'pr-6'), enc(-150, 'Emergency', 'Asthma exacerbation', 'pr-2', { location: 'Lakeview Medical Center - Pediatric Emergency' }), enc(-330, 'Outpatient', 'Well child visit', 'pr-6')],
    immunizations: [{ name: 'Influenza, seasonal', date: date(-340) }, { name: 'Tdap', date: date(-500) }],
    careTeam: [{ role: 'Pediatrician', name: 'Siddiqui MD, Ahmed', phone: '(312) 555-0105' }],
    emergencyContact: { name: 'Emily Kowalski', relationship: 'Mother', phone: '(312) 555-0131' },
    flags: ['Minor - guardian consent required'],
    account: { balance: 0, guarantor: 'Emily Kowalski', statements: [] },
  });

  // 8. Samuel Brooks - elderly, dementia, caregiver calls
  patient({
    id: 'p-1008', mrn: '700108', fin: '304108', firstName: 'Samuel', lastName: 'Brooks', sex: 'Male', dob: '1938-01-30', codeStatus: 'DNR', advanceDirective: 'Health care POA: Denise Brooks (daughter)',
    phones: [{ type: 'Home', number: '(708) 555-0154', primary: true }, { type: 'Caregiver', number: '(708) 555-0155' }], address: { line: '1040 Madison St', city: 'Oak Park', state: 'IL', zip: '60302' },
    insurance: { payer: 'Medicare', plan: 'Medicare Part A & B', memberId: '3TW8-QP2-HN41', status: 'Eligible', secondary: 'Illinois Medicaid' },
    pcpId: 'pr-1', weight: 66, height: 172, allergies: [{ substance: 'Aspirin', reaction: 'GI bleed', severity: 'Severe' }],
    riskIndicators: [{ label: 'Fall Risk (High)', level: 'high' }, { label: 'Anticoagulation monitoring', level: 'medium' }, { label: 'SDOH 1.40 (Caregiver strain)', level: 'medium' }],
    programs: [{ name: 'Complex Care', status: 'Active', since: date(-500) }, { name: 'Anticoagulation Clinic', status: 'Active', since: date(-900) }],
    problems: [{ name: 'Alzheimer disease, late onset', code: 'G30.1', status: 'Active', onset: '2021-06-01', priority: 1 }, { name: 'Atrial fibrillation', code: 'I48.91', status: 'Active', onset: '2017-03-01', priority: 2 }, { name: 'Chronic kidney disease, stage 3a', code: 'N18.31', status: 'Active', onset: '2022-01-01', priority: 3 }],
    medications: [{ name: 'warfarin 5 mg oral tablet', sig: '1 tab, Oral, Daily, adjust per INR', status: 'Active', refills: 1, prescriber: 'pr-1', start: date(-900) }, { name: 'donepezil 10 mg oral tablet', sig: '1 tab, Oral, at bedtime', status: 'Active', refills: 3, prescriber: 'pr-1', start: date(-800) }, { name: 'metoprolol succinate 25 mg ER tablet', sig: '1 tab, Oral, Daily', status: 'Active', refills: 2, prescriber: 'pr-3', start: date(-1000) }],
    vitals: [vit(-7, 36.4, 74, 118, 70, 97, 16, 66, 172)],
    results: [lab(-7, 'Coagulation', [['INR', '3.6', '', '2.0-3.0', 'H']]), lab(-7, 'Renal Function', [['Creatinine', '1.5', 'mg/dL', '0.7-1.3', 'H'], ['eGFR', '46', 'mL/min/1.73m2', '>60', 'L']])],
    encounters: [enc(-7, 'Outpatient', 'INR check', 'pr-1'), enc(-35, 'Outpatient', 'INR check', 'pr-1'), enc(-95, 'Emergency', 'Fall at home', 'pr-2', { location: 'Lakeview Medical Center - Emergency' }), enc(-180, 'Outpatient', 'Annual wellness visit', 'pr-1')],
    careTeam: [{ role: 'Primary Care Physician', name: 'Martinez MD, Elena', phone: '(312) 555-0100' }, { role: 'Care Manager', name: 'Blake RN, Jordan', phone: '(312) 555-0180 ext. 4471' }, { role: 'Anticoagulation Pharmacist', name: 'Yoon PharmD, Grace', phone: '(312) 555-0182' }],
    emergencyContact: { name: 'Denise Brooks', relationship: 'Daughter / POA', phone: '(708) 555-0155' },
    activities: [act(-6, '15:10', 'Phone call', 'Outbound', 'INR result / dose change', 'BROOKS, DENISE (Daughter)', 'Yoon PharmD, Grace', 9, 'INR 3.6. Hold warfarin x1 day then 2.5 mg Mon/Fri, 5 mg other days. Recheck 1 week.')],
    flags: ['Speak with POA - patient has dementia'],
    account: { balance: 0, guarantor: 'Samuel Brooks', statements: [] },
  });

  // 9. Priya Natarajan - new patient
  patient({
    id: 'p-1009', mrn: '700109', fin: '304109', firstName: 'Priya', lastName: 'Natarajan', sex: 'Female', dob: '1983-08-09',
    phones: [{ type: 'Mobile', number: '(224) 555-0126', primary: true }], email: 'priya.n@example.com', address: { line: '75 Deerpath Rd', city: 'Lake Forest', state: 'IL', zip: '60045' },
    insurance: { payer: 'BlueCross BlueShield of Illinois', plan: 'HMO Illinois', memberId: 'XOJ551298440', group: 'GRP-10992', status: 'Eligible - referral required' },
    pcpId: 'pr-1', weight: 59, height: 163, allergies: [],
    problems: [{ name: 'Chronic migraine', code: 'G43.709', status: 'Active', onset: '2024-01-01', priority: 1 }],
    medications: [{ name: 'topiramate 25 mg oral tablet', sig: '1 tab, Oral, at bedtime', status: 'Active', refills: 0, prescriber: 'Outside provider', start: date(-60) }],
    encounters: [], careTeam: [{ role: 'Primary Care Physician', name: 'Martinez MD, Elena', phone: '(312) 555-0100' }],
    account: { balance: 0, guarantor: 'Priya Natarajan', statements: [] },
    flags: ['New patient - outside records requested'],
  });

  // 10. Thomas Reed - CKD, hypertension
  patient({
    id: 'p-1010', mrn: '700110', fin: '304110', firstName: 'Thomas', lastName: 'Reed', preferredName: 'Tom', sex: 'Male', dob: '1962-03-14',
    phones: [{ type: 'Mobile', number: '(312) 555-0199', primary: true }], email: 'tom.reed62@example.com', address: { line: '3300 S Halsted St', city: 'Chicago', state: 'IL', zip: '60608' },
    insurance: { payer: 'Self-pay', plan: 'Uninsured - financial assistance pending', memberId: '', status: 'Self-pay' },
    pcpId: 'pr-1', weight: 98, height: 183, allergies: [{ substance: 'ACE inhibitors', reaction: 'Angioedema', severity: 'Severe' }],
    riskIndicators: [{ label: 'SDOH 1.65 (Financial, Insurance)', level: 'high' }, { label: 'CKD progression risk', level: 'medium' }],
    problems: [{ name: 'Chronic kidney disease, stage 3b', code: 'N18.32', status: 'Active', onset: '2021-08-01', priority: 1 }, { name: 'Hypertensive chronic kidney disease', code: 'I12.9', status: 'Active', onset: '2018-01-01', priority: 2 }, { name: 'Gout', code: 'M10.9', status: 'Active', onset: '2016-05-01', priority: 3 }],
    medications: [{ name: 'amLODIPine 10 mg oral tablet', sig: '1 tab, Oral, Daily', status: 'Active', refills: 1, prescriber: 'pr-1', start: date(-500) }, { name: 'losartan 100 mg oral tablet', sig: '1 tab, Oral, Daily', status: 'On hold', refills: 0, prescriber: 'pr-1', start: date(-500) }, { name: 'allopurinol 100 mg oral tablet', sig: '1 tab, Oral, Daily', status: 'Active', refills: 2, prescriber: 'pr-1', start: date(-800) }],
    vitals: [vit(-40, 36.8, 80, 156, 94, 98, 16, 98, 183)],
    results: [lab(-41, 'Renal Function', [['Creatinine', '2.1', 'mg/dL', '0.7-1.3', 'H'], ['eGFR', '35', 'mL/min/1.73m2', '>60', 'L'], ['Potassium', '5.4', 'mmol/L', '3.5-5.1', 'H']]), lab(-41, 'Urine Albumin/Creatinine', [['UACR', '420', 'mg/g', '<30', 'H']])],
    encounters: [enc(-40, 'Outpatient', 'CKD follow-up', 'pr-1'), enc(-200, 'Outpatient', 'Hypertension follow-up', 'pr-1')],
    careTeam: [{ role: 'Primary Care Physician', name: 'Martinez MD, Elena', phone: '(312) 555-0100' }, { role: 'Financial Counselor', name: 'Rivera, Sam', phone: '(312) 555-0183' }],
    account: { balance: 2380.5, guarantor: 'Thomas Reed', lastPayment: null, statements: [{ date: date(-50), amount: 1640.5, status: 'Past due', dueDate: date(-20) }, { date: date(-12), amount: 740, status: 'Due', dueDate: date(18) }], paymentPlan: null, financialAssistance: 'Application received - pending income verification' },
    orders: [{ name: 'Nephrology referral', status: 'Pending - financial clearance', date: date(-40) }],
  });

  // 11. Grace Liu - telehealth behavioral health
  patient({
    id: 'p-1011', mrn: '700111', fin: '304111', firstName: 'Grace', lastName: 'Liu', sex: 'Female', dob: '2001-10-02',
    phones: [{ type: 'Mobile', number: '(872) 555-0105', primary: true }], email: 'grace.liu@example.com', address: { line: '1550 N State Pkwy', city: 'Chicago', state: 'IL', zip: '60610' },
    insurance: { payer: 'Aetna', plan: 'Student Health', memberId: 'W991200871', group: 'GRP-UNIV2', status: 'Eligible' },
    pcpId: 'pr-2', weight: 54, height: 160, allergies: [],
    problems: [{ name: 'Generalized anxiety disorder', code: 'F41.1', status: 'Active', onset: '2023-09-01', priority: 1 }],
    medications: [{ name: 'sertraline 50 mg oral tablet', sig: '1 tab, Oral, Daily', status: 'Active', refills: 2, prescriber: 'pr-2', start: date(-240) }],
    encounters: [enc(-28, 'Outpatient', 'Telehealth follow-up', 'pr-2'), enc(-120, 'Outpatient', 'Telehealth follow-up', 'pr-2')],
    careTeam: [{ role: 'Primary Care Physician', name: 'Hale MD, Marcus', phone: '(312) 555-0101' }, { role: 'Behavioral Health Therapist', name: 'Shah LCSW, Anika', phone: '(312) 555-0184' }],
    account: { balance: 0, guarantor: 'Grace Liu', statements: [] },
  });

  // 12. Harold Jensen - cardiac rehab post MI
  patient({
    id: 'p-1012', mrn: '700112', fin: '304112', firstName: 'Harold', lastName: 'Jensen', preferredName: 'Hal', sex: 'Male', dob: '1955-05-27',
    phones: [{ type: 'Home', number: '(815) 555-0170', primary: true }, { type: 'Mobile', number: '(815) 555-0171' }], email: 'hjensen@example.com', address: { line: '220 W Jefferson St', city: 'Joliet', state: 'IL', zip: '60432' },
    insurance: { payer: 'Medicare', plan: 'Medicare Part A & B', memberId: '5KX2-RT9-WE33', status: 'Eligible', secondary: 'BCBS Medicare Supplement' },
    pcpId: 'pr-1', weight: 86, height: 176, allergies: [{ substance: 'Iodinated contrast', reaction: 'Hives', severity: 'Moderate' }],
    riskIndicators: [{ label: 'Cardiac Risk (18.4%)', level: 'high' }, { label: 'Cardiac rehab adherence', level: 'medium' }],
    programs: [{ name: 'Cardiac Rehabilitation', status: 'Active', since: date(-50) }],
    problems: [{ name: 'Old myocardial infarction', code: 'I25.2', status: 'Active', onset: date(-75), priority: 1 }, { name: 'Coronary artery disease s/p PCI', code: 'I25.10', status: 'Active', onset: date(-75), priority: 2 }, { name: 'Hyperlipidemia', code: 'E78.5', status: 'Active', onset: '2012-01-01', priority: 3 }],
    medications: [{ name: 'aspirin 81 mg delayed release tablet', sig: '1 tab, Oral, Daily', status: 'Active', refills: 0, prescriber: 'pr-3', start: date(-75) }, { name: 'ticagrelor 90 mg oral tablet', sig: '1 tab, Oral, BID', status: 'Active', refills: 4, prescriber: 'pr-3', start: date(-75) }, { name: 'rosuvastatin 40 mg oral tablet', sig: '1 tab, Oral, Daily', status: 'Active', refills: 4, prescriber: 'pr-3', start: date(-75) }, { name: 'metoprolol succinate 50 mg ER tablet', sig: '1 tab, Oral, Daily', status: 'Active', refills: 4, prescriber: 'pr-3', start: date(-75) }],
    vitals: [vit(-10, 36.6, 64, 122, 74, 98, 14, 86, 176)],
    results: [lab(-20, 'Lipid Panel', [['LDL', '64', 'mg/dL', '<70'], ['HDL', '41', 'mg/dL', '>40'], ['Triglycerides', '148', 'mg/dL', '<150']]), lab(-75, 'Troponin I, high sensitivity', [['Troponin I hs', '2840', 'ng/L', '<20', 'H']])],
    encounters: [enc(-77, 'Emergency', 'Chest pain', 'pr-2', { location: 'Lakeview Medical Center - Emergency' }), enc(-77, 'Inpatient', 'NSTEMI, PCI to LAD', 'pr-3', { location: 'Lakeview Heart Institute - CCU', los: 3 }), enc(-60, 'Outpatient', 'Cardiology follow-up', 'pr-3'), enc(-10, 'Outpatient', 'Cardiac rehab session 12', 'pr-3')],
    careTeam: [{ role: 'Cardiologist', name: 'Fischer MD, Naomi', phone: '(312) 555-0102' }, { role: 'Primary Care Physician', name: 'Martinez MD, Elena', phone: '(312) 555-0100' }, { role: 'Care Manager', name: 'Blake RN, Jordan', phone: '(312) 555-0180 ext. 4471' }],
    account: { balance: 320, guarantor: 'Harold Jensen', statements: [{ date: date(-25), amount: 320, status: 'Due', dueDate: date(5) }] },
  });

  // Appointments. Today's schedule for Dr. Martinez (pr-1) plus history/future for others.
  appt('p-1002', 'pr-1', 0, '08:00', 30, 'Follow-up', 'Heart failure / COPD follow-up', 'Arrived', { room: 'Room 5' });
  appt('p-1001', 'pr-1', 0, '08:30', 15, 'Follow-up', 'Diabetes follow-up, A1c review', 'Confirmed', { room: 'Room 2' });
  appt('p-1009', 'pr-1', 0, '09:00', 45, 'New Patient', 'Establish care, chronic migraine', 'Confirmed', { room: 'Room 8' });
  appt('p-1012', 'pr-1', 0, '10:00', 15, 'Follow-up', 'Post-MI primary care follow-up', 'Confirmed', { room: 'Room 3' });
  appt('p-1008', 'pr-1', 0, '10:30', 30, 'Follow-up', 'INR follow-up and memory check', 'Confirmed', { room: 'Room 5' });
  appt('p-1010', 'pr-1', 0, '11:15', 30, 'Follow-up', 'CKD and blood pressure', 'Unconfirmed', { room: 'Room 2' });
  appt('p-1005', 'pr-1', 0, '13:30', 30, 'Wellness', 'Annual wellness visit', 'Confirmed', { room: 'Room 8' });
  appt('p-1011', 'pr-2', 0, '14:00', 20, 'Telehealth', 'Anxiety medication follow-up', 'Confirmed', { visitMode: 'Video' });
  appt('p-1007', 'pr-6', 1, '15:30', 30, 'Follow-up', 'Asthma control check', 'Confirmed');
  appt('p-1003', 'pr-5', 13, '10:00', 30, 'Prenatal', 'Prenatal visit, 26 weeks', 'Confirmed');
  appt('p-1004', 'pr-8', 9, '07:30', 180, 'Surgery', 'Right total knee arthroplasty', 'Scheduled', { notes: 'Arrive 2 hours early. NPO after midnight.' });
  appt('p-1004', 'pr-8', 23, '09:00', 15, 'Post-op', 'Post-op wound check', 'Scheduled');
  appt('p-1002', 'pr-4', 18, '11:00', 30, 'Follow-up', 'Pulmonology follow-up post admission', 'Scheduled');
  appt('p-1002', 'pr-3', 32, '13:00', 30, 'Follow-up', 'Heart failure clinic', 'Scheduled');
  appt('p-1001', 'pr-1', 60, '09:30', 15, 'Follow-up', 'Diabetes follow-up', 'Scheduled');
  appt('p-1008', 'pr-1', 6, '09:00', 15, 'Lab', 'INR recheck', 'Scheduled');
  appt('p-1012', 'pr-3', 20, '10:30', 30, 'Follow-up', 'Cardiology 3-month follow-up', 'Scheduled');
  appt('p-1005', 'pr-7', 40, '14:00', 30, 'Research', 'Study LKV-ONC-221 visit 9', 'Scheduled');
  appt('p-1001', 'pr-1', -30, '09:30', 15, 'Follow-up', 'Diabetes follow-up', 'Completed');
  appt('p-1002', 'pr-1', -9, '10:00', 30, 'Follow-up', 'Transitional care visit', 'Completed');
  appt('p-1006', 'pr-2', -200, '08:30', 30, 'Wellness', 'Annual physical', 'Completed');
  appt('p-1010', 'pr-1', -40, '11:00', 30, 'Follow-up', 'CKD follow-up', 'Completed');
  appt('p-1003', 'pr-5', -14, '10:00', 30, 'Prenatal', 'Prenatal visit, 22 weeks', 'Completed');

  const messages = [
    { id: 'm-1', to: 'u-3', from: 'Nguyen, Taylor', patientId: 'p-1001', subject: 'Refill request: lisinopril 20 mg', body: 'Patient requests 90-day refill sent to Walgreens on Clark St. 0 refills remaining.', date: day(-1, '14:05'), status: 'Unread', priority: 'Normal', type: 'Rx Renewal' },
    { id: 'm-2', to: 'u-3', from: 'Lab Interface', patientId: 'p-1008', subject: 'Abnormal result: INR 3.6', body: 'INR 3.6 (H). Reference 2.0-3.0.', date: day(-7, '12:20'), status: 'Read', priority: 'High', type: 'Result' },
    { id: 'm-3', to: 'u-2', from: 'Discharge Planning', patientId: 'p-1002', subject: 'TOC enrollment: James Whitfield', body: 'Patient discharged from 5 West. Enrolled in Transitions of Care. Please complete 48h call.', date: day(-12, '16:45'), status: 'Read', priority: 'High', type: 'Care Management' },
    { id: 'm-4', to: 'u-2', from: 'Population Health', patientId: 'p-1001', subject: 'Care gap: diabetic eye exam overdue', body: 'Retinal exam referral pending scheduling for 30 days.', date: day(-2, '09:00'), status: 'Unread', priority: 'Normal', type: 'Care Gap' },
    { id: 'm-5', to: 'u-1', from: 'Patient Portal', patientId: 'p-1004', subject: 'Question about surgery arrival time', body: 'What time do I need to arrive for my knee surgery and where do I park?', date: day(0, '07:12'), status: 'Unread', priority: 'Normal', type: 'Patient Message' },
    { id: 'm-6', to: 'u-4', from: 'Billing System', patientId: 'p-1010', subject: 'Statement past due: Thomas Reed', body: 'Balance $1,640.50 past due 20 days. Financial assistance application pending.', date: day(-1, '06:00'), status: 'Unread', priority: 'Normal', type: 'Account' },
  ];

  return { seededOn: date(0), providers, users, patients: P, appointments: A, messages, screenpops: [] };
}

module.exports = { seed };
