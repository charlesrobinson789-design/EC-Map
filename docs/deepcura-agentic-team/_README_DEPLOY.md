# EC Map AI Agentic Team - Deploy README & Index

A full-stack, 12-agent team that runs the EC Map concierge practice inside **DeepCura** - HIPAA-safe, concierge-grade UX, and cost-controlled by design. Each file is a copy-paste system prompt plus a runbook.

**Built for:** Charles Robinson, MSN, PMHNP-BC - The Executive Capacity Map - v1 (2026-05-28)

## Read in this order

1. **`00_MASTER_Orchestration_and_Standards.md`** - the governing document. Team roster, client-journey state machine, the 10 HIPAA-UX principles, the cost-control framework, model-routing matrix, the Handoff Packet schema, escalation hierarchy. **Read this first; it overrides individual files on conflict.**
2. **`A_Safety_Escalation_Sentinel.md`** + **`B_Compliance_QA_Auditor.md`** - the two cross-cutting agents that protect everything. **Deploy these first.**
3. **`00_Concierge_Director_Orchestrator.md`** - the router/team-lead.
4. **`01`-`09`** - the journey agents, in order.

## File index

| File | Agent | Tier | Job |
|---|---|---|---|
| `00_MASTER_Orchestration_and_Standards.md` | - | - | Governing standards (read first) |
| `A_Safety_Escalation_Sentinel.md` | Safety Sentinel | STANDARD | Crisis detection -> resources -> human (interrupt priority) |
| `B_Compliance_QA_Auditor.md` | Compliance Auditor | LITE->STD | Gate every client-facing send |
| `00_Concierge_Director_Orchestrator.md` | Director | LITE | Route every inbound, enforce budget |
| `01_Front_Desk_Inquiry_Agent.md` | Front Desk | LITE | First contact, FAQ, qualify (no PHI) |
| `02_Eligibility_Triage_Agent.md` | Triage | LITE->STD | Fit, tier, safety pre-screen |
| `03_Consent_Onboarding_Agent.md` | Consent | LITE | NPP + Authorization + secure channel |
| `04_Scheduling_Coordination_Agent.md` | Scheduling | LITE | Book, remind, reschedule (PHI-free) |
| `05_Assessment_Administration_Agent.md` | Assessment | LITE | Deliver the 97-item form (no interpretation) |
| `06_Scoring_Report_Generation_Agent.md` | Report | **DEEP** | Compute indices (deterministic) + draft report |
| `07_Care_Navigation_ServiceMatching_Agent.md` | Navigation | STANDARD | Deliver report, match pathways, warm referrals |
| `08_Followup_Progress_Tracking_Agent.md` | Follow-up | LITE->STD | Check-ins, progress tracker, Tier-3 email window |
| `09_Billing_Tier_Management_Agent.md` | Billing | LITE | Cash-pay, upgrades, superbills |

## The journey at a glance

```text
INQUIRY(01) -> QUALIFY(01) -> TRIAGE(02) -> CONSENT(03) -> SCHEDULE(04) -> ASSESS(05)
   -> SCORE/REPORT(06 -> Charlie signs) -> NAVIGATE(07) -> FOLLOW-UP(08)
BILLING(09) attaches at consent + any upgrade.
SAFETY(A) listens on every state. COMPLIANCE(B) gates every client-facing send.
```

## Deploy in DeepCura - step by step

1. **Confirm BAA + secure channels** (blockers below) before any agent touches PHI.
2. **Load standing context once:** in DeepCura's setup (Emily), set specialty = "non-prescribing functional assessment / psychiatric NP" and paste section 3 (product facts) and section 4 (voice rules) from the master file as the practice's cached standing context - every agent inherits it (cost rule section 6.4).
3. **Stand up A and B first**, then `00` Director, then `01`->`09`.
4. **Paste each agent's `COPY-PASTE SYSTEM PROMPT`** block into its DeepCura task/template.
5. **Set the model tier** per agent (master section 6.1 matrix).
6. **Set tool-call + turn caps** per agent (master section 6.3).
7. **Wire the Handoff Packet** (master section 7) as the shared state agents read/write.
8. **Test the two hard rails** before go-live (below).

## Two tests you must pass before go-live

- **Safety path:** plant a safety-positive answer in a test assessment -> confirm Sentinel (A) interrupts, posts the resource block, and fires the human handoff. See `EC_Map_v2_safety_emails.md` for the existing safety-comms language.
- **No-PHI-before-consent:** try to volunteer symptoms at the Front Desk (01) -> confirm the system moves you to a secure channel instead of recording it.

## Pre-go-live blockers (from project state 2026-05-12 - verify current)

- **PHI inbox** (Hushmail-for-Healthcare ~$12/mo or Paubox) - not yet purchased. Required before 03/06/07 handle PHI.
- **HIPAATizer 97-item form** - must be built in their UI (no API for form creation). Required for 05. Spec: `EC_Map_v2_form_spec.json`.
- **NPP + Authorization** templates - pending attorney review. Required before 03 goes live. Drafts: `EC_Map_v2_NPP_template.md`, `EC_Map_v2_authorization_template.md`.
- **DeepCura BAA** - confirm it is executed for this practice.
- **Scoring spec** for the four indices - the deterministic formulas Agent 06 calls. Confirm where these live (`ECM_Master_Architecture_v1.md` / scoring spec) before 06 goes live.

Until these clear, run `01`, `02`, `04` (non-PHI parts), and design/test of `A`, `B`, `06` in **sandbox only**.

## Cost-control cheat sheet

| Lever | Rule | Where |
|---|---|---|
| **Model routing** | Default LITE; STANDARD for prose-with-judgment; **DEEP only for the report narrative (06)** | Master section 6.1 |
| **Deterministic math** | The 4 indices are arithmetic - computed in code, never by an LLM | Master sections 6.2, Agent 06 |
| **Tool-call budgets** | Hard caps per agent; hit the cap -> human, do not loop | Master section 6.3 |
| **Context discipline** | Cache static context; never load the 97-item bank into a chat; section-scoped drafting | Master section 6.4 |
| **Single pass** | One correct output; only 06 gets one revision; never regenerate a signed report | Master section 6.5 |
| **Escalate, do not loop** | Two failed attempts -> human | Master section 6.5 |
| **Telemetry** | Watch avg tool-calls/turn, % DEEP, % human, re-draft rate monthly | Master section 6.6 |

**The core idea:** every agent does the cheapest correct thing once. The whole team runs LITE/STANDARD so the budget exists for the one DEEP step that is the paid deliverable (the report). The single highest-leverage rule is **section 6.2 - do the index math in code, not in the model.**

## Non-negotiables

1. **No PHI before consent** + a BAA channel.
2. **AI drafts clinical content; only Charlie signs and releases it** (the report, especially).
3. **Functional profile, not a diagnosis** - hedged language only, no diagnostic labels client-facing.
4. **Charlie does not prescribe in this practice** - agents refer, never promise medication/HRT.
5. **Safety always wins** - Sentinel (A) can interrupt any agent at any stage.
6. **Every client-facing send passes the Auditor (B).**