# Mock Oracle Health EHR for Genesys Cloud demos

A self-contained web app that looks and behaves like the Oracle Health EHR (the 2024-25 teal "next-gen" EHR, with an optional classic PowerChart view) and exposes the APIs Genesys Cloud needs to screen pop a caller's chart. Every patient, provider and number is fictional (phone numbers use the 555-01xx range). It is not affiliated with or endorsed by Oracle.

No dependencies and no build step: Node 18 or newer runs it.

```
node server.js          # http://localhost:8080
PORT=3000 node server.js
```

## What's in the UI

Sign in by picking a persona (Patient Access Rep, Care Manager, Physician, Patient Financial Services). The bottom tab bar, AI message bar and patient chart layout follow the screenshots in `screenshots/ehr-ui/`.

| Workflow | Where |
|---|---|
| Provider day schedule with AI pre-visit summaries, check-in, mark seen | Schedule (screenshot 01) |
| Patient search by name, MRN, FIN, DOB or phone | Patient Search |
| Patient chart: demographics panel, risk indicators, encounters timeline, AI summary, vitals, problems, medications, results, documents, allergies, visits, care team, activity log, account, histories | Patient chart (screenshots 02, 04) |
| Clinical AI Agent: ask about the open patient (or your schedule) by typing or with the mic | Top "Type a message" bar (screenshot 03) |
| New prescription with frequent-order list and allergy alert; prescription renewal | Medications tab (screenshot 05) |
| Schedule, reschedule, cancel and check in appointments against open slots | Visits tab |
| 3-step registration: patient info with duplicate check, financial responsibility with eligibility check, schedule appointment | Registration (screenshot 09) |
| Take a payment, view statements, coverage and payment plans | Account tab |
| Log contacts, write notes; classic PowerChart care-management view with Check In Prep | Activity Log, Settings > Classic view (screenshot 06) |
| Care management worklist with simulated click-to-dial | Care Worklist |
| Message Center: refill requests, results, care gaps, portal messages | Message Center |
| Genesys call banner: caller number, queue, intent, timer, identity check (DOB), "Log call & wrap up" writes to the Activity Log | Appears on any screen-popped chart |
| Genesys integration page: simulate inbound calls, copy URL templates, see recent pops | Click the "Genesys" chip at the top right |

Data lives in memory. It resets on restart, at midnight in `DEMO_TZ`, or from Settings > Reset demo data. Appointment dates are generated relative to today so the schedule is always current.

## Demo callers

| Number | Patient | Good for |
|---|---|---|
| (312) 555-0142 | Maria Gonzalez | Billing balance, refill, Spanish interpreter |
| (312) 555-0188 | James Whitfield | Recent discharge, care management |
| (312) 555-0131 | Emily and Daniel Kowalski | Two matches on one household phone |
| (847) 555-0163 | Robert Chen | Surgery scheduling, payment plan |
| (312) 555-0199 | Thomas Reed | Past-due balance, self-pay |
| (708) 555-0155 | Samuel Brooks (caregiver line) | Caregiver / POA call |
| anything else | no match | New patient registration |

## How Genesys Cloud screen pops the EHR

There are two patterns. Both are live in the app; use whichever fits the demo.

### A. URL screen pop (simplest)

Genesys opens the EHR at `/pop` with the caller's details in the query string. One match opens the chart on the right tab, several matches show a picker, no match offers registration.

```
https://oracle-health-mock-ehr.onrender.com/pop?phone=<ANI>&conversationId=<id>&queue=<queue>&intent=<intent>&embed=1
```

Other identifiers: `mrn`, `fin`, `patientId`, `lastName` + `dob`. `intent` picks the tab (billing goes to Account, appointment to Visits, refill to Medications, results to Results); `tab=` forces one. `view=classic` shows the PowerChart layout. Unfilled template variables like `{{Call.Ani}}` are ignored rather than breaking the page.

Where to put that URL in Genesys Cloud:

1. **Script with a Web Page component** (agent sees the EHR inside the interaction). In Admin > Scripts, add a Web Page component and set its URL to
   `https://oracle-health-mock-ehr.onrender.com/pop?phone={{Customer phone variable}}&conversationId={{Scripter.Interaction ID}}&queue={{Scripter.Queue Name}}&agent={{Scripter.Agent Email}}&embed=1`
   Insert each variable from the Script editor's variable picker (Scripter.Raw Customer Number does not exist; use the customer phone or ANI variable your org lists). Assign the script to the queue (or use Architect's **Set Screen Pop** action in the inbound call flow). If the IVR or a bot collected an MRN or date of birth, pass it through as participant data and add `&mrn={{MRN}}`.
2. **Interaction Widget integration** (EHR in a side panel). Admin > Integrations > Interaction Widget, Application URL:
   `https://oracle-health-mock-ehr.onrender.com/pop?conversationId={{gcConversationId}}&embed=1`
   The widget only passes the conversation ID, so set `GENESYS_CLIENT_ID`, `GENESYS_CLIENT_SECRET` and `GENESYS_REGION` on the server (an OAuth client-credentials client whose role can read conversations). The server then calls `GET /api/v2/conversations/{id}` to get the caller's number and pops the matching chart.
3. **A plain "Open URL" or browser tab**: any of the URLs above works in a normal tab too.

### B. API push screen pop

The agent keeps the EHR open in its own browser tab. Something in Genesys calls `POST /api/screenpop` with the caller's number and the agent's email; the EHR in that agent's browser pops the chart instantly (Server-Sent Events). Use `"agent": "*"` to pop every open EHR, which is handy for a single-presenter demo.

```
curl -X POST https://oracle-health-mock-ehr.onrender.com/api/screenpop \
  -H "Content-Type: application/json" -H "x-api-key: $API_KEY" \
  -d '{"phone":"tel:+13125550142","agent":"taylor.nguyen@lakeviewhealth.example","conversationId":"abc-123","queue":"Patient Access"}'
```

Ways to trigger it from Genesys Cloud: a data action run from the agent's Script when the interaction loads, a data action in an Architect flow (with `agent` set to `*` or a known agent), or a Process Automation trigger on the agent's conversation events. Each EHR browser listens for the agent email set in Settings (defaults to the persona's email), so set that to the agent's Genesys login email.

### Data actions

`genesys/` contains three Web Services Data Action definitions to import (Admin > Integrations > Actions > Import) under a Web Services Data Actions integration:

| File | Calls | Use |
|---|---|---|
| `lookup-patient-by-phone.json` | `GET /api/patients/lookup` | IVR personalization ("Hi Maria, are you calling about your appointment on..."), routing by language or balance, and getting `popUrl` |
| `push-screen-pop.json` | `POST /api/screenpop` | Pattern B push |
| `log-interaction.json` | `POST /api/patients/{id}/activities` | Write the call outcome back to the chart from a Script or wrap-up flow |

These already point at the hosted demo, https://oracle-health-mock-ehr.onrender.com; change the URL if you host it elsewhere. For the API key, give the integration **User Defined** credentials with a field named `apiKey` (the actions send it as `x-api-key: ${credentials.apiKey}`). If the import format is rejected by your org's version, create the actions by hand: the URL, method, body template and output contract are all readable in the JSON.

Full endpoint list (including FHIR R4 `Patient`, `Appointment`, `AllergyIntolerance`, `Condition` and `MedicationRequest` searches): `/api-docs.html` on the running server.

## Hosting

Genesys embeds pages over HTTPS only, so host it somewhere with a TLS URL. Run **one instance**: data and screen-pop connections are in memory, so a push must land on the same instance the agent's browser is connected to.

| Option | Steps |
|---|---|
| Render.com (free tier works) | In Render, New > Blueprint, connect GitHub and pick `jchadcole/oracle-health-mock-ui`; `render.yaml` sets everything up and auto-deploys on every push to `main`. The URL is `https://oracle-health-mock-ehr.onrender.com` (or similar). Free instances sleep when idle; open the URL a minute before the demo. |
| Google Cloud Run | `gcloud run deploy oracle-health-mock --source . --region us-central1 --allow-unauthenticated --max-instances 1 --set-env-vars DEMO_TZ=America/Chicago,API_KEY=...` |
| Azure Container Apps / App Service, AWS App Runner, Fly.io | Build the included `Dockerfile` (listens on `PORT`, default 8080). Set max replicas to 1. |
| A VM or laptop | `node server.js` behind any HTTPS reverse proxy, or for a quick demo `cloudflared tunnel --url http://localhost:8080` / `ngrok http 8080` to get an HTTPS URL. |

Environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | 8080 | Listen port |
| `DEMO_TZ` | America/Chicago | Time zone for "today" and appointment times |
| `API_KEY` | (none) | When set, required on `/api/screenpop` (POST), `/api/patients/lookup` and `/fhir/*` |
| `FRAME_ANCESTORS` | `*` | CSP `frame-ancestors` value; restrict to your Genesys domains, e.g. `'self' https://*.mypurecloud.com https://*.pure.cloud` |
| `PUBLIC_URL` | (derived from request) | Base URL used in `popUrl` responses |
| `GENESYS_REGION` | mypurecloud.com | Genesys Cloud region domain, e.g. `usw2.pure.cloud`, `mypurecloud.ie` |
| `GENESYS_CLIENT_ID`, `GENESYS_CLIENT_SECRET` | (none) | Optional client-credentials OAuth client for the Interaction Widget conversation lookup |
| `RESET_DAILY` | true | Set `false` to keep changes across midnight |

## Files

```
server.js            HTTP server, REST + FHIR + screen-pop APIs, static files
lib/seed.js          fictional patients, providers, appointments, messages
lib/fhir.js          FHIR R4 mappers
public/index.html    the EHR single-page app (public/js/app.js, public/js/ai.js, public/css/app.css)
public/api-docs.html API reference
genesys/*.json       Genesys Cloud data action definitions
Dockerfile, render.yaml
```

The look is modelled on Oracle's public product screenshots for an internal demo. Don't use Oracle's name or logo on anything public without permission.

## Preview

Screenshots of the running app are in `docs/preview/` (schedule, chart, billing-call screen pop, multiple-match picker, classic PowerChart view, prescription allergy alert, registration, Genesys page, and the app embedded in an iframe the way a Genesys Script shows it).
