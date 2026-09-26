# $100K in 90 Days: Revenue Plan and Accountability System

Status: launch plan, September 2026.

Companion files:
- `VOICE_EC_MAP_MIDLIFE_10K_OFFER.md`: the offer and sales kit.
- `VOICE_EC_MAP_100K_90DAY_MODEL.xlsx`: the numbers.
- `midlife.html`: the sales page and application.
- `checkin.html`: the client daily check-in.
- `assets/midlife/`: images.

The model follows the high-ticket 1:1 approach with **intense accountability**, which runs on two levels:

1. For clients: daily structure is the product.
2. For the founder: daily sales targets and weekly scorecards decide whether $100K happens.

---

## 1. Bottom Line

**Revenue comes only from $10K 1:1 enrollments, and the plan starts from zero:** no list, no audience, no clients.

| Weeks | Job | Enrollments (cumulative) |
|---|---|---|
| 1–3 | Build the list (50 personal contacts, 20 referral partners), send 15 new messages a day, book the first fit calls | 0 |
| 4–13 | One enrollment a week | 1 → 10 |

| Result (from `VOICE_EC_MAP_100K_90DAY_MODEL.xlsx`) | Amount |
|---|---|
| Booked in 13 weeks (10 × $10,325 average across the three payment options) | **$103,250** |
| Cash collected in 13 weeks | **$87,200** |
| Installments that land after week 13 | $16,050 |

- To collect a full $100K in cash inside 13 weeks, about 7 of the 10 need to pay in full. The paid-in-full bonus exists for this.
- The day-to-day system is the **Ten Seats** board (claude.ai artifact): every person you message, their stage, their next step and date, today's numbers, and seats filled against pace.
- The Beta, Sprint and workshop offers in older docs are not part of this plan. A workshop can still be run free, as a lead source.

### Three constraints the model exposes

1. **Pipeline is the likeliest failure point.**
   - Over 13 weeks the plan needs about **26 real two-way conversations a week**, which adds up to about 83 applications and 40 fit calls.
   - Hitting that without a warm network and referral partners is unlikely. Weeks 1–2 are all about building both.
2. **Founder hours run over capacity.**
   - At 30 hours a week, the plan is over capacity in 9 of 13 weeks, with a peak of about 41 hours.
   - Fix: from week 6, hire a part-time **non-clinical accountability assistant** to triage check-ins using the reply templates, with you reviewing flags. The alternative is to stagger start dates so no more than 6 clients are in the Intensive at once.
   - Set `Inputs!B42` to your real non-clinical hours.
3. **Cash lags booked revenue.**
   - About $16K of installments land after week 13.
   - The paid-in-full bonus exists to pull cash forward.
   - Always collect installments by auto-charge.

---

## 2. Pay Structure

| Option | Price | Total | Cash by day 30 | Why |
|---|---|---|---|---|
| **Paid in full** | $10,000 | $10,000 | $10,000 | Bonus: 30 extra days of Integration plus a quarterly check-in for the next 6 months. The bonus is non-cash, so it doesn't erode the price. |
| 2 payments | $5,250 × 2 | $10,500 | $5,250 | Faster cash than 3-pay |
| 3 payments | $3,600 × 3 | $10,800 | $3,600 | Lowest barrier, with a collection-risk premium |

**Rules:**
- **No discounts.** Only the payment plan changes.
- Refunds: a full refund within 7 days of payment if the Map session hasn't happened. After that the fee is non-refundable, and a plan is a commitment to the full amount.
- Use a Stripe payment link for each option. Enforce installments through a Stripe subscription schedule that ends after the final payment.
- The agreement is e-signed before the first session.

---

## 3. The Client Accountability System

"Intense" means **high frequency and a short feedback loop, not pressure.** This population arrives with years of shame around missed follow-through. Punitive accountability pushes them to avoid it and quietly drop out.

### Components

| Component | Cadence | Tool | Coach time |
|---|---|---|---|
| Accountability agreement: 3 commitments, check-in rhythm, missed-day protocol | Kickoff | Signed page (below) | Inside the Map session |
| 60-second check-in: energy, sleep, capacity, commitments kept, top 3 | Every weekday (3 times a week in months 4–6) | `checkin.html` | About 4 min per check-in |
| Reply | Same business day: check-ins before 2 pm get a reply by 5 pm | Reply templates | Included above |
| Scorecard | Weekly 1:1 (45 min) | % of commitments kept, capacity trend, next week's 3 | 1 hr including prep |
| Group planning hour: body-doubling and planning the week | Weekly, optional | Video call | 1 hr total |
| Capacity review | Monthly | Check-in trends against demand | Inside that week's 1:1 |

### Capacity-adjusted commitments (the differentiator)

Every commitment is written in three versions:

- **Stretch** for high-capacity days.
- **Core** for medium days.
- **Minimum** for low days. The minimum is one small step that keeps the thread alive.

A low-capacity day on which she does the minimum **counts as kept.** The check-in never skips, but the size of the day's plan flexes. This fits the population in two ways:

- It matches the common ADHD response to external structure and immediate feedback.
- It absorbs the sleep and vasomotor variability of the transition, where fixed daily targets tend to fail.

On the evidence: ADHD coaching has emerging, modest support for gains in executive function and self-regulation. It is adjunctive and does not substitute for treatment, so market structure and process, never clinical outcomes.

### Missed check-in protocol

| Missed | Action |
|---|---|
| Day 1 | Friendly nudge: "No check-in today. Want to send just the minimum version?" |
| Day 2 | A 60-second voice note from the coach |
| Day 3 | A 15-minute reset call to rebuild the minimum-viable plan |
| A pattern (more than 2 misses in a week, 2 weeks running) | Raise it at the 1:1. Resize the commitments and don't pile on more. |

### Reply templates

- **On track:** "Kept [x]/3. [Name the specific win]. Today's top 3 look right for a [capacity] day. Protect [#1] first."
- **Low day:** "Thanks for checking in on a low day, and that counts. Your minimum today is [minimum]. Everything else can wait until tomorrow."
- **Slipping pattern:** "Third low day this week, and [commitment] keeps getting bumped. Let's shrink it at Thursday's 1:1. For today, just [minimum]."
- **Safety or medical content:** move it out of the check-in channel. For safety concerns: "I'm not able to support this here. Please call or text 988 or 911, and contact your clinician." For medication or hormone questions, route them to her prescriber.

### Accountability agreement (one page, signed at kickoff)

> For the next 90 days I commit to: (1) ___ (2) ___ (3) ___, each with a stretch, core, and minimum version.
> I'll check in every weekday. On low days I'll send the minimum version rather than skip.
> If I miss, I agree to the nudge, voice note, and reset-call protocol.
> My coach will reply the same business day and review my scorecard weekly.
> This is coaching, not medical or mental health care. Crisis support: 988 or 911.

---

## 4. Founder Accountability (What Actually Produces $100K)

**Daily non-negotiables (weekdays, one 60–90 minute power block, done before any delivery work):**
- 5 new two-way conversations with warm contacts, referral partners, or workshop leads.
- 5 follow-ups.
- 1 LinkedIn post or 1 partner touch. Rotate the 3 graphics in `assets/midlife/`.

**Every Friday, 20 minutes:**
- Fill in the `Scoreboard` sheet.
- Pick one fix for the coming week.
- Send the scoreboard to an accountability partner, such as a peer, mentor, or business coach, in a 15-minute weekly call. Commit to next week's numbers out loud.

**Decision gates:**

| Day | Gate (from the model) | If missed |
|---|---|---|
| 21 | 1 Partnership closed, about 20 applications | If applications are under 10, the list or message is the problem: rewrite the hook and double partner outreach. Don't change the price. |
| 42 | 3 Partnerships, about $41K booked cumulative | Add 2 workshops and ask every Beta client for an introduction. |
| 63 | 6 Partnerships, about $78K booked cumulative | Hire the accountability assistant if you're over capacity. Push paid-in-full. |
| 90 | 10 Partnerships, at least $100K booked | Review. Raise the price for the next cohort once you have 5 testimonials. |

---

## 5. 13-Week Calendar

| Week | Focus | Must be true by Friday |
|---|---|---|
| 0 (setup, 3–5 days) | Attorney consult, malpractice carrier letter, LLC and agreement, Stripe links, application and check-in form endpoints, booking link, publish `midlife.html` | The page takes live applications |
| 1 | Warm list of 100 and partner list of 30. Start the daily non-negotiables. First LinkedIn graphic. | 25 conversations, 2 Betas |
| 2 | Pitch 5 organizations on a workshop. Book a free 45-minute live session for week 3. | 1 workshop booked |
| 3 | Free live session ("ADHD or Perimenopause? Why It's Usually Both"). First fit calls. | **First Partnership** |
| 4 | First paid workshop. Deliver Betas with the upgrade offer. | 20 applications cumulative |
| 5–8 | Run the engine: daily outreach, 1 workshop, onboarding. Clients get the full accountability loop. | 5 Partnerships by week 8 |
| 9 | Ask month-2 clients for referrals. Build a consented, de-identified case story. | Hire the assistant if you're over capacity |
| 10–12 | Third workshop. Send the "founding cohort closes at 10" notice. The deadline is real because of the capacity cap. | 9 Partnerships |
| 13 | Close the final spots. Review against the model. Plan cohort 2 at a higher price. | $100K booked |

---

## 6. Workshop Offer (B2B Lever)

**"ADHD, Perimenopause & Performance: A Capacity Workshop for Women Leaders"**, a free 60-minute live session plus Q&A, used only as a lead source for the $10K Partnership.

- **Buyers:** women's ERGs, HR and benefits leads, professional associations (nursing, law, physicians, finance), and women's leadership networks.
- **Deliverables:**
  - The talk.
  - A non-diagnostic capacity self-reflection.
  - Q&A.
  - A follow-up page that links to the Partnership application.
- **Rules:**
  - Collect no individual health information from employees.
  - Report back to the employer only in aggregate.
  - Never tell an employer who applied.
- **Why it matters:** each session puts 20–60 qualified women in front of the offer at once. It is the fastest way to fill the 26-conversations-a-week pipeline.

---

## 7. Assets

| File | Use |
|---|---|
| `assets/midlife/og-midlife.png` (1200×630) | Link preview when `midlife.html` is shared |
| `assets/midlife/linkedin-1-diagnosis-at-46.png` (1080×1080) | Post 1: "She got the ADHD diagnosis at 46…" |
| `assets/midlife/linkedin-2-high-functioning.png` | Post 2: "3 signs your systems no longer match your capacity" |
| `assets/midlife/linkedin-3-better-question.png` | Post 3: "Which days are costing me, and why?" |
| `assets/midlife/capacity-map.svg` | Page diagram: two layers feeding one plan |
| `assets/midlife/accountability-loop.svg` | Page diagram: the accountability loop and the missed-day protocol |

## 8. Launch Configuration Checklist

- [ ] In `midlife.html` and `docs/midlife.html`, `APPLY_CONFIG.email` is set to charles@executivecapacitymap.com (applications open a pre-filled email). Optionally add `APPLY_CONFIG.endpoint` for silent form submission, and set `APPLY_CONFIG.bookingUrl`.
- [ ] In `checkin.html` and `docs/checkin.html`, set `CHECKIN_CONFIG.endpoint` using a separate form from the applications form.
- [ ] The `og:image` URL points to https://executivecapacitymap.com (Hostinger). Upload `assets/midlife/` there so link previews work.
- [ ] Add your name and a professional photo to `midlife.html` if you choose to. A named, visible founder converts much better at $10K.
- [ ] Create Stripe payment links for paid-in-full, 2-pay, and 3-pay.
- [ ] Get an e-sign coaching agreement that covers the non-clinical scope, refunds, the payment-plan commitment, and the accountability agreement.
- [ ] Complete the attorney consult and the carrier letter (see Section 11 of the offer doc).
