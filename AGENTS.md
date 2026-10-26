JavaVerse Agent Rules :

Read PROJECT_SPEC.md completely before working.
The latest normative section overrides earlier conflicting wording.
Part S is the final authoritative override.
Execute only the phase explicitly requested by the owner.
Never begin the next phase automatically.
Use one active implementation agent at a time.
Use pnpm only. Do not introduce npm or Yarn workflows.
Never commit secrets, credentials, tokens, uploads or .env.local.
Never weaken authentication, authorization, CSRF, CSP, upload quarantine, sandbox isolation, rate limits or data-deletion controls to pass a test.
Do not execute learner or model-generated code in the web or worker process.
Use SANDBOX_PROVIDER=mock until the Phase 6 feasibility spike passes.
AI_PROVIDER_PRIMARY remains mock through Phases 1–4.
Hosted USER_BYOK credential storage is outside v1.
Follow Part R and Part S10 for the approved learning-first UI.
JavaVerse must not become a chat-first AI wrapper or dense developer IDE.
Before editing, state the plan and list affected files.
Change only files required by the current phase.
Add regression tests for every defect fixed.
Run all canonical and phase-specific checks before reporting completion.
Update docs/PROGRESS.md, docs/DECISIONS.md and docs/RISK_REGISTER.md.
Report exact commands and actual results. Never claim an unrun test passed.
End every phase with PASS, FAIL or BLOCKED, then stop.