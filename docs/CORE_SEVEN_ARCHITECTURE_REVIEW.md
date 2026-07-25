# EC Map Core Seven Architecture Review

## Decision

The MVP serves one shared assessment profile to adults of any sex:

- seven active assessments
- eight prompts per assessment
- 56 active scored prompts
- six sex-neutral context anchors
- one paused source module containing the original H1 and H2 prompts

The hormonal module is not a hidden eighth assessment. It is excluded from navigation, completion, scoring, clarifiers, interpretation, governance, reports, and active saved-session payloads.

## Preserved Source Boundary

`src/spine.js` remains the 64-item source bank. `src/sections.js` defines two explicit projections:

- `ACTIVE_SPINE_ITEMS`: the 56-item `core-seven-v1` profile
- `PAUSED_HORMONAL_ITEMS`: the eight H1/H2 prompts from the original `sleep-hormones` section

This preserves prior work and allows a future versioned module without allowing paused data to leak into current results.

## Checks And Balances

1. Scoring iterates only over `ACTIVE_SPINE_ITEMS`.
2. Completion requires exactly the active 56 prompts.
3. Sol governance recomputes and validates only the active profile.
4. Active context excludes `transition_context`.
5. Adaptive clarifiers exclude A5 and A6.
6. Legacy browser sessions are remapped by item ID and stripped of paused responses when loaded or saved.
7. Tests prove that adding H1/H2 responses cannot change either deterministic scoring or the Sol governance packet.

## Known Product Risk

The original section combines H1 Sleep Restoration with H2 Hormonal Variability. Pausing that section also removes general sleep-restoration scoring even though sleep applies to adults of any sex. This is the least disruptive MVP interpretation of “seven assessments without change.”

Do not silently move H1 prompts into another active assessment. Before production validation, choose and version one of these options:

1. Restore H1 as a separately reviewed shared-core sleep module.
2. Rewrite the paused source module into distinct male and female variants with a shared sleep kernel.
3. Keep sleep only as a context anchor and document the reduced construct coverage.

## Release Boundary

The current build remains mock-data-only. It is not ready for real patient data, EHR delivery, or claims of HIPAA compliance. Production release still requires authentication, authorization, encrypted storage and transport, audit logging, retention and deletion controls, consent, vendor agreements, and qualified legal/security review.

Run `npm run verify` before every handoff. The gate checks source preservation, active/paused partition integrity, copy rules, security controls, unit tests, and static-server operation.
