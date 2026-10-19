# BountyJudge

[Hosted development site](https://bountyjudge.tinymule33.chatgpt.site) · owner-private access.

A GenLayer DApp that evaluates small public GitHub pull requests against immutable bounty requirements. Native test GEN is escrowed when a bounty is created. Independent AI validators retrieve evidence, assess each requirement, compare fingerprints and outcomes, and record APPROVED, REJECTED, or NEEDS_REVIEW.

**Verification:** 40 local tests and five live bounty traces, including independently observed native payouts/refunds. See [the full verification record](docs/verification.md) for receipts and the outstanding browser-wallet checks.

**Development demo. Not audited. Studio GEN is simulated, not money. Browser wallet and live workflow verification status is recorded in `docs/verification.md`.**

## Run

```sh
npm ci
npm test
npm run build
```

Serve `dist/` with any static host. `public/deployment.json` is copied into the build. Contract source is `contracts/bountyjudge.py`; use `scripts/deploy.mjs` for a fresh SDK test account deployment to Studionet. It checkpoints the submitted transaction before polling and checks execution success as well as finality. Its private key stays in `/tmp`, outside the repository. The included deployment and live-proof files are historical checkpoints; do not delete or overwrite them to force a retry. Fresh deployments and live PR fixtures need separate checkpoints, signer accounts, and PR wallet bindings.

## Workflow

1. Connect MetaMask on Studionet (chain 61999), or create a disposable browser test account. Fund it using Studio's faucet. The generated browser test account is held only in tab memory; reloading loses access. It is not Studio's built-in account.
2. Create a bounty with 1–3 explicit requirements and native test-GEN funding. Requirements, reward, repository, and deadline are immutable.
3. A different account adds the exact bounty-specific binding token to its public PR description, then submits the current 40-character head SHA. GitHub metadata verifies the binding before reserving the bounty. This binds PR account control to the payout wallet, not personal authorship.
4. Anyone may trigger a validator review. Each validator independently retrieves canonical metadata, the complete file list, diffs, and full changed text files at pinned commits. Each semantic PASS/FAIL needs literal quotations and a second grounding assessment. Validators independently derive outcomes and also validate the leader's proposed quotations and grounding.
5. Either bounty party may challenge once during the challenge period. The other party has a separate response window. Both sources must be commit-pinned raw files in the bounty repository. They are retained in history and independently retrieved during dispute review. Unavailable challenge or response attachments are recorded individually and cannot veto complete reliable implementation evidence.
6. After the window, anyone may finalize. Only APPROVED becomes ELIGIBLE. Only the bound claimant can request reward release. The owner can request a refund after rejection, unresolved review, timeout recovery, or expiry of an unclaimed bounty.

## Escrow

Creation is payable and records the received GEN against that bounty. No unfunded reward labels, stablecoin claims, or pretend dollar payouts. Release and refund zero the individual escrow and set a terminal transfer-request state before emitting a native external transfer. The same bounty cannot pay or refund twice. A submitted transfer is **not** proof of recipient credit. Verify external-message execution and recipient balance separately. There is no automatic retry of a failed emitted external message; live-network transfer recovery requires further work before use with valuable funds.

## Scope and limitations

- Registry capacity: 1,000 bounties per deployment.
- 1–6 changed text files; safe ASCII paths; added, modified or removed files. Renames, binary files, missing/truncated diffs, oversized files, and incomplete source retrieval return NEEDS_REVIEW.
- Maximum 42,000 characters of code and diffs. Metadata is fingerprinted on decision-critical fields; timestamps and reaction counts do not drive agreement.
- Runtime tests are not executed. Test source and PR descriptions cannot prove successful execution or deployment.
- Changing the PR head or wallet token after submission makes review unresolved. Submit a stable commit and keep the token in the PR description.
- PR reuse is blocked across this registry, including rejected claims. A new PR is needed for a new claim. Bounties have one claimant and one bounded challenge, no reopen loop.
- Owner identity and authority to represent a repository are self-declared. BountyJudge verifies submitted work evidence; it does not certify project ownership, personal authorship, security, or employment.
- Reviews must happen before their 24-hour review timeout. Timeout recovery makes the bounty unresolved and refundable.
- Evidence and AI can be wrong. This is a development demonstration, not a production financial service.

## Tests

`tests/test_bountyjudge.py` exercises state transitions, wallet binding, evidence failures, URL restrictions, source pinning, challenge/response timing, independent validator disagreement, leader quotation grounding, double-payment prevention and refunds. Its small fake GenLayer module is a behavioral harness, not a GenVM emulator. `tests/receipt.test.mjs` verifies that finality without successful execution is rejected. Live receipts are separate evidence.
