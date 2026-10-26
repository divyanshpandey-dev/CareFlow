# CareFlow Super Admin Control Center — Operational Runbook & System Specification

## 1. Executive Mission & Security Architecture

The **CareFlow Super Admin Control Center** is a zero-trust healthcare network command interface designed for platform administrators, chief medical officers, and hospital compliance directors. It transforms raw distributed telemetry across hospital nodes into actionable intelligence.

### Zero-Trust Access Model
Administrative privileges are governed strictly on the server side:
1. **Database Role Assertion:** User record must have `role == "SUPER_ADMIN"` and `is_active == True`.
2. **Server-Side Allowlist Enforcement:** User email is trimmed, lowercased, and verified against the immutable server configuration `SUPER_ADMIN_EMAILS`. No client claims, tokens, or URL query parameters are trusted.
3. **No Web-UI Configuration Rewriting:** Runtime web endpoints cannot modify `.env`, server secrets, or server allowlists. Allowlist modifications require GitOps / environment deployment.
4. **Suspension & Demotion Barriers:** The platform prevents suspending an active Super Admin from within the portal and blocks demoting the final active Super Administrator.
5. **Session Revocation on State Change:** Any account suspension or revocation immediately invalidates active bearer tokens across all devices.

---

## 2. Command Center Information Hierarchy

The Super Admin Dashboard (`/admin`) follows a prioritized 6-tier cognitive layout:
```
┌────────────────────────────────────────────────────────────┐
│ 1. REAL SYSTEM HEALTH MATRIX                               │
│    • Backend API (Pings / Latency)                         │
│    • Database Probe (Live SQL latency probe)               │
│    • WebSocket Live Subscriptions (Active socket count)    │
│    • AI Clinical Scribe Gateway (Gemini 2.5 Flash status)  │
├────────────────────────────────────────────────────────────┤
│ 2. CRITICAL ALERTS BANNER                                  │
│    Real-time warnings, degraded subsystems, or breaches    │
├────────────────────────────────────────────────────────────┤
│ 3. SIGNATURE ACTION CENTER                                 │
│    High/Medium/Low priority triage:                        │
│    • Pending doctor registrations                          │
│    • Hospital status alerts                                │
│    • Security anomalies / excessive login failures         │
│    • Critical lab reports awaiting physician verification  │
├────────────────────────────────────────────────────────────┤
│ 4. KEY OPERATIONAL METRICS                                 │
│    Today's Appointments, Checked-In, Waiting, In-Consult,  │
│    Prescriptions Issued, Active Doctors                    │
├────────────────────────────────────────────────────────────┤
│ 5. OPERATIONAL TRENDS & QUEUE VELOCITY                     │
│    Visual throughput status + Live Queue Simulation button │
├────────────────────────────────────────────────────────────┤
│ 6. RECENT AUDIT ACTIVITY FEED                              │
│    Tamper-evident log stream with user, action, timestamp  │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Clinical Safety & Quantitative Lab Reference Ranges

Clinical laboratory verification uses deterministic reference ranges (`backend/app/services/lab_evaluation_service.py`) rather than open-ended LLM heuristics for acute biomarkers:

| Biomarker | Specimen | Normal Range | Abnormal | Critical Panic Threshold |
| :--- | :--- | :--- | :--- | :--- |
| **Cardiac Troponin I** | Plasma/Serum | $< 0.04$ ng/mL | $\ge 0.04$ ng/mL | $\ge 0.40$ ng/mL |
| **Serum Potassium ($K^+$)** | Serum | $3.5 - 5.1$ mmol/L | $<3.5$ or $>5.1$ | $< 2.8$ or $\ge 6.2$ mmol/L |
| **Serum Glucose (Fasting)** | Plasma | $70 - 99$ mg/dL | $100 - 199$ mg/dL | $< 50$ or $\ge 300$ mg/dL |
| **Platelet Count** | Whole Blood | $150 - 450 \times 10^3/\mu\text{L}$ | $<150$ or $>450$ | $< 50 \times 10^3/\mu\text{L}$ |
| **Serum Creatinine** | Serum | $0.7 - 1.3$ mg/dL | $> 1.3$ mg/dL | $\ge 3.0$ mg/dL |
| **HbA1c** | Whole Blood | $< 5.7\%$ | $5.7 - 6.4\%$ (Pre-diabetic) | $\ge 6.5\%$ (Diabetic), $\ge 10.0\%$ (Severe) |

Whenever a lab result violates panic thresholds, the evaluation engine automatically tags the record with `CRITICAL_PANIC_VALUE` and notifies attending clinicians.

---

## 4. Audited Emergency Queue Fast-Track Override

In urgent clinical scenarios (acute coronary syndrome, respiratory distress, trauma triage), clinicians or triage supervisors can bypass normal queue order via `POST /api/v1/queue/emergency-override`:
- **Mandatory Justification:** The caller must provide a `clinical_reason` (minimum 8 characters). Unjustified overrides are rejected with `HTTP 400 Bad Request`.
- **Indelible Audit Log:** Every emergency override creates an audit record capturing the clinician ID, patient token, priority change, and timestamp.
- **WebSocket Broadcast:** The updated queue state is broadcast to waiting room displays and doctor cockpits instantly.

---

## 5. Global Command Palette (`Ctrl + K`)

The command palette provides instantaneous search across the entire national network:
- Grouped results: **Doctors**, **Hospitals**, **Users**, and **Platform Features**.
- Hotkeys: `Ctrl + K` or `Cmd + K` to open; arrow keys to navigate; `Enter` to open target; `Escape` to dismiss.

---

## 6. Interactive Presenter Guided Tour (`/demo`)

Accessible at `/demo`, this interactive presentation mode features:
- **11 Curated Workflow Milestones:**
  1. Super Admin Mission Control (`/admin`)
  2. Action Center & Live Triage (`/admin`)
  3. Real-Time System Health Probes (`/admin/system-health`)
  4. Security Center & Active Sessions (`/admin/security`)
  5. AI Governance & Decision Trace (`/admin/ai-governance`)
  6. Patient Discovery & Smart Booking (`/patient/discovery`)
  7. Digital QR Check-In & Queue Token (`/patient/checkin`)
  8. Waiting Room Live Display (`/display/waiting-room`)
  9. Doctor Cockpit & AI Clinical Scribe (`/doctor/cockpit`)
  10. Deterministic Lab Verification (`/doctor/cockpit`)
  11. Tamper-Evident Rx & Consent Verification (`/verify/rx/CF-SAMPLE-101`)
- **Docked Presenter HUD:** Sticky bottom overlay with 2-minute countdown timer, talking points script, route quick-links, and keyboard navigation (`←`, `→`, `Space`, `Esc`).

---

## 7. Development vs. Production Configuration

| Parameter | Development (`.env`) | Production Environment |
| :--- | :--- | :--- |
| `DEMO_MODE` / `NEXT_PUBLIC_DEMO_MODE` | `true` (enables Quick-Fill login buttons) | `false` (Quick-fill disabled, zero credential leaks) |
| `SUPER_ADMIN_EMAILS` | `edure6377@gmail.com,superadmin@careflow.com` | Verified enterprise administrator emails |
| `DATABASE_URL` | Local PostgreSQL instance | High-availability PostgreSQL cluster |
| `JWT_SECRET_KEY` | Development key | 256-bit cryptographically random secret |
| `HMAC_SECRET_KEY` | Development HMAC key | Secure vault-managed signing key |
