# Sol Governance MVP

## Purpose

This MVP turns the proposed `1:2:4:6:8/2`, structured by `3` and `7`, into a visible checks-and-balances layer for the existing Executive Capacity Map prototype.

It does not call an external AI model. It deterministically generates a shadow governance packet from the current assessment results so the workflow can be reviewed and tested before any model, PHI, EHR, or clinical release integration is introduced.

## What is implemented

- `1`: one versioned case packet and accountability chain.
- `2`: a support view and a challenge view for each leading pattern.
- `4`: reserved slots for Bottleneck, Burden, Drift, and Resilience. These are marked `not_computed` until their formulas are specified and validated.
- `6`: fail-closed gates for provenance, completeness, deterministic integrity, safety/privacy, differential claims, and human release.
- `8`: an explicit provisional crosswalk to Focus, Function, Feelings, Fuel, Fitness, Family, Firm, and Finances.
- `/2`: every reasoning receipt records both supporting evidence and competing explanations.
- `3`: the design reserves 3C and Cap/Cost/Context as organizing structures. No new score is inferred from them in this MVP.
- `7`: Anchor, Gather, Validate, Compute, Construct, Challenge, and Release and learn.
- Return to `8`: a claim that cannot connect to an observable 8F function remains out of the client-facing Map.

## Where to see it

Complete the prototype assessment, open **Coach Packet**, and review **Sol shadow governance** after the differential lens.

The panel shows:

- overall shadow status;
- six gate outcomes;
- four uncomputed index slots;
- seven lifecycle stages;
- 8F crosswalk coverage;
- support/challenge reasoning receipts; and
- the blocked release boundary.

## Safety and scope boundaries

- The feature remains demo/mock-data only.
- No external model is invoked.
- Private safety response text and values are not copied into the governance packet; only a redacted review flag count is retained.
- Completeness requires the expected answer IDs and valid `0-4` response values; arbitrary keys, missing values, and malformed values fail closed.
- Kernel integrity is checked against a fresh run of the deterministic scorer before receipts or 8F crosswalk coverage are produced.
- Receipts do not persist item IDs or raw item values.
- No diagnosis, causal conclusion, treatment recommendation, or validated probability is generated.
- Human review remains required and clinical auto-send remains blocked.
- The deterministic engine scores the versioned 56-item shared core. The 64-item source bank remains preserved, and paused H1/H2 responses cannot affect the active score or governance packet.

## MVP acceptance checks

Run:

```bash
npm run verify
```

The verification gate covers syntax, assessment spine integrity, evidence and claim guardrails, security checks, unit tests, and the browser smoke flow.

## Deferred work

- Specify and validate the four canonical index formulas.
- Resolve item-level mapping for Family, Firm, and Finances rather than treating context fields as equivalent to scored domains.
- Define the 3C and Cap/Cost/Context ontology without overloading existing terms.
- Add qualified reviewer identity, sign-off, audit log, and closed-loop handoff.
- Add BAA-backed hosting, storage, authentication, access control, retention, and EHR transport before real patient data is accepted.
- Introduce model calls only after a model contract, evaluation set, prompt-injection controls, and human-release policy pass review.
