'use strict';
// Minimal FHIR R4 mappers so integrations can be built against FHIR-shaped payloads.
// Identifier systems mimic the Millennium style but are fictional.

const MRN_SYSTEM = 'urn:oid:2.16.840.1.113883.6.1000.mock.mrn';
const digits = (s) => String(s || '').replace(/\D/g, '');

function bundle(base, resources) {
  return {
    resourceType: 'Bundle', type: 'searchset', total: resources.length,
    link: [{ relation: 'self', url: `${base}/fhir/r4` }],
    entry: resources.map((r) => ({ fullUrl: `${base}/fhir/r4/${r.resourceType}/${r.id}`, resource: r, search: { mode: 'match' } })),
  };
}

function patient(p, base) {
  return {
    resourceType: 'Patient', id: p.id,
    meta: { lastUpdated: new Date().toISOString() },
    identifier: [
      { use: 'usual', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR' }], text: 'MRN' }, system: MRN_SYSTEM, value: p.mrn },
      ...(p.insurance?.memberId ? [{ use: 'secondary', type: { text: 'Member ID' }, value: p.insurance.memberId }] : []),
    ],
    active: true,
    name: [{ use: 'official', text: `${p.firstName} ${p.lastName}`, family: p.lastName, given: [p.firstName] }, ...(p.preferredName !== p.firstName ? [{ use: 'nickname', given: [p.preferredName] }] : [])],
    telecom: [
      ...p.phones.map((ph, i) => ({ system: 'phone', value: ph.number, use: /mobile/i.test(ph.type) ? 'mobile' : /work/i.test(ph.type) ? 'work' : 'home', rank: ph.primary ? 1 : i + 2 })),
      ...(p.email ? [{ system: 'email', value: p.email }] : []),
    ],
    gender: ({ Female: 'female', Male: 'male' })[p.sex] || 'unknown',
    birthDate: p.dob,
    address: p.address?.line ? [{ use: 'home', line: [p.address.line], city: p.address.city, state: p.address.state, postalCode: p.address.zip, country: 'USA' }] : [],
    communication: [{ language: { text: p.language }, preferred: true }],
    generalPractitioner: p.pcpId ? [{ reference: `Practitioner/${p.pcpId}` }] : [],
    extension: [{ url: `${base}/fhir/StructureDefinition/mock-ehr-link`, valueUrl: `${base}/pop?patientId=${p.id}` }],
  };
}

function appointment(a) {
  const end = new Date(`${a.start}Z`); end.setUTCMinutes(end.getUTCMinutes() + a.durationMin);
  const status = { Confirmed: 'booked', Scheduled: 'booked', Unconfirmed: 'proposed', Arrived: 'arrived', 'Checked In': 'checked-in', Completed: 'fulfilled', Cancelled: 'cancelled', 'No Show': 'noshow' }[a.status] || 'booked';
  return {
    resourceType: 'Appointment', id: a.id, status,
    serviceType: [{ text: a.type }], reasonCode: [{ text: a.reason }],
    start: a.start, end: end.toISOString().slice(0, 19), minutesDuration: a.durationMin,
    participant: [
      { actor: { reference: `Patient/${a.patientId}`, display: a.patientName }, status: 'accepted' },
      { actor: { reference: `Practitioner/${a.providerId}`, display: a.providerName }, status: 'accepted' },
      { actor: { display: a.location }, status: 'accepted' },
    ],
  };
}

const allergies = (p) => p.allergies.map((x, i) => ({ resourceType: 'AllergyIntolerance', id: `${p.id}-al${i}`, clinicalStatus: { text: 'Active' }, code: { text: x.substance }, criticality: x.severity === 'Severe' ? 'high' : 'low', patient: { reference: `Patient/${p.id}` }, reaction: [{ manifestation: [{ text: x.reaction }], severity: (x.severity || '').toLowerCase() }] }));
const conditions = (p) => p.problems.map((x, i) => ({ resourceType: 'Condition', id: `${p.id}-cn${i}`, clinicalStatus: { text: x.status }, code: { coding: [{ system: 'http://hl7.org/fhir/sid/icd-10-cm', code: x.code, display: x.name }], text: x.name }, subject: { reference: `Patient/${p.id}` }, onsetDateTime: x.onset }));
const medications = (p) => p.medications.map((x, i) => ({ resourceType: 'MedicationRequest', id: `${p.id}-mr${i}`, status: x.status === 'Active' ? 'active' : x.status === 'On hold' ? 'on-hold' : 'completed', intent: 'order', medicationCodeableConcept: { text: x.name }, subject: { reference: `Patient/${p.id}` }, authoredOn: x.start, dosageInstruction: [{ text: x.sig }], dispenseRequest: { numberOfRepeatsAllowed: x.refills } }));

function capability(base) {
  return {
    resourceType: 'CapabilityStatement', status: 'active', kind: 'instance', fhirVersion: '4.0.1', format: ['json'],
    software: { name: 'Mock Oracle Health EHR (demo)', version: '1.0.0' }, implementation: { description: 'Fictional demo data only', url: `${base}/fhir/r4` },
    rest: [{ mode: 'server', resource: [
      { type: 'Patient', interaction: [{ code: 'read' }, { code: 'search-type' }], searchParam: ['identifier', 'phone', 'telecom', 'family', 'given', 'birthdate', 'name'].map((n) => ({ name: n, type: 'string' })) },
      { type: 'Appointment', interaction: [{ code: 'search-type' }], searchParam: [{ name: 'patient', type: 'reference' }] },
      { type: 'AllergyIntolerance', interaction: [{ code: 'search-type' }], searchParam: [{ name: 'patient', type: 'reference' }] },
      { type: 'Condition', interaction: [{ code: 'search-type' }], searchParam: [{ name: 'patient', type: 'reference' }] },
      { type: 'MedicationRequest', interaction: [{ code: 'search-type' }], searchParam: [{ name: 'patient', type: 'reference' }] },
    ] }],
  };
}

module.exports = { bundle, patient, appointment, allergies, conditions, medications, capability, digits };
