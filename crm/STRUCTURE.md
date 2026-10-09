# CRM structure

How the EC Map CRM is organized, and the rules that keep it clean as it grows. The structure lives in `blueprint/ecmap.json` and is applied with `blueprint/apply.py`; this document explains it.

## 1. How the pieces fit

```
Website form ──► /api/subscribe ──► confirmation email ──► /confirm-subscription page
   (tags + list)        (double opt-in)                         │
                                                                ▼
                                       Contact created with tags, subscribed to an email list
                                                                │
                                   Segments (tag rules) ◄───────┘
                                                                │
                                   Sequences enroll by segment ─┴─► timed emails (stop on reply)
                                                                │
                         You (or n8n) move real conversations into a Deal in a Pipeline
```

| Object | What it is | Who owns it |
|---|---|---|
| **Contact** | A person, keyed by email. Carries tags, source, consent state. | Created by forms, imports, or you |
| **Account** | An organization (employer, practice, program) | You, for B2B |
| **Email list** (email group) | A consent list someone opted into | Blueprint |
| **Tag** | A structured label on a contact (see taxonomy) | Forms set them; you add more |
| **Segment** | A saved rule set over tags, recalculated automatically | Blueprint (routing) or you (ad-hoc) |
| **Sequence** | Timed emails that segment members are enrolled in | Blueprint |
| **Email template** | Subject + body (Liquid) used by sequences and system emails | Blueprint creates; you edit copy |
| **Pipeline / stage** | The sales process a Deal moves through | Blueprint |
| **Deal** | One revenue opportunity, linked to contacts and optionally an account | You (or n8n) |

## 2. Tag taxonomy

Tags are how everything routes, so they follow strict rules:

- Format: `namespace:value`, lowercase, hyphens between words (`lead-magnet:capacity-checklist`).
- Only the namespaces below. Add a value by adding it to the blueprint and this table.
- **Never** a clinical tag: no diagnoses, symptoms, medications, assessment scores or results. "ADHD" or "perimenopause" interest is expressed as `interest:workshop`, never as a condition on the person.

| Namespace | Meaning | Values in use |
|---|---|---|
| `source:` | Where the contact first came from | `website`, `warm-list`, `referral`, `workshop`, `linkedin` |
| `lead-magnet:` | Which free resource they requested | `capacity-checklist` |
| `interest:` | What they raised a hand for | `partnership`, `workshop`, `pilot` |
| `icp:` | Which customer profile they fit | `direct-client`, `referral-partner`, `org-buyer` |
| `payment:` | Deals only: payment plan chosen | `pif`, `2-pay`, `3-pay` |

## 3. Routing: which segment feeds which sequence

| Segment | Rule | Feeds sequence |
|---|---|---|
| Welcome sequence entry | any of `source:website`, `lead-magnet:capacity-checklist` **and none of** `icp:referral-partner`, `icp:org-buyer`, `interest:workshop` | Welcome - Capacity Notes |
| Workshop registrants | `interest:workshop` | Workshop registrants |
| Referral partners | `icp:referral-partner` | Referral partner onboarding |
| Website subscribers, Capacity checklist downloads, Partnership prospects, Organization buyers | single tag each | (reporting and campaigns only) |

Rules:
- One person should be in **at most one** nurture sequence at a time. That's why the Welcome segment excludes the other tracks. Any new track gets its tag added to the Welcome exclusions.
- Sequences use **stop on reply**: a reply means a human conversation has started, so automation steps back.
- Re-entry is **once ever**: nobody gets the same sequence twice.
- Changing a segment rule affects **future** enrollments only; existing enrollments continue.
- Unsubscribed contacts are skipped at send time, even if their enrollment still shows as active.

## 4. Sequences

| Sequence | Emails (day sent) | Ends with |
|---|---|---|
| Welcome - Capacity Notes | 1, 3, 6, 10 | Fit-call invitation (reply to book) |
| Workshop registrants | 0, 2, 5 | Soft Partnership invitation |
| Referral partner onboarding | 0, 7 | Check-in |

The confirmation and "You're subscribed" emails are system emails, sent immediately and kept list-neutral because one template serves every list.

## 5. Pipelines and stage definitions

A stage is only useful if everyone moves deals at the same moment. Move a deal when the **entry** condition is true.

### Midlife Capacity Partnership ($10K)
| Stage | Entry condition |
|---|---|
| New conversation | A real two-way exchange happened (DM, email, call, workshop chat) |
| Application received | They submitted the application |
| Fit call booked | A time is on the calendar |
| Fit call completed | The call happened |
| Enrollment offer sent | You sent the agreement and payment options |
| Agreement signed - awaiting payment | Signed, first payment not yet received |
| Enrolled (won) | First payment received. Set deal value: PIF 10,000 / 2-pay 10,500 / 3-pay 10,800, plus tag `payment:*` |
| Not now - nurture | Interested but timing is wrong; add `interest:partnership` so they stay reachable |
| Not a fit (lost) | Scope, safety, or fit reasons; note why in a comment, not in tags |

### Referral partners
Identified → Outreach sent → Intro call booked → Partner kit sent → **Active - referring** (has sent at least one referral) → Dormant (no referral in 90 days).

### Workshops (host organizations)
Prospect organization → Pitch sent → Date confirmed → Delivered → Follow-up sent → Converted - leads generated / Declined. Link the deal to the organization's **Account**.

### Practice pilots (coach / provider)
For Skyler, the beta tester, and future practices using their own instance: Interested → Demo held → Pilot proposal sent → **Instance provisioned** (their own `crm/` copy is running) → Pilot active → Renewal / expansion / Closed lost.

Deal naming: `First Last - Partnership`, `Org Name - Workshop`, `Practice Name - Pilot`.

## 6. Consent and compliance

- **Double opt-in** for every public form: no contact exists until the person clicks the confirmation link.
- Every marketing email carries an unsubscribe link (prefilled with their email); unsubscribes stop all sequences.
- **Before sending to a real list, add your business postal address to the template footers.** US commercial email law (CAN-SPAM) requires a valid physical postal address in marketing emails; the starter templates leave it out because I don't have your address.
- **Data boundary:** this is a marketing CRM on a host without a BAA. No PHI: no clinical notes, assessment answers, diagnoses, medications, or health details in contacts, tags, deal notes or comments. Clinical work stays in BAA-covered systems.

## 7. Running it

- First deploy: `python3 blueprint/apply.py` after the stack is up.
- Change the structure: edit `blueprint/ecmap.json`, run `apply.py` again. It creates what's missing, re-syncs segment rules and system emails, and leaves everything else alone.
- Copy you edited in the admin UI is preserved. `--update` overwrites all template copy from the blueprint.
- `--dry-run` shows what would change.
- **Another business** (Skyler, a beta tester): copy `ecmap.json` to `<name>.json`, change the sender, lists, pipelines and copy, and run `apply.py --blueprint blueprint/<name>.json` against their instance.

## 8. Known gaps

| Gap | Workaround now | Fix later |
|---|---|---|
| Admin UI has no Deals/Pipelines screen (the API has it) | Track deals in the API/n8n, or keep the Ten Seats board until it's added | Small custom pipeline board, or an n8n form |
| Public signup collects email only (no first name) | Templates fall back to "Hi there" | Add a name step via `/api/contact-us`, or an n8n webhook form |
| Segment counts in the admin UI refresh on a schedule | Enrollment uses the live rules regardless | — |
| No booking or payments | Reply-to-book; invoice manually | Cal.com and Stripe webhooks into n8n |
