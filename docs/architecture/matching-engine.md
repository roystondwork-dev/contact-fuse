# Matching engine

The matching engine answers: **which contacts are the same person?** It lives in
`packages/core/src/{normalize,match}` and is pure: same input + same settings → same output.
Every result carries **reasons** so the UI can explain why contacts were grouped.

```mermaid
flowchart LR
  A[Snapshot contacts] --> B[Normalise]
  B --> C[Block<br/>candidate pairs]
  C --> D[Score pairs<br/>0–100 + reasons]
  D --> E[Cluster<br/>union-find + guards]
  E --> F[Confidence bands]
  F --> G[Clusters for review]
```

Scans record `engine_version`; changing weights or rules bumps it so old scans stay explainable.

## 1. Normalisation

| Field        | Steps                                                                                                                                                                                                                                                                               | Example                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Phone        | Strip spaces, dashes, brackets, dots; parse with `libphonenumber-js` using the contact's country or the user's **default region**; output E.164. Keep extension separately. Invalid numbers keep a digits-only key and are matched only exactly.                                    | `098765 43210` (region IN) → `+919876543210`                                                         |
| Email        | Trim, lowercase, validate shape. Gmail/Googlemail: also derive a key without dots and `+tag` in the local part (used as a strong but not exact signal).                                                                                                                             | `Rahul.Sharma+work@googlemail.com` → `rahul.sharma+work@googlemail.com`, key `rahulsharma@gmail.com` |
| Name         | Unicode NFKC, strip diacritics (NFD + remove combining marks), case-fold, strip emoji and punctuation, collapse whitespace, remove honorifics (`mr`, `mrs`, `dr`, `shri`, `smt`, `ji` suffix), split into tokens, sort tokens for an order-free key. Keep the original for display. | `Dr. Sharma, Rahul 😀` → tokens `[rahul, sharma]`                                                    |
| Organisation | Case-fold, strip legal suffixes (`pvt ltd`, `inc`, `llc`, `gmbh`).                                                                                                                                                                                                                  | `Acme Pvt. Ltd.` → `acme`                                                                            |
| Birthday     | ISO date; year optional.                                                                                                                                                                                                                                                            | `14/05` → `--05-14`                                                                                  |

Normalisation never mutates the stored contact; it produces a `NormalizedContact`.

## 2. Blocking

Comparing every pair is O(n²) (10 000 contacts ≈ 50 M pairs). Blocking only compares contacts that
share at least one **blocking key**:

| Key                                                       | Built from                                 |
| --------------------------------------------------------- | ------------------------------------------ |
| `phone:<E.164>`                                           | each phone                                 |
| `phone-tail:<last 8 digits>`                              | each phone (catches country-code mistakes) |
| `email:<normalised>`                                      | each email                                 |
| `email-key:<gmail canonical>`                             | Gmail addresses                            |
| `name:<sorted tokens>`                                    | full name                                  |
| `name-prefix:<first 4 chars of each of first two tokens>` | fuzzy-name candidates                      |

Blocks larger than **200** members (tunable) are skipped for name keys — they are common names
("Rahul") and would only create noise. Phone/email blocks are never skipped, but very large ones
(e.g. a shared office number) are flagged as **shared values** and down-weighted.

## 3. Scoring

Each candidate pair gets signals; the score is the capped sum (0–100). **All weights are tunable**
through settings and are starting values to be calibrated against the synthetic test corpus.

| Signal                                                | Weight (default) | Notes                                  |
| ----------------------------------------------------- | ---------------- | -------------------------------------- |
| Same E.164 phone                                      | +60              | ×0.3 if the number is a _shared value_ |
| Same phone, last 8 digits only                        | +35              | different/missing country code         |
| Same normalised email                                 | +60              |                                        |
| Same Gmail canonical key (dots/+tag differ)           | +45              |                                        |
| Exact name tokens equal                               | +30              |                                        |
| Fuzzy name (Jaro-Winkler ≥ 0.92 on sorted tokens)     | +20              |                                        |
| Name initial-compatible (`Rahul S` vs `Rahul Sharma`) | +12              |                                        |
| Same organisation                                     | +8               |                                        |
| Same birthday (month+day)                             | +10              |                                        |
| **Conflicting** birthday (both set, different)        | −30              | strong evidence of different people    |
| Different full names, no shared phone/email           | −20              |                                        |
| Name-only match (no phone/email overlap)              | cap at 55        | never reaches High on name alone       |

Each signal adds a `MatchReason` (`{ kind: "same-phone", value: "+91•••••43210" }`) — the UI masks
values in reasons the same way logs do.

## 4. Clustering

Pairs with score ≥ the **Low threshold** become edges. Clusters are connected components built with
**union-find**, with guards against _chaining_ (A≈B, B≈C, but A≠C):

1. Edges are processed in descending score order.
2. Before joining two components, check **cohesion**: the new cluster's members must have average
   pairwise score ≥ threshold and no member pair with a hard conflict (conflicting birthday, or both
   in the same account with different non-empty phones _and_ emails).
3. A cluster may not exceed **max cluster size** (default 8). Larger groups are split at the weakest
   edge and flagged for review.
4. Cluster score = minimum edge score along its spanning tree (conservative).

## 5. Confidence bands

| Band   | Default threshold                | UI behaviour                                  |
| ------ | -------------------------------- | --------------------------------------------- |
| High   | ≥ 85                             | Pre-selected for merge (user can untick)      |
| Medium | 60–84                            | Shown, **not** preselected — user must decide |
| Low    | < 60 (≥ 40 to be an edge at all) | Hidden behind "Show possible matches"         |

Presets: **Strict** (High ≥ 92, Medium ≥ 70), **Balanced** (default), **Loose** (High ≥ 80,
Medium ≥ 50). Custom values are allowed. Exclusions are applied before clustering.

## Worked examples

| A                                                    | B                                                 | Signals                                                                    | Score | Band                  |
| ---------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------- | ----- | --------------------- |
| Rahul Sharma, `+91 98765 43210` (personal)           | Rahul S, `098765 43210` (work, region IN)         | same E.164 (+60), initial-compatible (+12)                                 | 72    | Medium                |
| Rahul Sharma, `+91 98765 43210`, rahul@x.com         | Rahul Sharma, `98765-43210`, rahul@x.com          | phone +60, email +60, exact name +30 → capped                              | 100   | High                  |
| Priya Nair, `+44 7700 900123`                        | Priya Nair, `07700 900123` (region IN by default) | parse of B as IN fails → `phone-tail` (+35), exact name +30                | 65    | Medium                |
| Anna Müller, anna.mueller@gmail.com                  | Anna Mueller, annamueller@gmail.com               | Gmail key +45, fuzzy name (diacritics stripped: `muller` vs `mueller`) +20 | 65    | Medium                |
| Mom, `+91 98450 00000`                               | Amma, `+91 98450 00000`                           | same phone +60                                                             | 60    | Medium — user decides |
| John Smith, birthday 03-02                           | John Smith, birthday 11-09                        | exact name +30, conflicting birthday −30                                   | 0     | none                  |
| Reception, `+1 415 555 0100` (shared by 40 contacts) | Alex Doe, `+1 415 555 0100`                       | shared phone 60×0.3=18                                                     | 18    | none                  |

## Known hard cases

- **Family members sharing a landline or email** — handled by shared-value down-weighting and the
  name-conflict penalty; still surfaces as Medium sometimes. Users can add a _pair exclusion_.
- **Nicknames / relationship names** ("Mom", "Bhaiya", "Boss") — only phone/email can link them.
- **Transliteration** (Hindi/Tamil script vs Latin) — v1 does not transliterate; names in different
  scripts match only via phone/email. Planned.
- **Recycled phone numbers** — a number reassigned to a new person. Conflicting names lower the score,
  but Medium matches still need human review — this is why Medium is never preselected.
- **Missing country codes in mixed-country address books** — the `phone-tail` key catches them at
  lower weight; the default region setting matters.
- **Name order** ("Sharma Rahul") — sorted-token keys make order irrelevant.
- **Same person, different emails, no phone** — name-only cap means at best Medium.

## Performance target

10 000 contacts scanned in under 5 seconds on a 2020-era laptop. Blocking keeps comparisons roughly
linear; benchmarks live next to the code (`*.bench.ts`, Vitest bench).
