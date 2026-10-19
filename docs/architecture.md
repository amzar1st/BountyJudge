# Architecture and trust boundaries

## Components

- A static Vite frontend calls GenLayer directly with genlayer-js. No backend stores private keys or fabricates review decisions.
- The Intelligent Contract owns immutable requirements, per-bounty GEN escrow, claims, semantic decisions, deadlines, evidence fingerprints, and history.
- GitHub is the public evidence origin. PR metadata, complete file manifest, patches, pinned file contents, and bounded counter-evidence are fetched by each validator.
- GenLayer provides consensus over independently derived outcomes and fingerprints. Literal quotations and semantic grounding are checked again for the proposed leader response.
- Native external messages request payout or refund only after the state machine permits them. External-message execution and recipient balance are separate observations.

## State transitions

| Current state | Trigger | Next state |
| --- | --- | --- |
| OPEN | Bound PR submitted before deadline | SUBMITTED |
| SUBMITTED | Validator review | REVIEWED |
| REVIEWED | Timely party challenge | DISPUTED |
| DISPUTED | Response window closes, validator review | REVIEWED |
| REVIEWED | Finalize APPROVED after challenge deadline | ELIGIBLE |
| REVIEWED | Finalize REJECTED | REJECTED |
| REVIEWED | Finalize NEEDS_REVIEW | UNRESOLVED |
| SUBMITTED / DISPUTED | Review timeout recovery | UNRESOLVED |
| ELIGIBLE | Bound claimant requests release | PAYOUT_REQUESTED |
| REJECTED / UNRESOLVED / expired OPEN | Owner requests refund | REFUND_REQUESTED |

## Deliberate bounds

One claimant, one challenge, one response, and at most two semantic reviews per bounty. PR reuse is blocked in the same registry. Full-context limits avoid silently accepting a truncated prefix. Missing evidence prevents approval; a failed quote or grounding check cannot produce a positive result. There is no administrator override or backdoor payout.

## Residual risks

AI consensus does not prove program correctness. Public GitHub availability, PR-body mutability, and API rate limits affect liveness. Ownership of the target repository is self-declared. The wallet token proves a binding recorded by the PR account, not personal authorship. Escrow behavior and external-message delivery must be validated on the intended live network before using valuable funds. Failed external-message delivery has no retry mechanism in this version. Studio is a simulated environment.
