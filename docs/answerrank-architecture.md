# AnswerRank Architecture

Date: 2026-06-19
Owner: mini-arch-mux
Source PRD: `/Users/yunhao/src/demo-showcase/docs/answerrank-prd.md`

## Recommendation

Build AnswerRank as a static, local-first diagnostic workspace inside the existing
`demo-showcase` repository.

The MVP must not call live AI, search, scraping, analytics, or crawler APIs. It
generates a deterministic demo simulation from user inputs, stores only the last
completed report in `localStorage`, exports Markdown, and publishes a static
artifact under `demos/answerrank/`.

This keeps the first version cheap, reproducible, offline-capable, and safe to
ship on GitHub Pages while leaving a clean seam for future provider adapters.

## Final MVP Boundary

P0 is a runnable isolated demo, not a published product platform.

Must do:

- Build source in `products/answerrank/`.
- Build static artifact in `demos/answerrank/`.
- Keep the main flow fully offline after load.
- Generate at least 8 prompts across at least 3 intent groups.
- Give every prompt a status, source gap, and recommended action.
- Persist and restore the last completed brief with
  `answerrank:lastBrief:v1`.
- Copy and download a complete Markdown brief.
- Show this exact meaning in the first screen, report, and Markdown footer:
  `Demo simulation: deterministic results, no live AI/search monitoring.`
- Pass `npm run validate && npm run build` after final showcase registration.

Must not do:

- Do not connect real AI, search, Search Console, crawler, analytics, billing,
  or CRM data sources.
- Do not add login, teams, payments, subscriptions, webhooks, queues, or server
  storage.
- Do not add CSV export, trend comparison, or historical tracking in this round.
- Do not move or rewrite the existing showcase shell.
- Do not edit shared showcase registry files until the isolated demo path works.

P1 can include founder/consultant view toggle, effort/impact scoring, copy
fallback, restore/reset polish, and 3 seed presets.

P2 interest capture, if attempted later, must be static and local-only in this
round. It can record intent in local UI state or `localStorage`, but must not
submit forms, call external services, accept payment, or imply real tracking.

## Release Gates

The isolated demo can be implemented before these are proven, but publishing,
Git push, and GitHub Pages release are blocked until all gates pass.

Functional gates:

- User can complete: preset or manual profile -> generate brief -> inspect
  score, findings, and actions -> copy or download.
- Three presets generate complete briefs.
- Manual profile with 2-4 competitors generates a complete brief.
- Blank brand, blank category, invalid website, and more than 4 competitors are
  handled inline without losing user input.
- Restore, reset, copy success, copy fallback, Markdown download, and
  localStorage-disabled degradation are all user-visible and testable.

Simulation gates:

- The first screen form area, score/report area, and Markdown/export area all
  show the simulation boundary.
- The exact required meaning is:
  `Demo simulation: deterministic results, no live AI/search monitoring.`
- UI and export copy must avoid live monitoring, live tracking, or ranking
  claims.
- The report must frame findings around AI buying answers, competitor gaps,
  source gaps, and content fixes.

Data gates:

- Each brief contains 8-12 prompts.
- Prompts cover at least 3 intent groups.
- Every finding has status, source gap, and recommended action.
- With competitors supplied, at least one finding shows competitor pressure.
- Re-running the same normalized input returns the same score, findings, and
  actions.

Responsive gates:

- 375px width has no horizontal overflow.
- Prompt findings must render as stacked cards or an equivalent mobile layout,
  not a forced wide table.
- Long brand names, competitor names, and domains wrap without overlapping
  controls, chips, or buttons.
- Buttons and status chips keep stable dimensions across hover/loading states.

Repository gates:

- Coder starts from `git status --short` and preserves all non-AnswerRank
  changes.
- Shared showcase files are not edited until the isolated demo is locally
  verified.
- After final registration, `node products/answerrank/scripts/build.mjs`,
  `npm run validate`, and `npm run build` all pass.
- AgentGate demo links still work after any `data/demos.json` or build-output
  change.

## Non-Duplicate Boundary

AnswerRank is not AgentGate.

- AgentGate: AI agent launch governance, permissions, approval gates, ROI, audit
  brief.
- AnswerRank: AI answer/search visibility, prompt coverage, competitor citation
  gaps, source readiness, content action planning.

Implementation must not copy AgentGate product flows, permission matrices, risk
scoring, approval states, or launch brief language.

## Technical Stack

Preferred for this MVP:

- Runtime: static HTML, CSS, and browser ES modules.
- Logic: plain JavaScript modules with JSDoc-style type annotations, or
  TypeScript only if coder adds a contained product build step under
  `products/answerrank/`.
- Persistence: `localStorage`.
- Export: Clipboard API with fallback panel, Blob download for `.md`.
- Deployment: existing `demo-showcase` static build.

Reasoning:

- No backend is needed for the deterministic MVP.
- Avoiding a root dependency install reduces risk in the already dirty repo.
- Browser ES modules are enough for the current state machine and scoring logic.
- If coder chooses Vite + React, it must be isolated under
  `products/answerrank/` and build into `demos/answerrank/` without changing
  AgentGate artifacts.

## Repository Layout

Required source:

```text
/Users/yunhao/src/demo-showcase/products/answerrank/
  index.html
  styles.css
  src/
    app.js
    model.js
    presets.js
    prompt-generation.js
    scoring.js
    storage.js
    export.js
  scripts/
    build.mjs
```

Required static artifact:

```text
/Users/yunhao/src/demo-showcase/demos/answerrank/
  index.html
  styles.css
  app.js
  assets/               # optional, only if the demo needs local images/icons
```

Showcase registration, only after implementation and QA:

```text
/Users/yunhao/src/demo-showcase/assets/answerrank-cover.png
/Users/yunhao/src/demo-showcase/data/demos.json
```

Do not edit or delete current AgentGate changes. Also do not remove unrelated
untracked demo directories such as `demos/ad-signal-studio/`.

## Modules

1. `model.js`
   - Shared constants and schema defaults.
   - Status, objective, intent group, and source gap enums.

2. `presets.js`
   - Three presets: B2B SaaS, local service, agency/consultant.
   - Presets fill the form and can generate immediately.

3. `prompt-generation.js`
   - Produces 8-12 buyer prompts across at least 3 intent groups.
   - Templates are selected by objective and category.

4. `scoring.js`
   - Normalizes input.
   - Computes stable hashes.
   - Assigns deterministic visibility findings.
   - Produces visibility score, breakdowns, readiness checks, competitor gap,
     and action backlog.

5. `storage.js`
   - Reads/writes `localStorage`.
   - Handles storage failure without breaking the app.

6. `export.js`
   - Builds Markdown report.
   - Copies to clipboard.
   - Shows selectable fallback Markdown if copy fails.
   - Downloads `.md` via Blob URL.

7. `app.js`
   - Owns UI state, form validation, event binding, rendering, restore/reset.

## Data Model

Use versioned data so later real-provider reports can coexist.

```js
BrandProfile = {
  brandName: string,
  website: string,
  normalizedDomain: string,
  category: string,
  targetBuyer: string,
  objective: "comparison" | "category" | "brand-defense",
  competitors: Competitor[],
  createdAt: string
}

Competitor = {
  id: string,
  name: string,
  website?: string
}

BuyerPrompt = {
  id: string,
  intentGroup: "category-recommendation" | "comparison" | "problem-solution" | "brand-defense",
  prompt: string,
  priority: "high" | "medium" | "low"
}

VisibilityFinding = {
  promptId: string,
  status: "cited" | "mentioned" | "mispositioned" | "missing",
  topCompetitors: string[],
  likelySourceGap: "comparison-page" | "proof" | "structured-facts" | "technical-access" | "positioning",
  recommendedAction: string
}

ReadinessCheck = {
  id: string,
  group: "technical" | "content" | "proof" | "comparison-coverage",
  label: string,
  state: "pass" | "watch" | "gap",
  detail: string
}

ActionItem = {
  id: string,
  title: string,
  why: string,
  effort: 1 | 2 | 3 | 4 | 5,
  impact: 1 | 2 | 3 | 4 | 5,
  priorityScore: number,
  relatedPrompts: string[]
}

AnswerBrief = {
  schemaVersion: 1,
  id: string,
  generatedAt: string,
  profile: BrandProfile,
  prompts: BuyerPrompt[],
  findings: VisibilityFinding[],
  readiness: ReadinessCheck[],
  actions: ActionItem[],
  score: {
    overall: number,
    byIntent: Record<string, number>,
    citationReadiness: number,
    competitorPressure: number
  },
  summary: {
    visibilityNarrative: string,
    competitorGap: string,
    nextWeekFocus: string
  },
  simulationNotice: string
}
```

## localStorage Design

Keys:

- `answerrank:lastBrief:v1`: serialized `AnswerBrief`.
- `answerrank:draftProfile:v1`: optional last edited form draft.

Rules:

- Save only the last completed brief after successful generation.
- Restore button appears only when `lastBrief` parses and has
  `schemaVersion === 1`.
- Reset clears both keys and returns to the input state.
- If `localStorage` throws, show a non-blocking persistence warning and keep the
  in-memory report usable.

## Deterministic Scoring Algorithm

Inputs are normalized before scoring:

- Trim text.
- Lowercase brand, domain, category, buyer, objective, competitor names.
- Normalize website by removing protocol, path, trailing slash, and `www.`.
- Keep at most 4 competitors and show an inline note when truncating.

Seed:

- Build `seedInput = brandName + "|" + normalizedDomain + "|" + category + "|" + targetBuyer + "|" + objective + "|" + competitorNames.join(",")`.
- Hash with a stable small hash such as FNV-1a or cyrb53.
- Never use `Math.random()` for generated report values.

Prompt generation:

- Always create at least 8 prompts.
- Always include at least 3 intent groups.
- Objective biases prompt mix:
  - `comparison`: more comparison and alternative prompts.
  - `category`: more recommendation and problem-solution prompts.
  - `brand-defense`: more branded and mispositioning prompts.

Status assignment:

- Use hash buckets across prompt id, brand, objective, and competitors.
- Ensure each prompt gets one of:
  - `cited`: brand appears and has supporting source.
  - `mentioned`: brand appears without strong source support.
  - `mispositioned`: brand appears for the wrong segment or category.
  - `missing`: competitors or generic sources appear instead.
- When competitors are supplied, at least one finding should show competitor
  pressure.

Score:

- Base status weights:
  - `cited`: 100
  - `mentioned`: 72
  - `mispositioned`: 38
  - `missing`: 12
- Overall score is the rounded average of prompt status weights, adjusted by:
  - readiness bonus/penalty from checklist states
  - competitor pressure penalty
  - objective fit bonus when findings align to the selected objective
- Clamp final score to 0-100.

Actions:

- Generate actions from weakest statuses and failed readiness checks.
- `priorityScore = impact * 2 - effort + severityBonus`.
- Sort descending by `priorityScore`.
- P0 should show at least 4 actions; P1 can show richer effort/impact details.

## UI State And Events

UI state:

- `empty`: form and presets visible, no report.
- `editing`: user has changed inputs.
- `validation-error`: inline field-level errors.
- `generated`: report rendered.
- `copy-fallback`: Markdown fallback panel visible.
- `restored`: report loaded from storage.
- `storage-disabled`: non-blocking warning visible.

Events:

- `preset.select`
- `profile.change`
- `competitor.add`
- `competitor.remove`
- `report.generate`
- `brief.restore`
- `brief.reset`
- `brief.copy`
- `brief.downloadMarkdown`
- `view.toggleFounderConsultant`

There is no server API in the MVP.

## Validation

P0 validation:

- Brand name is required.
- Category is required.
- Website must normalize to a domain-like value with at least one dot and no
  spaces.
- Competitors are optional.
- Empty competitor rows are ignored.
- More than 4 competitors are truncated with an inline explanation.
- Generation never destroys current form inputs after validation failure.

## Export Contract

Markdown report must include:

- Product name and demo simulation notice.
- Brand, website, category, target buyer, objective.
- Generated date.
- Overall score and intent breakdown.
- Prompt findings table.
- Competitor gap summary.
- Citation readiness checklist.
- Prioritized action backlog.
- Founder/consultant framing if the toggle is implemented.
- Footer with: `Demo simulation: deterministic results, no live AI/search monitoring.`

Clipboard:

- Try `navigator.clipboard.writeText(markdown)`.
- On failure, show a selectable `<textarea>` or `<pre>` fallback.

Download:

- File name: `answerrank-<normalized-brand>-brief.md`.
- Use `Blob`, object URL, click, revoke URL.

## Permissions And Security

- No login, accounts, billing, roles, or team permissions in MVP.
- No credentials, API keys, cookies, or external tokens.
- Do not send user-entered brand data over the network.
- Render user input with `textContent` or escaped templates; avoid raw
  `innerHTML` for untrusted strings.
- Treat Markdown export as text, not executable HTML.
- Keep simulation labels visible near score and export.
- Do not publish `node_modules`, credentials, local config, or screenshots with
  private data.

## Deployment

Implementation sequence:

1. Create source under `products/answerrank/`.
2. Build/copy static artifact to `demos/answerrank/`.
3. Validate locally by opening `demos/answerrank/index.html` or using the local
   static server.
4. Add `assets/answerrank-cover.png`.
5. Add `AnswerRank` entry to `data/demos.json`.
6. Run:

```bash
cd /Users/yunhao/src/demo-showcase
node products/answerrank/scripts/build.mjs
npm run validate
npm run build
```

Expected showcase link after publish:

```text
https://liyunhaocn.github.io/demo-showcase/demos/answerrank/
```

The existing schedule `56f13198` is owned by leader. Do not create another
schedule for this work.

## Risks And Tradeoffs

1. Simulation credibility
   - Risk: users may mistake generated findings for real AI/search monitoring.
   - Mitigation: label all outputs as deterministic demo simulation and avoid
     live-monitoring claims.

2. Dirty working tree
   - Risk: AgentGate or other untracked demo files are overwritten.
   - Mitigation: coder must start with `git status --short` and touch only
     AnswerRank paths plus final showcase registry files.

3. Scope creep into SEO suite
   - Risk: CSV, trends, crawler, Search Console, and AI provider adapters delay
     MVP.
   - Mitigation: keep CSV/trends/providers P2. P0 is one local report.

4. Deterministic output looks fake
   - Risk: report lacks enough variation to feel useful.
   - Mitigation: make prompt templates specific to objective, category, buyer,
     and competitors; generate concrete action titles and source gaps.

5. Mobile layout density
   - Risk: prompt tables and long names overflow at 375px.
   - Mitigation: use responsive table cards on mobile, wrap long names, and keep
     button dimensions stable.

## Coder Tasks

1. Read PRD and this architecture file.
2. Run `git status --short`; preserve all non-AnswerRank changes.
3. Create `products/answerrank/` source and deterministic modules.
4. Implement the workspace first screen, presets, validation, generation,
   report rendering, copy fallback, Markdown download, restore, and reset.
5. Build static artifact into `demos/answerrank/`.
6. Only after local validation, add cover asset and `data/demos.json` entry.
7. Run `node products/answerrank/scripts/build.mjs`,
   `npm run validate`, and `npm run build`.
8. Report changed paths, local test URL/path, and any unresolved issues.

## QA Focus

Smoke tests must cover:

- Simulation notice on first screen, report, and Markdown export.
- Preset generation.
- Manual generation.
- Blank brand validation.
- Malformed website validation.
- More than 4 competitor truncation.
- At least 8 prompts across at least 3 intent groups.
- Every prompt has status and recommended action.
- Same input produces same score and findings after repeat generation.
- Clipboard success path, where available.
- Clipboard failure fallback panel.
- Markdown download content and filename.
- localStorage restore after refresh.
- Reset clears saved state.
- App still works when localStorage is unavailable.
- Desktop and 375px mobile layout without horizontal overflow.
- Showcase card opens `./demos/answerrank/`.
- `npm run validate && npm run build` passes after registration.
