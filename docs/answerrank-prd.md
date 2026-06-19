# AnswerRank PRD

Date: 2026-06-19
Owner: mini-product-mux
Target demo path: `/Users/yunhao/src/demo-showcase/products/answerrank/`

## Product Decision

Build **AnswerRank**, an AI answer visibility diagnostic tool for small B2B brands. The product helps a founder or marketer understand whether their brand appears in AI-generated buying answers, why competitors are cited instead, and what content fixes should be shipped first.

This is not a duplicate of the existing `AgentGate` demo. `AgentGate` focuses on AI agent launch governance. `AnswerRank` focuses on AI search, GEO/AEO visibility, competitor citation gaps, and content action planning.

## Market Signal

- Google Search is moving into AI-first discovery: Google announced AI Mode surpassed 1 billion monthly users one year after debut and described AI Search as the largest search box upgrade in more than 25 years.
- Google Search Central says AI Overviews and AI Mode may use query fan-out across related searches and sources, and that supporting links differ between AI surfaces. This creates a measurement problem for brands.
- Google also states AI feature traffic is reported inside normal Search Console web reporting, not as a separate easy-to-read AI visibility dashboard. This leaves room for a focused diagnostic layer.
- EMARKETER reports US daily AI search users rose from 14% in February 2025 to 29.2% in August 2025, and frames AI answers as a discovery layer where being cited or included matters.
- Recent enterprise funding activity validates the broader workflow: Gradial raised a large Series C for agentic marketing operations and includes use cases around finding where brands are missing from AI-generated answers.

Sources:

- Google Search I/O 2026: https://blog.google/products-and-platforms/products/search/search-io-2026/
- Google Search Central AI features: https://developers.google.com/search/docs/appearance/ai-features
- Google AI-era Search ads: https://blog.google/products/ads-commerce/google-marketing-live-search-ads/
- EMARKETER GEO and AI discovery: https://www.emarketer.com/content/how-experts-say-geo--ai-will-change-discovery-2026
- Axios Gradial funding: https://www.axios.com/2026/06/18/gradial-ai-agents-marketing

## Target Users

Primary:

- Founder-led B2B SaaS, AI tool, agency, or niche software business with 2-50 people.
- Marketing lead or founder who already publishes SEO content but does not know whether ChatGPT, Perplexity, Google AI Mode, or AI Overviews mention the brand.
- Teams without budget or time for enterprise SEO suites or custom data pipelines.

Secondary:

- Fractional CMO, SEO consultant, or content agency that needs a lightweight client-facing AI visibility report.

Excluded for MVP:

- Large enterprise marketing teams needing approvals, multi-workspace permissions, or automated publishing.
- Pure consumer brands that need social listening rather than search-answer visibility.

## Core Pain

Users currently optimize for classic search rankings, but buyers are increasingly getting answers directly inside AI search and assistant surfaces. The user does not know:

- Which buyer questions mention them, competitors, or nobody.
- Which source types AI answers rely on.
- Which pages are likely citation-ready or blocked by weak structure.
- What concrete content changes should be prioritized this week.
- How to explain AI visibility risk to a founder, client, or team.

Current alternatives:

- Manual prompting across ChatGPT, Perplexity, Gemini, and Google Search.
- Traditional SEO tools that focus on keywords, rankings, backlinks, and traffic.
- Consultants producing one-off GEO audits.
- Enterprise marketing automation platforms that are too heavy for a daily demo MVP.

## New Value

AnswerRank turns a brand plus a small set of buyer prompts into a clear **AI Answer Visibility Brief**:

- Visibility score across prompt categories.
- Competitor mention and citation gap summary.
- Source readiness checklist for the user's site.
- Prioritized content actions ranked by expected visibility lift and effort.
- Shareable report for a founder, client, or internal team.

## Usage Scenarios

1. Founder checks launch positioning.
   - The founder enters their brand, website, competitors, and target buyer category.
   - The system generates buyer questions and shows where the brand is missing.
   - The founder exports a brief with three content actions for the week.

2. SEO consultant audits a client.
   - The consultant enters client and competitor data.
   - The system creates a demo-ready visibility report.
   - The consultant uses the report to sell or scope a GEO content sprint.

3. Content lead prioritizes updates.
   - The content lead imports or types existing page URLs.
   - The system flags missing comparison pages, weak proof, unsupported claims, and absent structured facts.
   - The content lead chooses one action cluster to execute.

## User Path

Happy path:

1. User opens AnswerRank.
2. User enters brand name, website, category, 2-4 competitors, and target buyer.
3. User chooses one objective: `Win comparison answers`, `Appear in category recommendations`, or `Defend brand questions`.
4. System generates 8-12 buyer prompts grouped by intent.
5. System produces a simulated AI answer visibility table:
   - prompt
   - answer intent
   - brand status: `mentioned`, `cited`, `missing`, `mispositioned`
   - top competitors
   - likely source gap
6. User opens the Answer Brief.
7. System shows:
   - visibility score
   - competitor gap
   - citation readiness
   - action backlog
   - suggested page titles or content updates
8. User copies or downloads the brief.

Empty state:

- Show a compact input surface with example presets for one B2B SaaS, one local service, and one agency.
- Do not show marketing copy as a landing page. The first screen must be the usable diagnostic tool.

Validation errors:

- Brand name required.
- Category required.
- Website must look like a valid domain or URL.
- Competitor list can be empty, but if provided each item must have a name.
- If user enters more than 4 competitors, show an inline limit message and keep the first 4.

Failure state:

- Since MVP will not call live AI/search APIs, label results as "demo simulation" and keep the output deterministic.
- If generation fails in local state, preserve user input and show a retry action.

Recovery state:

- Save the last completed report in localStorage.
- Offer "Restore last brief" on reload.

## Feature List

Must-have:

- Brand/category/competitor input form.
- Objective selector with 3 options.
- Prompt generation preview.
- AI answer visibility table with status labels.
- Visibility score and category breakdown.
- Competitor gap summary.
- Citation readiness checklist.
- Prioritized action backlog.
- Copy brief to clipboard.
- Markdown download.
- Demo presets.
- localStorage recovery.
- Mobile layout without horizontal overflow.

Should-have:

- Simple effort/impact scoring per action.
- Toggle between founder view and consultant/client-report view.
- Inline explanation for each visibility status.
- Reset demo data action.
- Basic share-ready report section.

Could-have:

- CSV export.
- Before/after comparison mode.
- Prompt library editing.
- Screenshot-style report card.
- Fake historical trend chart.

Won't-have in MVP:

- Live calls to ChatGPT, Gemini, Perplexity, Google Search, or scraping.
- Login, accounts, billing, teams, permissions.
- Real Search Console or GA integration.
- Automated content publishing.
- Full SEO crawler.
- Browser extension.

## MVP Scope

Build a static, local-first demo inside `demo-showcase/products/answerrank/` and publish its build output to `demo-showcase/demos/answerrank/`.

MVP pages/views:

1. Diagnostic workspace
   - Inputs, objective selector, presets, generate action.

2. Prompt and visibility analysis
   - Generated prompt clusters and status table.

3. Answer Brief
   - Score, competitor gap, citation readiness, action backlog, export controls.

4. Saved brief state
   - Restore/reset last report.

Data model:

- `BrandProfile`
- `Competitor`
- `BuyerPrompt`
- `VisibilityFinding`
- `ReadinessCheck`
- `ActionItem`
- `AnswerBrief`

## Non-Target Scope

Do not build:

- A generic AI trends dashboard.
- An AI agent governance product.
- A traditional keyword rank tracker.
- A full marketing automation workflow tool.
- A content writing assistant as the core product.

## Priority

P0:

- User can create one complete Answer Brief from manual inputs or preset.
- Report includes score, prompt table, competitor gap, readiness checklist, and prioritized actions.
- User can copy and download Markdown.
- App is responsive and persisted locally.

P1:

- Consultant/client report toggle.
- Action scoring details.
- Better empty/recovery states.
- More realistic seed data.

P2:

- CSV export.
- Trend simulation.
- Comparison between two generated reports.

## Acceptance Criteria

General:

- The first screen is the usable diagnostic workspace, not a landing page.
- The product name, target category, and generated score are visible above the fold on desktop.
- The demo must not require network calls after loading.
- All seeded/preset data must make the product value understandable in under 60 seconds.

Input:

- Given a blank brand name, when user clicks generate, system shows an inline validation message and does not create a report.
- Given a malformed website value, system accepts it only if it can be normalized to a domain-like string; otherwise it asks the user to correct it.
- Given more than 4 competitors, system limits analysis to 4 and explains the limit inline.

Analysis:

- Generated report must include at least 8 prompts across at least 3 intent groups.
- Every prompt has one visibility status and one recommended action.
- Visibility score must be deterministic for the same input.
- Competitor gap must show at least one competitor mention pattern when competitors are supplied.
- Readiness checklist must include technical, content, proof, and comparison-coverage checks.

Export:

- Copy brief writes a complete Markdown report to clipboard when clipboard API is available.
- If clipboard fails, system shows the Markdown in a selectable fallback panel.
- Download exports a `.md` file with product name, generated date, score, findings, and actions.

Persistence:

- After generating a report and refreshing the page, user can restore the last brief.
- Reset clears the saved report and returns to the input state.

Responsive/UI:

- No horizontal scroll at 375px width.
- Long brand names and competitor names wrap without overlapping controls.
- Status labels and buttons keep stable dimensions during hover and loading states.

QA:

- Smoke test covers preset generation, manual generation, validation errors, copy fallback, download, restore, and reset.
- If localStorage is unavailable, the app still runs and only persistence is disabled with a non-blocking message.

## Core Metrics

Demo success metrics:

- Time to first generated report under 60 seconds for a new user.
- At least 80% of test users can explain the product value after viewing one brief.
- Copy/download action is discoverable and usable without instructions.
- No mobile layout defects in the main diagnostic path.

Product validation metrics for a real version:

- Activation: percentage of users who generate a first brief.
- Report usefulness: percentage who copy/download/share the brief.
- Action intent: percentage who mark at least one recommendation as planned.
- Retention proxy: percentage who return to compare a new report.
- Monetization proxy: consultant users who create multiple client briefs.

## Handoff Notes

For UI:

- Build a work-focused diagnostic interface, not a marketing hero.
- Use compact input panels, status chips, score blocks, and tables.
- Avoid nested cards and oversized decorative sections.

For architecture:

- Keep MVP static and deterministic.
- Separate scoring/prompt generation logic from presentation.
- Make future live provider adapters possible without adding them now.

For coder:

- Suggested product slug: `answerrank`.
- Suggested static artifact path: `demos/answerrank/`.
- Register a new entry in `data/demos.json` only after implementation and QA.

For QA:

- Focus on end-to-end report creation, validation, export, persistence, and mobile overflow.
- Confirm it does not duplicate `AgentGate` behavior or copy.
