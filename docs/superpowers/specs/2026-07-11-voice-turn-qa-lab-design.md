# Voice Turn QA Lab Design

**Date:** 2026-07-11
**Status:** Leader-approved for autonomous implementation
**Product name:** Voice Turn QA Lab
**Slug:** `voice-turn-qa-lab`

## Problem and timing

Voice-agent teams can demo a clean scripted call but still fail a real pilot when the agent talks over callers, leaves dead air, yields too slowly after an interruption, ignores a correction, or ends without a usable resolution or handoff. Full observability and simulation platforms exist, but a small team or implementation consultant often needs a lightweight, vendor-neutral acceptance packet before buying or integrating those systems.

The timing signal is the July 2026 shift toward full-duplex and semantic turn-taking: OpenAI launched GPT-Live, Gradium highlighted semantic turn detection while announcing total funding of $100 million, and production voice-agent QA products emphasize interruption, latency, and turn-level evidence. The current Demo Showcase has no voice or conversation-quality product.

## Target user and job

Primary users are voice-agent product leads, QA leads, and implementation consultants preparing a support or appointment workflow for pilot traffic. Their job is:

> Turn one timestamped sample conversation into an evidence-backed accept, retest, or block decision, with the exact turns to fix and a reusable retest brief.

Secondary users are contact-center operations leaders comparing vendors during a proof of concept.

## Product boundary

The MVP is a deterministic, local-only transcript analyzer. It does not upload or play audio, place calls, call an AI model, connect to a voice provider, monitor production, or make a compliance claim.

The product must display this boundary on the first screen, in the generated report, and in the Markdown footer:

> Deterministic demo simulation. No live call, audio, model, provider, or customer data.

## Core user path

1. Open a usable QA workbench, not a marketing landing page.
2. Choose one of three presets or enter a project name, use case, acceptance profile, expected outcome, disclosure requirement, and transcript.
3. Submit a transcript whose lines follow `MM:SS.mmm-MM:SS.mmm | CALLER|AGENT | text`.
4. See a deterministic `pass`, `needs-review`, or `fail` verdict, turn-level timeline, metric cards, and issue queue.
5. Review a generated pilot acceptance matrix and retest checklist.
6. Copy or download the Markdown acceptance packet; use an on-page fallback if clipboard access fails.
7. Restore the last report after refresh when storage is available, reset it, or continue normally when storage is disabled.

## Inputs

- Project name: required, 2-80 trimmed characters.
- Use case: `billing-support`, `appointment-change`, or `service-outage`.
- Acceptance profile: `pilot`, `production`, or `strict`.
- Expected outcome: `resolved`, `scheduled`, or `human-handoff`.
- Disclosure required: boolean.
- Transcript: required, 4-80 non-empty lines in the specified format.

Transcript speakers are normalized to lowercase `caller` and `agent`. Start and end values become integer milliseconds. A turn is invalid when its timestamp is malformed, its speaker is unsupported, its text is empty, or `endMs <= startMs`.

## Deterministic analysis contract

`parseTranscript(text)` returns:

```js
{
  ok: true,
  errors: [],
  turns: [{ id, speaker, startMs, endMs, durationMs, text }]
}
```

or, for invalid input:

```js
{ ok: false, errors: [{ line, message }], turns: [] }
```

`analyzeTranscript(input)` validates all fields and returns:

```js
{
  analysisId,
  input,
  profile,
  turns,
  metrics,
  issues,
  acceptanceChecks,
  retestChecklist,
  verdict,
  summary
}
```

The same normalized input must return a deeply equal result. No current time, random number, remote result, or browser-only value may enter the model output. `analysisId` is a stable hash of the normalized input.

### Acceptance thresholds

| Profile | Max agent response gap | Max agent-on-caller talk-over | Max yield after caller barge-in |
| --- | ---: | ---: | ---: |
| Pilot | 1,400 ms | 450 ms | 650 ms |
| Production | 900 ms | 300 ms | 450 ms |
| Strict | 750 ms | 200 ms | 350 ms |

### Incidents

- `dead-air`: an agent response begins after the profile response-gap threshold.
- `talk-over`: an agent turn begins before the active caller turn ends and exceeds the profile talk-over threshold.
- `slow-yield`: a caller begins before the active agent turn ends and the agent continues beyond the profile yield threshold.
- `missed-repair`: a caller correction is not acknowledged in the next agent turn.
- `missing-handoff`: `human-handoff` is expected but no transfer or human-specialist language appears.
- `missing-outcome`: the selected expected outcome is not confirmed near the end of the conversation.
- `missing-disclosure`: disclosure is required but the first agent turn does not identify an AI, virtual, or automated assistant.

Incidents have `critical`, `high`, `medium`, or `low` severity, a turn reference, measured evidence, and one concrete retest action. They are sorted by severity and then start time.

Severity is fixed: `missing-handoff` is critical; `talk-over`, `slow-yield`, and `missing-outcome` are high; `dead-air`, `missed-repair`, and `missing-disclosure` are medium. A dead-air gap greater than twice its profile threshold is promoted to high.

### Verdict and checks

The report contains transparent metric cards for caller-to-agent gap, talk-over, caller interruption yield, turn count, overlap, and outcome evidence. Each metric stays tied to a profile threshold and a pass/review/fail status.

- `pass`: no critical or high-severity issues remain.
- `needs-review`: at least one medium or low-severity issue remains, but no critical or high-severity issue exists.
- `fail`: any critical or high-severity issue exists.

The UI must explain that these are demo acceptance heuristics, not industry standards.

## Presets

Three realistic presets must expose distinct failure modes:

- Billing support: one agent talk-over and one missed caller correction; expected outcome `resolved`.
- Appointment change: one dead-air gap and a successful reschedule confirmation; expected outcome `scheduled`.
- Service outage: one slow yield and a successful human handoff; expected outcome `human-handoff`.

At least one preset must produce `needs-review`, one must produce `pass`, and one must produce `fail`.

## Report and export

The workbench report contains:

- Verdict, largest response gap, and issue count.
- A two-lane caller/agent timeline with incident markers and text details available without hover.
- Metric cards and measured thresholds.
- Issue queue with severity, timestamp, evidence, and retest action.
- Acceptance matrix with pass/fail status and profile threshold.
- Three to six ordered retest steps derived from the highest-severity incidents.
- Copy, download, manual fallback, and reset controls.

Markdown includes the product name, project, profile, verdict, metrics, issues, acceptance checks, retest checklist, and the exact simulation disclaimer.

## UI direction

Use a dark navy signal-desk visual system with warm cream text, teal passing states, amber warnings, and coral failures. The hero is compact and exposes the actual workbench above the fold. Desktop uses a 40/60 input-report split; 900 px and below collapses to one column. The timeline may scroll within its own container on narrow screens, but the document must have no horizontal overflow at 375 px.

The interface must support keyboard navigation, visible focus, status announcements, labels for every field, and a non-color severity label. No external font, script, image, analytics, or network dependency is allowed.

## Storage and negative-path hooks

The storage key is `voice-turn-qa-lab:last-analysis:v1`. Storage failures never block analysis or export.

- `?copy=fallback` forces clipboard failure and opens the manual-copy buffer.
- `?storage=off` disables persistence and shows a non-blocking notice.

## File and deployment architecture

Source is isolated until local QA passes:

```text
products/voice-turn-qa-lab/
  index.html
  styles.css
  scripts/build.mjs
  src/app.js
  src/model.mjs
  test/model.test.mjs
demos/voice-turn-qa-lab/
assets/voice-turn-qa-lab-cover.svg
```

`model.mjs` owns parsing, validation, deterministic scoring, and Markdown generation. `app.js` owns DOM rendering, presets, storage, clipboard/download behavior, and query hooks. The build script copies only the runtime files into `demos/voice-turn-qa-lab/`.

After unit and browser QA pass, register exactly one catalog entry with ID `voice-turn-qa-lab-2026-07-11`, add the name to `README.md`, run `npm run validate` and `npm run build`, and publish through the existing `main` to `gh-pages` path.

## Acceptance criteria

- Unit tests prove parsing, invalid input, deterministic output, every incident family, all three gates, and Markdown disclaimer behavior.
- Demo-local build creates a complete static artifact.
- Main preset, manual input, invalid input, copy fallback, Markdown download, restore/reset, and storage-off paths work.
- Repeated analysis of the same input yields the same `analysisId`, metrics, issues, and verdict.
- The first screen, report, and Markdown clearly state the deterministic simulation boundary.
- Desktop and 375 px screenshots show a usable workbench with no document-level horizontal overflow.
- Runtime requests are limited to the local demo files.
- `npm run validate` and `npm run build` pass after registration.
- The unrelated untracked path `products/priorauth-packet-agent/` remains untouched and uncommitted.

## Commercial hypothesis

The initial wedge is a downloadable pilot acceptance packet for small voice-agent teams and implementation agencies that cannot justify a full simulation/observability platform. The validation offer is a free single-call report, a $49/month consultant tier for reusable client packets, and a $249/month team tier for saved scorecards and regression comparison. The first experiment is direct outreach to 20 voice-agent implementers and agencies with a sample failed-call teardown; success is at least five completed demo reports, three calls, and one paid-pilot intent within seven days.

## Explicit non-goals

- No live or uploaded audio.
- No telephony, STT, TTS, LLM, provider, CRM, or ticketing integration.
- No bulk simulation, production observability, alerting, or long-term trend monitoring.
- No automatic prompt change or agent deployment.
- No legal, regulatory, safety, or accessibility compliance certification.
- No authentication, collaboration, payment, backend, or external analytics.
