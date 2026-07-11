# Voice Turn QA Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a deterministic, local-only workbench that turns one timestamped voice-agent transcript into a verdict-led acceptance packet and retest brief.

**Architecture:** Keep pure transcript parsing, scoring, incident detection, and Markdown generation in one ESM model module, with a separate browser adapter for presets, DOM rendering, persistence, copy/download, and negative-path query flags. Build the product source into a same-structure static artifact, prove it in isolation, then add one Showcase registry entry and publish through the existing static pipeline.

**Tech Stack:** HTML5, CSS, browser ES modules, Node.js ESM tests with `node:assert`, filesystem-only build script, existing static Showcase scripts.

## Global Constraints

- Work only under `products/voice-turn-qa-lab/`, `demos/voice-turn-qa-lab/`, `assets/voice-turn-qa-lab-cover.svg`, the two design/plan docs, `README.md`, and one new `data/demos.json` entry.
- Never modify, stage, or commit `products/priorauth-packet-agent/`.
- Do not touch `data/demos.json`, `README.md`, or `assets/` until isolated unit, build, desktop, and 375 px smoke checks pass.
- Production code follows red-green-refactor: write a failing test, confirm the expected failure, add the minimum implementation, and rerun all local tests.
- The exact boundary copy is: `Deterministic demo simulation. No live call, audio, model, provider, or customer data.`
- No external network request, runtime dependency, package install, random value, or runtime timestamp may affect analysis output.
- Keep `?copy=fallback` and `?storage=off` as stable browser QA hooks.
- Do not commit or push until Leader has reviewed the isolated diff and UI/QA have returned no P0 issue.

---

## File Map

- `products/voice-turn-qa-lab/src/model.mjs`: pure input validation, transcript parsing, incident detection, scoring, stable hash, and Markdown export.
- `products/voice-turn-qa-lab/test/model.test.mjs`: model behavior and determinism tests.
- `products/voice-turn-qa-lab/index.html`: accessible workbench structure and required simulation copy.
- `products/voice-turn-qa-lab/styles.css`: responsive signal-desk visual system.
- `products/voice-turn-qa-lab/src/app.js`: presets, form adapter, report/timeline rendering, storage, clipboard/download, and query hooks.
- `products/voice-turn-qa-lab/test/runtime.test.mjs`: static UI contract and local-only resource assertions.
- `products/voice-turn-qa-lab/scripts/build.mjs`: deterministic copy into the static artifact directory.
- `products/voice-turn-qa-lab/test/build.test.mjs`: build-output contract.
- `demos/voice-turn-qa-lab/`: generated static runtime files only.
- `assets/voice-turn-qa-lab-cover.svg`: Showcase cover matching the workbench.
- `data/demos.json`: one post-QA catalog entry.
- `README.md`: add the demo name to the current inventory sentence.

### Task 1: Pure transcript model

**Files:**
- Create: `products/voice-turn-qa-lab/test/model.test.mjs`
- Create: `products/voice-turn-qa-lab/src/model.mjs`

**Interfaces:**
- Produces: `parseTranscript(text)`, `validateAnalysisInput(input)`, `analyzeTranscript(input)`, `toMarkdown(analysis)`, `PROFILES`, and `SIMULATION_DISCLAIMER`.
- `analyzeTranscript` accepts `{ projectName, useCase, profile, expectedOutcome, disclosureRequired, transcript }` and returns the exact design-contract fields.

- [ ] **Step 1: Write the failing behavior test**

Create a Node ESM test that covers parsing, validation, deterministic analysis, all incident families, all gates, and the Markdown boundary. Use these fixed fixtures so measured timing stays reviewable:

```js
import assert from 'node:assert/strict'
import {
  SIMULATION_DISCLAIMER,
  analyzeTranscript,
  parseTranscript,
  toMarkdown,
  validateAnalysisInput,
} from '../src/model.mjs'

const readyTranscript = `
00:00.000-00:01.100 | AGENT | Hi, I am the automated support assistant. How can I help?
00:01.300-00:03.000 | CALLER | Please move my appointment to Friday morning.
00:03.450-00:04.500 | AGENT | Got it. I can help with that change.
00:04.800-00:06.200 | CALLER | Make it after ten, please.
00:06.550-00:08.000 | AGENT | Your appointment is scheduled for Friday at 10:30 AM.
00:08.200-00:09.300 | CALLER | That works, thank you.
00:09.500-00:10.600 | AGENT | Confirmed. You will receive the updated appointment message.
`.trim()

const retestTranscript = `
00:00.000-00:01.500 | AGENT | Hello, I am the virtual billing assistant.
00:01.700-00:04.000 | CALLER | I need help with a duplicate charge on invoice 204.
00:03.400-00:05.200 | AGENT | I can explain your latest invoice and payment status.
00:05.300-00:07.000 | CALLER | No, it is invoice 204, not the latest invoice.
00:07.800-00:09.100 | AGENT | The latest invoice was paid on Tuesday.
00:09.300-00:10.500 | CALLER | I still need the duplicate charge fixed.
00:10.900-00:12.100 | AGENT | The duplicate charge on invoice 204 is resolved and a refund is confirmed.
`.trim()

const blockTranscript = `
00:00.000-00:01.200 | AGENT | Welcome to outage support.
00:01.300-00:03.200 | CALLER | My service has been offline for six hours.
00:03.100-00:06.000 | AGENT | I can read the public status message and troubleshooting steps.
00:04.800-00:06.100 | CALLER | Stop, I already tried those. I need a person.
00:08.500-00:10.000 | AGENT | Please restart your router and wait ten minutes.
00:10.200-00:11.300 | CALLER | Transfer me to a specialist.
00:14.000-00:15.000 | AGENT | Please check the status page later.
`.trim()

const readyInput = {
  projectName: 'Northstar Scheduling Voice Pilot',
  useCase: 'appointment-change',
  profile: 'production',
  expectedOutcome: 'scheduled',
  disclosureRequired: true,
  transcript: readyTranscript,
}

const parsed = parseTranscript(readyTranscript)
assert.equal(parsed.ok, true)
assert.equal(parsed.turns.length, 7)
assert.deepEqual(parsed.turns[0], {
  id: 'turn-1',
  speaker: 'agent',
  startMs: 0,
  endMs: 1100,
  durationMs: 1100,
  text: 'Hi, I am the automated support assistant. How can I help?',
})

const malformed = parseTranscript('00:02.000-00:01.000 | ROBOT |')
assert.equal(malformed.ok, false)
assert.equal(malformed.turns.length, 0)
assert.equal(malformed.errors[0].line, 1)

const invalidInput = validateAnalysisInput({ ...readyInput, projectName: '', transcript: 'one line' })
assert.equal(invalidInput.ok, false)
assert.equal(invalidInput.errors.projectName.length > 0, true)
assert.equal(invalidInput.errors.transcript.length > 0, true)

const ready = analyzeTranscript(readyInput)
assert.deepEqual(ready, analyzeTranscript(readyInput))
assert.equal(ready.gate, 'ready')
assert.equal(ready.analysisId.startsWith('vtqa-'), true)
assert.equal(ready.incidents.length, 0)

const retest = analyzeTranscript({
  ...readyInput,
  projectName: 'Northstar Billing Voice Pilot',
  useCase: 'billing-support',
  expectedOutcome: 'resolved',
  transcript: retestTranscript,
})
assert.equal(retest.gate, 'retest')
assert.equal(retest.incidents.some((item) => item.type === 'talk-over'), true)
assert.equal(retest.incidents.some((item) => item.type === 'missed-repair'), true)

const blocked = analyzeTranscript({
  ...readyInput,
  projectName: 'Northstar Outage Voice Pilot',
  useCase: 'service-outage',
  profile: 'strict',
  expectedOutcome: 'human-handoff',
  transcript: blockTranscript,
})
assert.equal(blocked.gate, 'block')
assert.equal(blocked.incidents.some((item) => item.type === 'slow-yield'), true)
assert.equal(blocked.incidents.some((item) => item.type === 'dead-air'), true)
assert.equal(blocked.incidents.some((item) => item.type === 'missing-handoff'), true)
assert.equal(blocked.incidents.some((item) => item.type === 'missing-disclosure'), true)

const markdown = toMarkdown(retest)
assert.equal(markdown.includes('# Voice Turn QA Lab'), true)
assert.equal(markdown.includes('## Retest checklist'), true)
assert.equal(markdown.endsWith(SIMULATION_DISCLAIMER), true)

console.log('voice turn model tests passed')
```

- [ ] **Step 2: Run the test and verify the RED state**

Run:

```bash
node products/voice-turn-qa-lab/test/model.test.mjs
```

Expected: failure with `ERR_MODULE_NOT_FOUND` for `src/model.mjs`. This proves the test is exercising a missing product contract, not an existing implementation.

- [ ] **Step 3: Implement the minimum pure model**

Create `model.mjs` with these fixed values:

```js
export const SIMULATION_DISCLAIMER =
  'Deterministic demo simulation. No live call, audio, model, provider, or customer data.'

export const PROFILES = Object.freeze({
  pilot: { label: 'Pilot', responseGapMs: 1400, talkOverMs: 450, yieldMs: 650 },
  production: { label: 'Production', responseGapMs: 900, talkOverMs: 300, yieldMs: 450 },
  strict: { label: 'Strict', responseGapMs: 750, talkOverMs: 200, yieldMs: 350 },
})
```

Export `parseTranscript(text)`, `validateAnalysisInput(input)`, `analyzeTranscript(input)`, and `toMarkdown(analysis)` as named functions. Implementation rules:

- Parse timestamps with `^(\d{2}):(\d{2})\.(\d{3})-(\d{2}):(\d{2})\.(\d{3})\s*\|\s*(CALLER|AGENT)\s*\|\s*(.+)$`.
- Normalize and sort turns by `startMs`, preserving original line order for ties.
- Compare adjacent cross-speaker turns to measure response gaps, caller-on-agent yield time, and agent-on-caller talk-over.
- Detect caller repairs with `/\b(no|actually|wait|not that|i said|that's not)\b/i`; acknowledge with `/\b(got it|understand|sorry|thanks for correcting|let me correct|you're right)\b/i`.
- Detect resolved, scheduled, and human-handoff outcomes with explicit, case-insensitive phrase lists stored as constants.
- Set incident severities exactly as the design states. The report must stay verdict-first: `pass`, `needs-review`, or `fail` with metric cards tied directly to the profile thresholds. No black-box aggregate score.
- Generate `analysisId` with a small stable 32-bit hash of the JSON-stringified normalized input and format it as `vtqa-` plus eight lowercase hexadecimal characters.
- Build the retest checklist directly from sorted incidents and cap it at six items; when there are no incidents, return three pass-preservation checks.

- [ ] **Step 4: Run GREEN and refactor only with tests green**

Run:

```bash
node products/voice-turn-qa-lab/test/model.test.mjs
```

Expected: `voice turn model tests passed` with exit code 0 and no warning output.

### Task 2: Accessible browser workbench

**Files:**
- Create: `products/voice-turn-qa-lab/test/runtime.test.mjs`
- Create: `products/voice-turn-qa-lab/index.html`
- Create: `products/voice-turn-qa-lab/styles.css`
- Create: `products/voice-turn-qa-lab/src/app.js`

**Interfaces:**
- Consumes: all Task 1 exports.
- Produces: DOM IDs `qa-form`, `project-name`, `use-case`, `acceptance-profile`, `expected-outcome`, `disclosure-required`, `transcript`, `notice-row`, `empty-state`, `report-shell`, `metric-grid`, `timeline`, `incident-list`, `acceptance-list`, `retest-list`, `copy-button`, `download-button`, `fallback-panel`, `markdown-fallback`, `restore-banner`, `restore-button`, and `reset-button`.

- [ ] **Step 1: Write the failing static runtime contract**

```js
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const htmlPath = path.join(root, 'index.html')
const cssPath = path.join(root, 'styles.css')
const appPath = path.join(root, 'src', 'app.js')

for (const file of [htmlPath, cssPath, appPath]) {
  assert.equal(fs.existsSync(file), true, `missing runtime file: ${path.relative(root, file)}`)
}

const html = fs.readFileSync(htmlPath, 'utf8')
const css = fs.readFileSync(cssPath, 'utf8')
const app = fs.readFileSync(appPath, 'utf8')

for (const id of [
  'qa-form', 'project-name', 'use-case', 'acceptance-profile', 'expected-outcome',
  'disclosure-required', 'transcript', 'notice-row', 'empty-state', 'report-shell',
  'metric-grid', 'timeline', 'incident-list', 'acceptance-list', 'retest-list',
  'copy-button', 'download-button', 'fallback-panel', 'markdown-fallback',
  'restore-banner', 'restore-button', 'reset-button',
]) {
  assert.equal(html.includes(`id="${id}"`), true, `missing #${id}`)
}

assert.equal(html.includes('Deterministic demo simulation.'), true)
assert.equal(html.includes('type="module"'), true)
assert.equal(/https?:\/\//.test(html), false)
assert.equal(/@import|https?:\/\//.test(css), false)
assert.equal(app.includes("new URLSearchParams(window.location.search).has('copy')"), false)
assert.equal(app.includes("params.get('copy') === 'fallback'"), true)
assert.equal(app.includes("params.get('storage') === 'off'"), true)

console.log('voice turn runtime contract passed')
```

- [ ] **Step 2: Verify RED**

Run:

```bash
node products/voice-turn-qa-lab/test/runtime.test.mjs
```

Expected: failure identifying `index.html` as the first missing runtime file.

- [ ] **Step 3: Implement the workbench**

Create semantic HTML with a compact header and simulation badge, preset strip, labeled form, live notice region, restore banner, empty state, hidden report shell, and all contract IDs. Load `./src/app.js` as the only script.

In `app.js`, use this fixed adapter outline and preserve the exact query semantics:

```js
import {
  SIMULATION_DISCLAIMER,
  analyzeTranscript,
  toMarkdown,
  validateAnalysisInput,
} from './model.mjs'

const params = new URLSearchParams(window.location.search)
const forceCopyFallback = params.get('copy') === 'fallback'
const storageDisabled = params.get('storage') === 'off'
const storageKey = 'voice-turn-qa-lab:last-analysis:v1'

const presets = Object.freeze({
  billing: {
    projectName: 'Northstar Billing Voice Pilot',
    useCase: 'billing-support',
    profile: 'production',
    expectedOutcome: 'resolved',
    disclosureRequired: true,
    transcript: `00:00.000-00:01.500 | AGENT | Hello, I am the virtual billing assistant.
00:01.700-00:04.000 | CALLER | I need help with a duplicate charge on invoice 204.
00:03.400-00:05.200 | AGENT | I can explain your latest invoice and payment status.
00:05.300-00:07.000 | CALLER | No, it is invoice 204, not the latest invoice.
00:07.800-00:09.100 | AGENT | The latest invoice was paid on Tuesday.
00:09.300-00:10.500 | CALLER | I still need the duplicate charge fixed.
00:10.900-00:12.100 | AGENT | The duplicate charge on invoice 204 is resolved and a refund is confirmed.`,
  },
  appointment: {
    projectName: 'Northstar Scheduling Voice Pilot',
    useCase: 'appointment-change',
    profile: 'production',
    expectedOutcome: 'scheduled',
    disclosureRequired: true,
    transcript: `00:00.000-00:01.100 | AGENT | Hi, I am the automated support assistant. How can I help?
00:01.300-00:03.000 | CALLER | Please move my appointment to Friday morning.
00:03.450-00:04.500 | AGENT | Got it. I can help with that change.
00:04.800-00:06.200 | CALLER | Make it after ten, please.
00:06.550-00:08.000 | AGENT | Your appointment is scheduled for Friday at 10:30 AM.
00:08.200-00:09.300 | CALLER | That works, thank you.
00:09.500-00:10.600 | AGENT | Confirmed. You will receive the updated appointment message.`,
  },
  outage: {
    projectName: 'Northstar Outage Voice Pilot',
    useCase: 'service-outage',
    profile: 'strict',
    expectedOutcome: 'human-handoff',
    disclosureRequired: true,
    transcript: `00:00.000-00:01.200 | AGENT | Welcome to outage support.
00:01.300-00:03.200 | CALLER | My service has been offline for six hours.
00:03.100-00:06.000 | AGENT | I can read the public status message and troubleshooting steps.
00:04.800-00:06.100 | CALLER | Stop, I already tried those. I need a person.
00:08.500-00:10.000 | AGENT | Please restart your router and wait ten minutes.
00:10.200-00:11.300 | CALLER | Transfer me to a specialist.
00:14.000-00:15.000 | AGENT | Please check the status page later.`,
  },
})
```

Required event behavior:

- Preset buttons populate every field but do not analyze until submit.
- Submit runs input validation, maps errors next to fields, preserves user text, and renders one report when valid.
- Report rendering creates text nodes or escaped templates from normalized data; never insert raw transcript HTML.
- Timeline renders caller and agent lanes with positioned bars, plus visible timestamp and incident text below the graphic for mobile and keyboard users.
- Copy uses `navigator.clipboard.writeText` unless forced to fail; any error opens and selects the fallback textarea.
- Download creates a temporary Markdown Blob URL named `voice-turn-qa-<analysisId>.md`, clicks it, and revokes it.
- Storage save/restore is wrapped in `try/catch`; storage-off shows a notice and never calls `localStorage`.
- Reset clears form errors, report, fallback, and saved state when storage is available.

Create CSS with local system fonts, visible focus, 40/60 desktop columns, one-column layout at 900 px, responsive metric cards, two-lane timeline, text severity labels, and `overflow-wrap: anywhere`. At 375 px the document itself must not scroll horizontally.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
node products/voice-turn-qa-lab/test/model.test.mjs
node products/voice-turn-qa-lab/test/runtime.test.mjs
```

Expected: both success messages and exit code 0.

### Task 3: Static artifact build

**Files:**
- Create: `products/voice-turn-qa-lab/test/build.test.mjs`
- Create: `products/voice-turn-qa-lab/scripts/build.mjs`
- Generate: `demos/voice-turn-qa-lab/index.html`
- Generate: `demos/voice-turn-qa-lab/styles.css`
- Generate: `demos/voice-turn-qa-lab/src/app.js`
- Generate: `demos/voice-turn-qa-lab/src/model.mjs`

**Interfaces:**
- Consumes: Task 2 runtime files.
- Produces: a self-contained static directory preserving the `./src/app.js` import path.

- [ ] **Step 1: Write the failing build contract**

```js
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const product = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.resolve(product, '..', '..', 'demos', 'voice-turn-qa-lab')

for (const relative of ['index.html', 'styles.css', 'src/app.js', 'src/model.mjs']) {
  assert.equal(fs.existsSync(path.join(output, relative)), true, `missing built file: ${relative}`)
}

const builtHtml = fs.readFileSync(path.join(output, 'index.html'), 'utf8')
assert.equal(builtHtml.includes('./src/app.js'), true)
assert.equal(/https?:\/\//.test(builtHtml), false)

console.log('voice turn static build contract passed')
```

- [ ] **Step 2: Verify RED**

Run:

```bash
node products/voice-turn-qa-lab/test/build.test.mjs
```

Expected: failure for missing built `index.html`.

- [ ] **Step 3: Implement and run the build script**

`scripts/build.mjs` must resolve the product directory from `import.meta.url`, resolve `../../../demos/voice-turn-qa-lab`, remove that output only, recreate it, and copy `index.html`, `styles.css`, and `src/` recursively. It must print `Built Voice Turn QA Lab into demos/voice-turn-qa-lab`.

Run:

```bash
node products/voice-turn-qa-lab/scripts/build.mjs
node products/voice-turn-qa-lab/test/build.test.mjs
```

Expected: the build message followed by `voice turn static build contract passed`.

### Task 4: Isolated browser and regression gate

**Files:**
- Verify only; do not edit shared registry files.
- Save evidence outside the repository under `/tmp/voice-turn-qa-lab-evidence/`.

**Interfaces:**
- Consumes: the static artifact from Task 3.
- Produces: exact command output, desktop screenshot, mobile screenshot, and browser assertions for Leader/UI/QA.

- [ ] **Step 1: Run all isolated automated checks**

```bash
node products/voice-turn-qa-lab/test/model.test.mjs
node products/voice-turn-qa-lab/test/runtime.test.mjs
node products/voice-turn-qa-lab/scripts/build.mjs
node products/voice-turn-qa-lab/test/build.test.mjs
npm run validate
npm run build
```

Expected: three demo-local test success messages, `Validated 20 demos`, and `Built static site into dist`. The catalog count remains 20 because registration is intentionally deferred.

- [ ] **Step 2: Serve and collect browser evidence**

Start a static server from the repo root on the first free port at or above 4174 and record the actual port. Exercise:

- Default appointment preset to `ready`.
- Manual billing input to `retest`.
- Outage preset to `block`.
- Empty and malformed input validation.
- Repeated identical submit with unchanged analysis ID and scores.
- `?copy=fallback` manual buffer.
- Markdown download name and footer.
- Refresh restore and reset.
- `?storage=off` analysis/export with non-blocking notice.
- Desktop 1440x1000 and mobile 375x812 screenshots.
- `document.documentElement.scrollWidth === document.documentElement.clientWidth` at 375 px.
- Runtime request log contains only local demo resources.

Expected: every assertion passes; screenshots are visually usable and no external request appears.

- [ ] **Step 3: Review the isolated diff**

```bash
git status --short
git diff -- products/voice-turn-qa-lab demos/voice-turn-qa-lab docs/superpowers
```

Expected: only the intended new product, demo, and design/plan files plus the pre-existing untracked `products/priorauth-packet-agent/`. Do not stage the protected path.

### Task 5: Post-QA Showcase registration

**Files:**
- Create: `assets/voice-turn-qa-lab-cover.svg`
- Modify: `data/demos.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: UI/QA approval and Task 4 evidence.
- Produces: one validated catalog entry and Showcase link.

- [ ] **Step 1: Create the cover**

Create a 1600x900 SVG using the product palette. It must show the name `Voice Turn QA Lab`, a two-lane caller/agent timeline, one amber gap marker, one coral overlap marker, and the value line `Turn-level evidence before live traffic`. Use only SVG primitives and embedded text.

- [ ] **Step 2: Add the catalog entry with the existing helper**

```bash
npm run add-demo -- \
  --id voice-turn-qa-lab-2026-07-11 \
  --date 2026-07-11 \
  --name "Voice Turn QA Lab" \
  --tagline "Deterministic voice-agent QA workbench that turns timestamped call transcripts into turn-taking evidence, pilot gates, and a retest brief before live traffic." \
  --audience "Voice-agent product and QA leads, contact-center operations teams, and implementation consultants preparing a support or scheduling pilot." \
  --problem "Voice pilots can look convincing in scripted demos while talk-over, dead air, slow barge-in recovery, missed corrections, and incomplete handoffs still break real conversations." \
  --demo "./demos/voice-turn-qa-lab/" \
  --repo "https://github.com/liyunhaocn/demo-showcase" \
  --cover "./assets/voice-turn-qa-lab-cover.svg" \
  --tags "AI,Voice,QA,Contact Center,Evaluation" \
  --monetization "consultant acceptance packets,team QA workspace,voice pilot review" \
  --validation "model tests passed,static demo built,desktop browser smoke passed,375px mobile browser smoke passed,copy fallback and storage-off verified" \
  --stack "Static Frontend,Deterministic Simulation,Markdown Export" \
  --status validated
```

Expected: `Added voice-turn-qa-lab-2026-07-11` and the new entry is first in `data/demos.json`.

- [ ] **Step 3: Update README and validate the registered state**

Add `Voice Turn QA Lab` to the existing current-demo sentence without rewriting unrelated copy.

Run:

```bash
npm run validate
npm run build
```

Expected: `Validated 21 demos` and `Built static site into dist`.

### Task 6: Final review, commit, push, and public proof

**Files:**
- Review all intended files; create no new product scope.

**Interfaces:**
- Produces: one reviewed commit, updated `main` and `gh-pages`, and public HTTP/browser evidence.

- [ ] **Step 1: Run the complete release gate from a clean command invocation**

```bash
node products/voice-turn-qa-lab/test/model.test.mjs
node products/voice-turn-qa-lab/test/runtime.test.mjs
node products/voice-turn-qa-lab/test/build.test.mjs
npm run validate
npm run build
git diff --check
```

Expected: every command exits 0, catalog count is 21, and `git diff --check` is silent.

- [ ] **Step 2: Stage only intended paths and inspect the staged diff**

```bash
git add products/voice-turn-qa-lab demos/voice-turn-qa-lab assets/voice-turn-qa-lab-cover.svg data/demos.json README.md docs/superpowers/specs/2026-07-11-voice-turn-qa-lab-design.md docs/superpowers/plans/2026-07-11-voice-turn-qa-lab.md
git status --short
git diff --cached --stat
git diff --cached --check
```

Expected: `products/priorauth-packet-agent/` remains untracked and unstaged; only Voice Turn QA Lab plus its minimal registry/docs changes are staged.

- [ ] **Step 3: Commit and publish**

```bash
git commit -m "feat: add voice turn QA lab demo"
git push github main
git push github main:gh-pages
```

Expected: both pushes succeed and remote branch tips equal the new commit.

- [ ] **Step 4: Verify public Pages**

Verify HTTP 200 and browser rendering for:

```text
https://liyunhaocn.github.io/demo-showcase/
https://liyunhaocn.github.io/demo-showcase/demos/voice-turn-qa-lab/
```

Confirm the Showcase card opens the demo, the deployed page contains the new commit's product copy, and a mobile smoke still has no horizontal overflow. If public Pages is stale, compare `github/main` and `github/gh-pages`, wait only within normal deployment latency, and report the exact public status instead of claiming closure.
