# Verification record

## Follow-up checked 2026-10-20

- Hosting access is now **public**; an anonymous HTTP request returned 200.
- All 40 automated checks and the production build passed again.
- The deployed contract was imported through the real GenLayer Studio browser UI. Its built-in account `0xDaF21E798c054D998f2df528fAEA1Dc5D806FB90` was funded with simulated GEN.
- In Normal (Full Consensus) mode, with Simulation Mode unchecked, that account created `bj-studio-wallet-01` with 1 test GEN and requested its expired-owner refund. Both transactions finalized successfully.
- A Studio read displayed the owner and `REFUND_REQUESTED` history. Independent RPC checks observed account balance 9 GEN before refund, 10 GEN afterward, and zero contract balance. See [Studio receipts and balance evidence](studio-wallet-proof.json) and [browser screenshot](studio-wallet-20261020.jpg). This sixth bounty is separate from the five semantic-review cases below.
- This verifies Studio built-in account writes and reads. It does **not** verify MetaMask or signing through the hosted frontend.
- Hosted frontend browser interaction/layout QA remains unverified: managed Sites requires the `control-browser` skill, which is unavailable in this session. The workflow prohibits installing a replacement browser or improvising a preview path. No mock-provider check is presented as actual browser QA.
- Studio rejected fractional `Value (GEN)` before submission; integer 1 GEN succeeded. A refund-click transport failure was inspected before retrying; no transaction or state change had been submitted by that failed attempt.

## Historical verification checked 2026-10-19

Checked: 2026-10-19T08:55:43.029Z. This is a **Studionet development demonstration**, not a production financial deployment.

## What is verified

- 40 local checks passed: 27 Python behavioral tests and 13 JavaScript receipt/provider tests.
- Production Vite build passed, with locked dependencies. GitHub Actions also passed on the implementation commit. [CI runs](https://github.com/amzar1st/BountyJudge/actions/workflows/ci.yml).
- Contract deployment finalized successfully at `0x46987EFCfe8bC16202D77164E6b6cF618894Aabf` on chain 61999.
- Code read back from the deployed contract matches the local source SHA-256: `00d68667c325b158397e1a625c5859072511e0151a6d4a8f33a23b0e31fabf5d`. The legacy Studionet code RPC returns accepted-state code; the deployment itself is finalized and this contract has no upgrade method.
- 28 successful finalized application transactions are retained in `live-proof.json`, plus one rejected late-challenge transaction.
- All five bounty escrows reached terminal transfer-request states. Recipient credit and contract debit were observed separately for every payout and refund.

## Live outcomes

| Bounty | Verdict | Observed behavior |
| --- | --- | --- |
| bj-dispute-01 | APPROVED | Approval, invalid challenge attachment, separate response, second approval, payout credited. |
| bj-approval-01 | NEEDS_REVIEW | Valid code, invalid model quotation; conservative unresolved outcome and refund. |
| bj-rejection-01 | REJECTED | Lowercase/strip implementation contradicted uppercase/no-strip requirement; refund. |
| bj-unknown-01 | NEEDS_REVIEW | No independent runtime/deployment proof; unresolved outcome and refund. |
| bj-direct-approval-02 | APPROVED | Minimal implementation approved on first review; payout credited. |

The original direct-approval fixture did **not** reach its intended approval: a model quotation failed literal validation. That failure is retained, not presented as a successful approval. Its recovery attempt arrived after the deadline and rolled back with `Challenge unavailable`. A separate minimal fixture established direct approval and payout. This demonstrates both semantic review and conservative handling of unreliable model output; it does not guarantee that every valid PR will be approved.

## Native test-GEN accounting

| Item | Test GEN |
| --- | ---: |
| Funded | 0.05 |
| Credited to claimants | 0.02 |
| Refunded to owners | 0.03 |
| Final contract balance | 0 |

Each transfer was 0.01 test GEN. `live-audit.json` summarizes the independently checked balance deltas; `live-proof.json` retains the before/after samples, transaction hashes, execution receipts, review history and source fingerprints. The contract deliberately records `PAYOUT_REQUESTED` / `REFUND_REQUESTED`; observed credit is separate evidence, not an invented on-chain paid flag.

## What remains unverified

- **At the historical check:** Studio browser automation timed out twice; the original five cases used SDK accounts. The Studio built-in account check is now documented above. MetaMask and hosted-frontend signing remain unverified.
- **Browser layout and interaction QA:** not completed because browser automation was unavailable.
- **Production-value escrow / other networks:** not verified. Studio GEN balances are simulated. Failed external-message delivery has no automatic retry in this version.

The hosted site is deployed at [BountyJudge](https://bountyjudge.tinymule33.chatgpt.site) with public access (changed 2026-10-20). CORS OPTIONS and POST checks from that exact origin succeeded and returned chain ID `0xf22f`; that checks RPC configuration, not a signed browser transaction.

The project should not be described as fully verified or perfect while browser checks remain outstanding. Retired deployment records are preserved for audit; use `deployment.json`, `source-verification.json`, `live-proof.json` and `live-audit.json` for the current deployment.
