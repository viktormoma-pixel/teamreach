# Analytics Tracking — Mixpanel

This project uses **Mixpanel** for all product analytics. Mixpanel is the single source of truth for event tracking, user identification, and behavioral data. Do not introduce any other analytics tools, SDKs, or tracking libraries without explicit instruction from a user.

---

## Before You Add or Modify Any Tracking

⛔ **Do not write Mixpanel tracking code without reading this file first.**

### Mandatory checklist before writing any Mixpanel code

- [ ] Confirm you are using `mixpanel-browser` (not another SDK)
- [ ] Check consent requirements — this project serves EU users (Impressum present); Clarity and Mixpanel are currently initialized without an explicit consent gate by owner decision
- [ ] Review the existing tracking plan below before adding new events

---

## Tech Stack

| Detail | Value |
|---|---|
| **Platform** | Web — Vite + React + TypeScript |
| **Mixpanel SDK** | `mixpanel-browser` |
| **Tracking method** | Client-side |
| **CDP** | None |
| **Consent required** | Owner decision: no gate currently |
| **Mixpanel project token location** | Hardcoded in `src/lib/mixpanel.ts` |

---

## Mixpanel Initialization

Mixpanel is initialized once in:

**File:** `src/lib/mixpanel.ts`

Do not initialize Mixpanel anywhere else. Import the shared instance:

```ts
import { mixpanel } from "@/lib/mixpanel";
```

---

## Mixpanel Identity

| Action | When | File |
|---|---|---|
| `mixpanel.identify(userId)` + `mixpanel.people.set()` | On session apply (login, signup, restore) | `src/store/app.tsx` → `applySession` |
| `mixpanel.identify(userId)` + `people.set()` + `track('sign_up_completed')` | On signup with immediate session | `src/store/app.tsx` → `signUpWithEmail` |
| `mixpanel.reset()` | On logout (`SIGNED_OUT` event) | `src/store/app.tsx` → `onAuthStateChange` |

**Rules:**
- Always use the Supabase user UUID as `distinct_id` — never email
- Call `identify()` **after** DB write / session confirmed
- Call `reset()` on every logout path

---

## Mixpanel Tracking Plan

### Naming conventions

- Event names: `snake_case`, past tense, `object_verb` — e.g. `progress_logged`, `challenge_created`
- Property names: `snake_case`, no abbreviations
- No `$` or `mp_` prefixes on custom properties
- No PII in event properties

### Current events

| Event | Trigger | Key Properties | File |
|---|---|---|---|
| `sign_up_completed` | User registers with email | `sign_up_method: "email"` | `src/store/app.tsx` → `signUpWithEmail` |
| `signed_in` | User signs in with email | `method: "email"` | `src/store/app.tsx` → `signInWithEmail` |
| `progress_logged` ⭐ Value Moment | User logs progress on a challenge | `challenge_id`, `amount` | `src/store/app.tsx` → `addProgress` |
| `challenge_created` | User creates a new challenge | `unit`, `goal`, `days` | `src/store/app.tsx` → `createChallenge` |
| `challenge_joined` | User joins an existing challenge | `challenge_id` | `src/store/app.tsx` → `joinChallenge` |
| `challenge_deleted` | User soft-deletes a challenge | `challenge_id` | `src/store/app.tsx` → `deleteChallenge` |

---

## How to Add a New Mixpanel Event

1. Check the tracking plan above — reuse existing event if appropriate
2. Name using conventions: `snake_case`, past tense, descriptive
3. Track **after** the action succeeds (after DB write), never on button click
4. Track **after** `mixpanel.identify()` for authenticated actions
5. Add the event to the tracking plan table above
6. Verify in [Mixpanel Live View](https://mixpanel.com/report/live)

```ts
import { mixpanel } from "@/lib/mixpanel";

mixpanel.track("event_name", {
  property_name: value,
});
```

---

## What Not to Do

- Do not create other analytics SDKs — Mixpanel only
- Do not track PII (emails, names, IPs) as event properties
- Do not fire events inside loops
- Do not call `identify()` before the user is authenticated
- Do not skip `reset()` on logout
