# CareFlow — Unified Healthcare Operating & Journey Coordination Platform

[![Python](https://img.shields.io/badge/Python-3.14-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.142-teal.svg)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15.1_App_Router-black.svg)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev)
[![ABDM](https://img.shields.io/badge/Standards-NRCeS_HL7®_FHIR®_R4-emerald.svg)](https://nrces.in)
[![DPDP](https://img.shields.io/badge/Privacy-DPDP_Act_2023_Compliant-indigo.svg)](https://meity.gov.in)

> **CareFlow** is an end-to-end healthcare operating platform that bridges the fragmented patient journey across multiple hospitals, outpatient departments, diagnostic laboratories, and independent clinicians.

---

## 1. What CareFlow Solves (The Core Differentiator)

Traditional healthcare interactions are deeply fragmented:
1. Patients book appointments manually, wait in blind physical reception queues, carry paper folders, repeat medical histories, and retrieve paper laboratory slips independently.
2. Doctors face high cognitive load without synthesized clinical context, manually writing paper prescriptions prone to forgery.
3. Healthcare networks cannot coordinate care across hospitals without violating patient privacy or national regulations.

**CareFlow unifies the entire continuum into a single connected Care Journey:**

```
Discovery
  ↓
Smart Slot Booking
  ↓
Contactless QR Check-In
  ↓
Adaptive EWMA Live Queue
  ↓
Clinical Encounter (SOAP + Assistive AI Brief)
  ↓
Cryptographic HMAC-SHA256 Digital Prescription
  ↓
Diagnostic Lab Specimen Barcode & SHA-256 Report Seal
  ↓
Continuous Care Journey Timeline
  ↓
DPDP Act 2023 Sovereign Consent Sharing
```

---

## 2. Key Architectural Pillars

### A. Adaptive EWMA Live Queue
Replaces static slot guesses with dynamic pacing using Exponentially Weighted Moving Average (EWMA):
$$\text{EWT}_i = i \times \text{EWMA}_{\text{consult}} + \max(0, \Delta t_{\text{overrun}})$$
Updates patients, doctor cabins, and hospital waiting lobby screens in sub-second latency via WebSockets.

### B. DPDP Act 2023 Consent Guard
Patient-first sovereign control aligned with Indian NRCeS HL7® FHIR® R4 profiles:
- Purpose-limited, time-bound consent requests (e.g. *Second Opinion Cardiology Review*).
- 1-click instant approval, denial, and immutable revocation with zero-retention enforcement.
- Tamper-evident access audit log recording accessor identity, timestamp, and inspected record types.

### C. Cryptographic HMAC-SHA256 Digital Prescriptions
Every prescription issued by a verified physician is sealed with an immutable cryptographic digital signature. Pharmacies and patients can verify prescription authenticity via public QR code / URL (`/verify/rx/{code}`) without risking prescription tampering.

### D. Assistive Pre-Visit AI Briefing (100% Local Ollama / LLaMA 3)
Powered by local Ollama running directly in the terminal (defaulting to `llama3` or `mistral`) via standard local HTTP endpoints (`http://localhost:11434/api/generate`):
- 100% local, zero data egress, zero cloud API fees, and fully sovereign clinical data protection aligned with DPDP Act 2023.
- Synthesizes prior hospital encounters, active medications, and abnormal lab markers into a 3-bullet clinical brief in under 3 seconds.
- **Strictly Assistive**: Enforces mandatory clinical review disclaimers—never autonomously diagnoses or prescribes.
- Equipped with a zero-latency deterministic local fallback engine ensuring 100% demo reliability even when Ollama is offline.

---

## 3. Quick Start Guide

### Prerequisites
- Python 3.11+ (Python 3.14 recommended)
- Node.js 18+ & npm
- [Ollama](https://ollama.com) (for 100% local LLM inference)
- SQLite (included) or PostgreSQL

### A. Start Local Ollama (Terminal 1)

```bash
# Launch Ollama with LLaMA 3
ollama run llama3
```
*Ollama will listen on `http://localhost:11434`. CareFlow's backend will automatically detect and connect to it.*

### B. Start the Backend API (FastAPI - Terminal 2)

```bash
# 1. Activate the Python virtual environment
source backend/venv/bin/activate

# 2. Seed database with rich multi-hospital demo scenario (if not already seeded)
PYTHONPATH=. python scripts/seed_demo_data.py

# 3. Start the FastAPI server with live WebSockets
PYTHONPATH=. uvicorn backend.app.main:app --port 8000 --reload
```

- Backend API: `http://localhost:8000`
- Swagger OpenAPI Docs: `http://localhost:8000/api/v1/docs`
- Health Check: `http://localhost:8000/health`

### C. Start the Frontend (Next.js 15 - Terminal 3)

In a separate terminal:

```bash
cd frontend

# Run development server
npm run dev
```

- Frontend Application: `http://localhost:3000`

---

## 4. Default Demo Personas & Credentials

All test accounts share the demo password: **`password123`**

| Role | Persona | Email / Identifier | Purpose |
| :--- | :--- | :--- | :--- |
| **Patient** | Rahul Verma | `rahul@patient.com` / `9876543210` | Lead patient with active cardiology visit, queue ticket `CARD-A14`, ABHA profile, and care journey. |
| **Doctor (Cardiology)** | Dr. Ananya Sharma | `dr.ananya@citycare.com` | Primary clinician in Room 204. Live queue, AI brief, SOAP notes, HMAC prescription signing. |
| **Doctor (Second Opinion)** | Dr. Sunita Mehta | `dr.mehta@apexheart.com` | External physician at Apex Heart Institute requesting DPDP cross-hospital record access. |
| **Lab Technician** | Amit Desai | `lab@citycare.com` | Pathology technologist. Specimen barcode collection, abnormal flag detection, SHA-256 report seal. |
| **Hospital Administrator** | Suresh Menon | `admin@citycare.com` | Hospital Ops. Big-screen waiting lobby board, EWMA throughput metrics, queue simulation. |

> **Pro-Tip**: Use the **Persona Switcher** in the top navigation bar to seamlessly switch between roles with 1 click.

---

## 5. 60-Second Judge Walkthrough Script

CareFlow includes a **3-Screen Live Judge Demo Cockpit** accessible directly at:
👉 **`http://localhost:3000/demo`**

This cockpit displays **Patient Mobile App**, **Doctor Clinical Cockpit**, and **Hospital Waiting Hall TV Display** side-by-side in real-time:

1. **Step 1: Patient Contactless Check-In**
   - Click `1. Smart Check-In`.
   - Token **`CARD-A14`** is assigned to Rahul Verma with an estimated wait time of 14 minutes.
   - The token appears synchronously on the Patient Phone and the Hospital Lobby Waiting Screen.

2. **Step 2: Doctor Calls Next Patient**
   - Click `2. Doctor Calls Patient`.
   - Dr. Sharma's cockpit calls the patient.
   - Patient phone rings with a live alert: *"You are being called! Proceed to Room 204"*.
   - Hospital Waiting Display board updates with an audio/visual chime: *"Now Serving CARD-A14 -> Room 204"*.

3. **Step 3: Assistive AI Brief & Digital Rx Signature**
   - Observe the **Assistive AI Pre-Visit Brief** summarizing Rahul's history, active medications, and elevated LDL cholesterol (148 mg/dL).
   - Click `3. Sign Digital Rx`.
   - The clinical encounter completes and generates an immutable **HMAC-SHA256** cryptographic signature.
   - The prescription appears on the Patient's phone with a direct link to verify authenticity in the public registry.

4. **Step 4: Diagnostic Lab Report Verification**
   - Click `4. Verify Lab Report`.
   - The central pathology lab verifies the Lipid Profile panel, detects abnormal flags, and seals the document with a **SHA-256** hash.
   - The Care Journey timeline updates with the final test results.

---

## 6. Project Architecture & Directory Map

```
hacathon1/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py                    # JWT authentication & RBAC dependency injection
│   │   │   └── v1/
│   │   │       ├── api.py                 # Core API v1 route aggregator
│   │   │       └── endpoints/             # 37 REST API routes
│   │   │           ├── auth.py            # ABHA & multi-role authentication
│   │   │           ├── discovery.py       # Doctor, hospital & real-time slot generation
│   │   │           ├── appointments.py    # Concurrency-safe slot booking
│   │   │           ├── queue.py           # QR check-in & EWMA live queue roster
│   │   │           ├── clinical.py        # SOAP notes & HMAC cryptographic Rx sealing
│   │   │           ├── lab.py             # Specimen tracking & SHA-256 report verification
│   │   │           ├── journey.py         # Longitudinal Care Journey timeline
│   │   │           ├── consent.py         # DPDP Act 2023 consent request, grant & audit
│   │   │           ├── ai.py              # Assistive Pre-Visit Briefing (Local Ollama / LLaMA 3)
│   │   │           └── admin.py           # Hospital analytics & queue step simulator
│   │   ├── core/
│   │   │   ├── config.py                  # Pydantic v2 settings & environment variables
│   │   │   ├── database.py                # Async SQLAlchemy 2.0 session factory
│   │   │   ├── security.py                # Argon2id password hashing & JWT tokens
│   │   │   └── websocket_manager.py       # Pub/Sub room-based WebSocket manager
│   │   ├── models/                        # 18 Relational database models
│   │   └── services/                      # Domain logic services
│   └── venv/                              # Virtual environment
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                   # Enterprise landing page
│   │   │   ├── demo/page.tsx              # 3-Screen Synchronized Judge Demo Cockpit
│   │   │   ├── patient/
│   │   │   │   ├── dashboard/page.tsx     # Active visit card & Care Journey navigator
│   │   │   │   ├── discover/page.tsx      # Doctor search & real-time slot booking
│   │   │   │   ├── appointments/[id]/checkin/page.tsx # QR check-in & live token card
│   │   │   │   ├── journey/page.tsx       # Interactive vertical Care Journey timeline
│   │   │   │   └── consent/page.tsx       # DPDP Act 2023 Consent Manager & audit log
│   │   │   ├── doctor/cockpit/page.tsx    # High-density Doctor Clinical Cockpit
│   │   │   ├── lab/page.tsx               # Diagnostic Laboratory Workbench
│   │   │   ├── hospital/operations/page.tsx # Big-Screen OPD Waiting Board & Metrics
│   │   │   └── verify/rx/[code]/page.tsx  # Public Cryptographic Rx Verification Portal
│   │   ├── components/
│   │   │   └── Navbar.tsx                 # Sticky navigation with 1-click persona switcher
│   │   └── lib/
│   │       ├── api.ts                     # Typed API client with auto-token injection
│   │       └── ws.ts                      # Resilient auto-reconnecting WebSocket client
├── docs/
│   └── CAREFLOW_MASTER_ARCHITECTURE.md    # 18-section architectural blueprint & ER diagrams
└── scripts/
    └── seed_demo_data.py                  # Comprehensive realistic database seeder
```

---

## 7. Standards Compliance & Legal Frameworks

- **NRCeS HL7® FHIR® R4**: Encounters, Observations, and Conditions mapped to Indian health profiles.
- **Digital Personal Data Protection (DPDP) Act 2023**: Purpose limitation, notice requirements, time-bound consent, right to withdraw, and zero-trust audit trail.
- **Ayushman Bharat Digital Mission (ABDM)**: Native support for ABHA (Ayushman Bharat Health Account), HPR (Healthcare Professionals Registry), and HFR (Health Facility Registry).
- **ISO 27001 / HIPAA Best Practices**: Cryptographic salt-keyed HMAC verification, Argon2id password hashing, and encrypted-at-rest token management.

---

## 8. License & Team

Built for the Healthcare Technology Innovation Hackathon. Architecture and codebase engineered for direct real-world commercial evolution.
