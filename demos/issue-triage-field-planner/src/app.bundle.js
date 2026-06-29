var IssueTriageFieldPlanner = (() => {
  // products/issue-triage-field-planner/src/model.js
  var SIMULATION_NOTICE = "Demo simulation: deterministic GitHub issue triage planning, no live GitHub API calls.";
  var INTENT_GROUPS = {
    "dedupe-cluster": "Duplicate cluster",
    "field-gap": "Field gap",
    "owner-gate": "Owner gate",
    "saved-view": "Saved view fit"
  };
  var STATUS_LABELS = {
    critical: "Duplicate cluster",
    watch: "Needs owner",
    opportunity: "Ready to route",
    "no-action": "Already covered"
  };
  var SOURCE_GAPS = {
    "duplicate-link": "Link the duplicate to the canonical issue",
    "field-gap": "Normalize missing issue fields",
    "owner-map": "Missing owner or triage assignee",
    "saved-view": "Saved view not aligned to the queue",
    "mcp-fields": "Push issue fields through MCP",
    "dedupe-note": "Add a dedupe note before the next sweep"
  };
  var VIEW_COPY = {
    founder: {
      reportTitle: "Triage lead brief",
      framing: "Collapse duplicate clusters first, then normalize fields and owner coverage before the next sweep.",
      copyCta: "Copy triage plan",
      downloadCta: "Download client-ready report"
    },
    consultant: {
      reportTitle: "Triage engineer brief",
      framing: "Treat this as a field-routing problem: collapse duplicates, then lock owner and view coverage.",
      copyCta: "Copy triage plan",
      downloadCta: "Download client-ready report"
    }
  };
  var STORAGE_KEYS = {
    lastBrief: "issuetriagefieldplanner:lastBrief:v2",
    draftProfile: "issuetriagefieldplanner:draftProfile:v2"
  };
  function scoreBand(score) {
    if (score >= 80) return "Triage ready";
    if (score >= 55) return "Needs routing";
    return "Needs cleanup";
  }

  // products/issue-triage-field-planner/src/export.js
  function buildMarkdown(brief, view = "founder") {
    const copy = VIEW_COPY[view] || VIEW_COPY.founder;
    const lines = [
      `# Issue Triage Field Planner - ${copy.reportTitle}`,
      "",
      SIMULATION_NOTICE,
      "",
      "## Queue profile",
      "",
      `- Queue: ${brief.profile.appName}`,
      `- Source: ${brief.profile.provider}`,
      `- Triage goal: ${brief.profile.currentModel}`,
      `- Repo / queue: ${brief.profile.workload}`,
      `- Owning team: ${brief.profile.region}`,
      `- Issue count: ${brief.profile.monthlyRequests || "Not set"}`,
      `- Objective: ${objectiveLabel(brief.profile.objective)}`,
      `- Generated date: ${brief.generatedAt}`,
      "",
      "## Triage summary",
      "",
      `- Overall score: ${brief.score.overall}/100`,
      `- Duplicate coverage: ${brief.score.impactSplit}/100`,
      `- Owner clarity: ${brief.score.ownerClarity}/100`,
      `- Action clarity: ${brief.score.actionClarity}/100`,
      `- Safety: ${brief.score.safety}/100`,
      "",
      "## Triage questions",
      "",
      ...brief.prompts.map((prompt) => `- ${prompt.prompt}`),
      "",
      "## Issue matrix",
      "",
      "| Issue | Dependency | Owner | Mode | Status | Gap | Recommended action |",
      "|---|---|---|---|---|---|---|",
      ...brief.findings.map((finding) => `| ${finding.promptId} | ${finding.dependency || "\u2014"} | ${finding.owner || "\u2014"} | ${finding.triageMode} | ${statusLabel(finding.status)} | ${gapLabel(finding.likelySourceGap)} | ${escapePipe(finding.recommendedAction)} |`),
      "",
      "## Readiness checks",
      "",
      ...brief.readiness.map((item) => `- ${item.label}: ${item.detail}`),
      "",
      "## Execution checklist",
      "",
      ...brief.actions.map((action) => `- ${action.title} \u2014 ${action.why}`),
      "",
      "## Next iteration",
      "",
      "This deterministic simulation proves the triage graph. A future product would validate against live GitHub issue data before automation decisions."
    ];
    return lines.join("\n");
  }
  function copyMarkdown(markdown, forceFallback = false) {
    if (!forceFallback && navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(markdown).then(() => ({ ok: true })).catch((error) => ({ ok: false, error, reason: error?.message || "Clipboard write failed." }));
    }
    return { ok: false, reason: forceFallback ? "Clipboard fallback requested." : "Clipboard API unavailable." };
  }
  function downloadMarkdown(brief, markdown) {
    const fileName = `${slugify(brief.profile.appName || "triage-plan")}-issue-brief.md`;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    return fileName;
  }
  function objectiveLabel(objective) {
    if (objective === "release-readiness") return "Release readiness";
    if (objective === "field-coverage") return "Field coverage";
    return "Reduce duplicate load";
  }
  function statusLabel(status) {
    return {
      critical: "Duplicate cluster",
      watch: "Needs owner",
      opportunity: "Ready to route",
      "no-action": "Already covered"
    }[status] || status;
  }
  function gapLabel(gap) {
    return SOURCE_GAPS[gap] || gap || "\u2014";
  }
  function escapePipe(value) {
    return String(value || "").replaceAll("|", "\\|");
  }
  function slugify(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  // products/issue-triage-field-planner/src/presets.js
  var PRESETS = [
    {
      id: "bug-burst-dedupe",
      label: "Bug burst",
      profile: {
        appName: "Public bug queue",
        provider: "GitHub Issues fields and duplicate preview",
        currentModel: "Collapse duplicate bug reports into one canonical issue and assign missing owners",
        reviewModels: [
          "Crash on login | duplicate of issue 1842 | Backend owner | critical",
          "Auth timeout | flaky reproduction | QA owner | watch",
          "Dashboard label mismatch | needs severity field | Product owner | opportunity",
          "Payment redirect loop | duplicate cluster | Release owner | critical",
          "Docs typo | already routed | Docs owner | no-action",
          "Search filter bug | missing area field | Frontend owner | watch"
        ],
        workload: "customer bug intake",
        region: "support and product team",
        monthlyRequests: "6",
        objective: "reduce-duplicate-load"
      }
    },
    {
      id: "release-triage-queue",
      label: "Release triage",
      profile: {
        appName: "Release queue",
        provider: "Saved issue views and triage fields preview",
        currentModel: "Separate release blockers, owner gaps, and field drift before the next cut",
        reviewModels: [
          "Security review failed | must block release | Security owner | critical",
          "Staging smoke missing | wait for rerun | QA owner | watch",
          "Deployment note missing | needs release field | Release owner | opportunity",
          "Customer bugbacklog | duplicate of customer intake | Support owner | critical",
          "Runbook update | already routed | Ops owner | no-action",
          "Escalation link | needs area field | PM owner | watch"
        ],
        workload: "release readiness board",
        region: "release engineering",
        monthlyRequests: "6",
        objective: "release-readiness"
      }
    },
    {
      id: "mcp-issue-fields-sync",
      label: "MCP sync",
      profile: {
        appName: "Issue fields sync",
        provider: "GitHub Issues MCP fields and saved views",
        currentModel: "Use issue fields to push duplicates, owners, and saved view coverage into one deterministic brief",
        reviewModels: [
          "MCP field map | missing owner field | Platform owner | opportunity",
          "Duplicate intake | duplicate cluster | Triage owner | critical",
          "Saved view filter | needs area + priority | PM owner | watch",
          "Bug repro pack | already routed | QA owner | no-action",
          "Issue age warning | needs due date field | Release owner | watch",
          "Canonical issue note | duplicate link and summary | Maintainer | opportunity"
        ],
        workload: "issue operations lane",
        region: "platform and maintainer team",
        monthlyRequests: "6",
        objective: "field-coverage"
      }
    },
    {
      id: "saved-view-repair",
      label: "Saved view repair",
      profile: {
        appName: "Saved view repair",
        provider: "GitHub Issues saved views and issue fields",
        currentModel: "Repair a noisy backlog so blockers, duplicates, and owner gaps show up in one deterministic triage board",
        reviewModels: [
          "Login bug cluster | duplicate of release blocker | Mobile owner | critical",
          "Escalation queue | missing area field | Support owner | watch",
          "Customer ask | needs owner field | Product owner | watch",
          "Refactor note | already routed | Platform owner | no-action",
          "Stale follow-up | saved view drift | QA owner | opportunity",
          "Search bug | duplicate note missing | Frontend owner | critical"
        ],
        workload: "issue backlog view",
        region: "support, QA, and product ops",
        monthlyRequests: "6",
        objective: "reduce-duplicate-load"
      }
    }
  ];
  function getPreset(id) {
    return PRESETS.find((preset) => preset.id === id);
  }

  // products/issue-triage-field-planner/src/prompt-generation.js
  var templates = {
    "dedupe-cluster": [
      {
        id: "duplicate-link",
        intentGroup: "dedupe-cluster",
        priority: "high",
        text: "Which issue in {workload} should become the canonical record for the current duplicate cluster?"
      },
      {
        id: "duplicate-drift",
        intentGroup: "dedupe-cluster",
        priority: "high",
        text: "Where is {appName} likely to create a second copy of the same bug if the team does not dedupe now?"
      },
      {
        id: "duplicate-note",
        intentGroup: "dedupe-cluster",
        priority: "medium",
        text: "What note should {appName} attach so the next duplicate links back to the original issue?"
      }
    ],
    "field-gap": [
      {
        id: "field-missing",
        intentGroup: "field-gap",
        priority: "high",
        text: "Which issue in {workload} is missing the fields needed for a clean triage queue?"
      },
      {
        id: "field-normalize",
        intentGroup: "field-gap",
        priority: "high",
        text: "Which field set should {appName} normalize before the next sweep so saved views stay consistent?"
      },
      {
        id: "field-routing",
        intentGroup: "field-gap",
        priority: "medium",
        text: "How should {appName} route issues that are missing priority, area, or due date fields?"
      }
    ],
    "owner-gate": [
      {
        id: "owner-gate",
        intentGroup: "owner-gate",
        priority: "high",
        text: "Which issue in {workload} needs a named owner before the team can treat it as ready?"
      },
      {
        id: "owner-assign",
        intentGroup: "owner-gate",
        priority: "medium",
        text: "Who should own the triage gate for {appName} when the next duplicate cluster is opened?"
      },
      {
        id: "owner-brief",
        intentGroup: "owner-gate",
        priority: "medium",
        text: "How should {appName} brief the owner so they can unblock the next issue quickly?"
      }
    ],
    "saved-view": [
      {
        id: "saved-view-fit",
        intentGroup: "saved-view",
        priority: "high",
        text: "Which saved view in {appName} needs to be updated so the team can see blockers first?"
      },
      {
        id: "saved-view-gap",
        intentGroup: "saved-view",
        priority: "medium",
        text: "What filter in {workload} should change first to keep duplicates and blockers in the same queue?"
      },
      {
        id: "saved-view-share",
        intentGroup: "saved-view",
        priority: "medium",
        text: "How should {appName} share a saved view so release and support owners see the same issues?"
      }
    ]
  };
  var objectiveOrder = {
    "reduce-duplicate-load": ["dedupe-cluster", "owner-gate", "field-gap", "saved-view"],
    "release-readiness": ["owner-gate", "saved-view", "dedupe-cluster", "field-gap"],
    "field-coverage": ["field-gap", "saved-view", "owner-gate", "dedupe-cluster"]
  };
  function generatePrompts(profile) {
    const order = objectiveOrder[profile.objective] || objectiveOrder["reduce-duplicate-load"];
    const selected = [];
    for (const group of order) {
      selected.push(...templates[group]);
    }
    return selected.slice(0, 9).map((template, index) => ({
      id: `${template.id}-${index + 1}`,
      intentGroup: template.intentGroup,
      priority: template.priority,
      prompt: hydrate(template.text, profile)
    }));
  }
  function hydrate(template, profile) {
    const inventoryText = profile.reviewModels.length ? profile.reviewModels.map((model) => model.name).join(", ") : "known issue clusters";
    return template.replaceAll("{appName}", profile.appName).replaceAll("{provider}", profile.provider).replaceAll("{currentModel}", profile.currentModel).replaceAll("{workload}", profile.workload || "the current issue queue").replaceAll("{region}", profile.region || "the current owner group").replaceAll("{reviewModels}", inventoryText);
  }

  // products/issue-triage-field-planner/src/scoring.js
  var DEFAULT_ROWS = [
    {
      name: "Crash on checkout",
      dependency: "Duplicate of issue 1842",
      owner: "Backend",
      risk: "critical"
    },
    {
      name: "Search filter bug",
      dependency: "Missing area field",
      owner: "Frontend",
      risk: "watch"
    },
    {
      name: "Release note typo",
      dependency: "Already routed",
      owner: "Docs",
      risk: "no-action"
    }
  ];
  function normalizeProfile(input) {
    const rows = normalizeInventoryRows(input.reviewModels || []);
    const normalizedRows = rows.slice(0, 6);
    return {
      appName: String(input.appName || "").trim(),
      provider: String(input.provider || "").trim(),
      currentModel: String(input.currentModel || "").trim(),
      reviewModels: normalizedRows,
      workload: String(input.workload || "").trim(),
      region: String(input.region || "").trim(),
      monthlyRequests: normalizeOptionalInt(input.monthlyRequests),
      objective: input.objective || "reduce-duplicate-load",
      createdAt: input.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  function validateProfile(input) {
    const errors = {};
    const normalized = normalizeProfile(input);
    const parsedRows = normalizeInventoryRows(input.reviewModels || []);
    const notes = [];
    if (!normalized.appName) {
      errors.appName = "Issue queue name is required to generate a triage plan.";
    }
    if (!normalized.provider) {
      errors.provider = "GitHub Issues source is required to generate a triage plan.";
    }
    if (!normalized.currentModel) {
      errors.currentModel = "Triage goal is required to generate a triage plan.";
    }
    if (!normalized.workload) {
      errors.workload = "Issue queue / repo is required to generate a triage plan.";
    }
    if (!normalized.region) {
      errors.region = "Owning team is required to generate a triage plan.";
    }
    if (input.monthlyRequests && !isPositiveInteger(input.monthlyRequests)) {
      errors.monthlyRequests = "Issue count must be a whole number greater than zero.";
    }
    if (!parsedRows.length) {
      notes.push("Add at least 3 issues before a realistic triage review.");
    } else if (parsedRows.length < 6) {
      notes.push("Add up to 6 issues to exercise the full matrix.");
    } else if (parsedRows.length > 6) {
      notes.push("Only the first 6 issues are used in this deterministic demo.");
    }
    const missingOwnerRows = parsedRows.filter((row) => !row.owner);
    if (missingOwnerRows.length) {
      notes.push("Owner names are optional, but the matrix is clearer when each issue has a named owner.");
    }
    return {
      ok: Object.keys(errors).length === 0,
      errors,
      notes,
      rowsTruncated: parsedRows.length > normalized.reviewModels.length,
      ignoredRowCount: Math.max(parsedRows.length - normalized.reviewModels.length, 0),
      profile: normalized
    };
  }
  function generateBrief(input) {
    const profile = normalizeProfile(input);
    const prompts = generatePrompts(profile);
    const seed = stableHash(seedInput(profile));
    const findings = buildFindings(profile, prompts, seed);
    const readiness = buildReadiness(profile, findings);
    const actions = buildActions(profile, prompts, findings, readiness);
    const score = buildScore(profile, findings, readiness);
    const generatedAt = deterministicTimestamp(seed);
    return {
      schemaVersion: 1,
      id: `issuetriagefieldplanner-${slugify2(profile.appName || profile.provider)}-${seed}`,
      generatedAt,
      profile,
      prompts,
      findings,
      readiness,
      actions,
      score,
      summary: buildSummary(profile, findings, actions, score),
      simulationNotice: SIMULATION_NOTICE
    };
  }
  function buildFindings(profile, prompts, seed) {
    const rows = profile.reviewModels.length ? profile.reviewModels : DEFAULT_ROWS;
    return rows.map((row, index) => {
      const bucket = stableHash(`${seed}|${row.name}|${row.dependency}|${row.owner}|${row.risk}|${index}`);
      const status = classifyStatus(profile, row, bucket);
      const signalGap = pickSourceGap(status, row, bucket);
      return {
        promptId: `${slugify2(row.name)}-${index + 1}`,
        status,
        dependency: row.dependency || "",
        owner: row.owner || "",
        risk: row.risk || "watch",
        topAlternatives: topAlternativesFor(status, row),
        likelySourceGap: signalGap,
        recommendedAction: actionFor(profile, row, status, signalGap),
        triageMode: modeForStatus(status, row),
        prompt: promptForRow(row, prompts, index)
      };
    });
  }
  function classifyStatus(profile, row, bucket) {
    const text = `${profile.provider} ${profile.currentModel} ${profile.workload} ${row.name} ${row.dependency} ${row.risk}`.toLowerCase();
    const explicit = normalizeRisk(row.risk);
    if (containsAny(text, ["duplicate", "same bug", "repeat", "canonical", "dedupe"])) {
      return explicit === "opportunity" ? "watch" : "critical";
    }
    if (containsAny(text, ["owner", "assignee", "unassigned", "triage", "blocked"])) {
      return explicit === "critical" ? "critical" : "watch";
    }
    if (containsAny(text, ["field", "priority", "area", "severity", "due date", "saved view"])) {
      return explicit === "critical" ? "watch" : "opportunity";
    }
    if (containsAny(text, ["release", "security", "deploy", "failing", "smoke"])) {
      return "critical";
    }
    if (explicit === "critical") {
      return bucket % 2 === 0 ? "critical" : "watch";
    }
    if (explicit === "opportunity") {
      return bucket % 3 === 0 ? "opportunity" : "watch";
    }
    if (explicit === "watch") {
      return bucket % 4 === 0 ? "watch" : "no-action";
    }
    return bucket % 5 === 0 ? "watch" : "no-action";
  }
  function modeForStatus(status, row) {
    if (status === "critical") return /duplicate|same bug|canonical/i.test(`${row.name} ${row.dependency}`) ? "dedupe-cluster" : "owner-gate";
    if (status === "watch") return /owner|assignee|triage/i.test(`${row.name} ${row.dependency}`) ? "owner-gate" : "field-gap";
    if (status === "opportunity") return /view|field|priority|area/i.test(`${row.name} ${row.dependency}`) ? "saved-view" : "field-gap";
    return "saved-view";
  }
  function pickSourceGap(status, row, bucket) {
    if (status === "critical") return /duplicate|same bug|canonical/i.test(`${row.name} ${row.dependency}`) ? "duplicate-link" : "owner-map";
    if (status === "watch") {
      if (!row.owner) return "owner-map";
      return /field|priority|area|severity|due date/i.test(`${row.name} ${row.dependency}`) ? "field-gap" : "dedupe-note";
    }
    if (status === "opportunity") return /view|field|priority|area/i.test(`${row.name} ${row.dependency}`) ? "saved-view" : "mcp-fields";
    return bucket % 2 === 0 ? "mcp-fields" : "saved-view";
  }
  function actionFor(profile, row, status, gap) {
    const issue = row.name || "this issue";
    const owner = row.owner || "the owner";
    const dependency = row.dependency || "the issue queue";
    if (status === "critical") {
      return `Merge ${issue} into the canonical cluster, keep ${owner} on the gate, and do not split the duplicate chain from ${dependency}.`;
    }
    if (status === "opportunity") {
      return `Normalize ${issue} into the saved view flow so ${profile.appName} can route it with the right fields and filters.`;
    }
    if (status === "watch") {
      return `Assign ${owner} to ${issue} and confirm the next triage pass has the field set needed to move it forward.`;
    }
    if (gap === "owner-map") {
      return `Record an owner for ${issue} before the next sweep so the queue has a clear checker.`;
    }
    return `Keep ${issue} on the watch list and attach a dedupe note if the same report appears again.`;
  }
  function buildReadiness(profile, findings) {
    const dedupeCount = findings.filter((item) => item.status === "critical").length;
    const ownerCount = profile.reviewModels.filter((row) => row.owner).length;
    const fieldCount = findings.filter((item) => /field|priority|area|severity|due date/i.test(`${item.dependency} ${item.recommendedAction}`)).length;
    const viewCount = findings.filter((item) => item.status === "opportunity").length;
    return [
      {
        state: dedupeCount >= 2 ? "ready" : "watch",
        label: "Duplicate clusters",
        detail: dedupeCount >= 2 ? `${dedupeCount} issues are clearly marked as duplicate clusters.` : `Only ${dedupeCount} cluster${dedupeCount === 1 ? "" : "s"} is clearly deduped right now.`,
        gap: dedupeCount >= 2 ? "" : "duplicate-link"
      },
      {
        state: ownerCount > 0 ? "ready" : "manual",
        label: "Owner map",
        detail: ownerCount > 0 ? `${ownerCount} tracked issue${ownerCount === 1 ? "" : "s"} already has a named owner.` : "No issue currently has a named owner in this preset.",
        gap: ownerCount > 0 ? "" : "owner-map"
      },
      {
        state: fieldCount > 0 ? "watch" : "ready",
        label: "Field coverage",
        detail: fieldCount > 0 ? `${fieldCount} issue${fieldCount === 1 ? "" : "s"} still needs a field normalization pass.` : "The main issue fields already look aligned.",
        gap: fieldCount > 0 ? "field-gap" : ""
      },
      {
        state: viewCount > 0 ? "ready" : "watch",
        label: "Saved views",
        detail: viewCount > 0 ? "Saved views should surface blockers and owner gaps clearly." : "Add or adjust a saved view so the queue stays visible to the whole team.",
        gap: viewCount > 0 ? "" : "saved-view"
      }
    ];
  }
  function buildActions(profile, prompts, findings, readiness) {
    const actions = [];
    const criticalItems = findings.filter((item) => item.status === "critical");
    const watchItems = findings.filter((item) => item.status === "watch");
    const opportunityItems = findings.filter((item) => item.status === "opportunity");
    const missingOwners = findings.filter((item) => !item.owner);
    if (criticalItems.length) {
      actions.push({
        title: `Collapse ${criticalItems[0].promptId.replace(/-\d+$/, "")} into the canonical issue`,
        why: `Duplicate clusters should be linked once so the team does not chase the same bug twice.`,
        impact: 5,
        effort: 2
      });
    }
    if (opportunityItems.length) {
      actions.push({
        title: "Normalize issue fields for saved views",
        why: `${opportunityItems.length} issue${opportunityItems.length === 1 ? "" : "s"} can move into a cleaner saved view once the fields are aligned.`,
        impact: 4,
        effort: 2
      });
    }
    if (missingOwners.length) {
      actions.push({
        title: "Assign owners to every issue",
        why: `${missingOwners.length} tracked issue${missingOwners.length === 1 ? "" : "s"} still need a named owner before triage can close cleanly.`,
        impact: 4,
        effort: 1
      });
    }
    if (watchItems.length) {
      actions.push({
        title: "Update the saved view filters",
        why: `${watchItems.length} issue${watchItems.length === 1 ? "" : "s"} needs the queue view to keep blockers and duplicates visible.`,
        impact: 3,
        effort: 1
      });
    }
    if (!actions.length) {
      actions.push({
        title: "Keep the queue as-is",
        why: "This preset already looks routed; the next iteration should validate against live GitHub issue data rather than reworking the graph.",
        impact: 2,
        effort: 1
      });
    }
    return actions.slice(0, 3).map((action, index) => ({
      ...action,
      id: `action-${index + 1}`,
      owner: prompts[index]?.prompt || "Review the plan",
      checkpoint: readiness[index % readiness.length]?.label || "Triage gate"
    }));
  }
  function buildScore(profile, findings, readiness) {
    const total = findings.length || 1;
    const criticalCount = findings.filter((item) => item.status === "critical").length;
    const watchCount = findings.filter((item) => item.status === "watch").length;
    const opportunityCount = findings.filter((item) => item.status === "opportunity").length;
    const noActionCount = findings.filter((item) => item.status === "no-action").length;
    const ownerCount = findings.filter((item) => item.owner).length;
    const viewGate = readiness.some((item) => item.gap === "saved-view") ? 1 : 0;
    const triageLane = clamp(
      Math.round(32 + opportunityCount * 16 + noActionCount * 8 - criticalCount * 10 - watchCount * 4)
    );
    const ownerClarity = clamp(Math.round(45 + ownerCount * 9 - (total - ownerCount) * 8));
    const actionClarity = clamp(Math.round(48 + opportunityCount * 7 + watchCount * 5 - criticalCount * 3 + viewGate * 6));
    const safety = clamp(Math.round(54 + (readiness[0]?.state === "ready" ? 10 : -14) - criticalCount * 5 + viewGate * 4));
    const overall = clamp(Math.round(triageLane * 0.35 + ownerClarity * 0.2 + actionClarity * 0.2 + safety * 0.25));
    return {
      overall,
      impactSplit: triageLane,
      ownerClarity,
      actionClarity,
      safety,
      summary: bandSummary(profile, overall, triageLane, ownerClarity, actionClarity, safety)
    };
  }
  function bandSummary(profile, overall, triageLane, ownerClarity, actionClarity, safety) {
    const laneText = triageLane >= 75 ? "most issues can be routed into clear saved views" : triageLane >= 50 ? "a few issues need cleanup before routing" : "the queue still needs dedupe work";
    const ownerText = ownerClarity >= 75 ? "owner coverage is clear" : "owner gaps still need cleanup";
    const safetyText = safety >= 75 ? "triage gating looks controlled" : "the saved view and duplicate gate still need attention";
    return `${profile.appName || "This queue"} ${laneText}, ${ownerText}, and ${safetyText}. Action clarity is ${actionClarity}/100 with an overall score of ${overall}/100.`;
  }
  function buildSummary(profile, findings, actions, score) {
    const criticalCount = findings.filter((item) => item.status === "critical").length;
    const dedupeCount = findings.filter((item) => item.status === "opportunity").length;
    const ownerCount = findings.filter((item) => item.owner).length;
    const missingOwnerCount = findings.length - ownerCount;
    return {
      impactGap: `${criticalCount} duplicate cluster${criticalCount === 1 ? "" : "s"} and ${dedupeCount} route-ready issue${dedupeCount === 1 ? "" : "s"} are highlighted in the matrix.`,
      ownerGap: missingOwnerCount > 0 ? `${missingOwnerCount} issue${missingOwnerCount === 1 ? "" : "s"} still need a named owner before the next sweep.` : "Every tracked issue has a clear owner or checker.",
      topAction: actions[0]?.title || "Keep the queue as-is",
      scoreNote: `${score.overall}/100 overall based on the current deterministic GitHub issue triage simulation.`
    };
  }
  function promptForRow(row, prompts, index) {
    return prompts[index % prompts.length]?.prompt || row.name || `Issue ${index + 1}`;
  }
  function topAlternativesFor(status, row) {
    const nextStep = modeForStatus(status, row);
    if (status === "critical") return [nextStep, "saved-view", "field-gap"];
    if (status === "watch") return [nextStep, "owner-gate", "saved-view"];
    if (status === "opportunity") return ["saved-view", "field-gap", "owner-gate"];
    return ["saved-view", "field-gap", "owner-gate"];
  }
  function normalizeInventoryRows(rows) {
    return rows.map((row, index) => {
      if (typeof row === "string") {
        return parseInventoryRow(row, index);
      }
      if (!row || typeof row !== "object") return null;
      return {
        name: String(row.name || "").trim(),
        dependency: String(row.dependency || "").trim(),
        owner: String(row.owner || "").trim(),
        risk: String(row.risk || "watch").trim()
      };
    }).filter(Boolean).map((row) => ({
      name: row.name,
      dependency: row.dependency,
      owner: row.owner,
      risk: normalizeRisk(row.risk)
    }));
  }
  function parseInventoryRow(line, index) {
    const raw = String(line || "").trim();
    if (!raw) return null;
    const parts = raw.split(/[|,]/).map((part) => part.trim());
    return {
      id: `step-${index + 1}`,
      name: parts[0] || "",
      dependency: parts[1] || "",
      owner: parts[2] || "",
      risk: normalizeRisk(parts[3] || "watch")
    };
  }
  function normalizeRisk(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (["critical", "duplicate", "blocker", "gate"].includes(raw)) return "critical";
    if (["opportunity", "route-ready", "field-ready", "saved-view"].includes(raw)) return "opportunity";
    if (["no-action", "noop", "already-covered"].includes(raw)) return "no-action";
    return "watch";
  }
  function seedInput(profile) {
    return [
      profile.appName,
      profile.provider,
      profile.currentModel,
      profile.workload,
      profile.region,
      profile.monthlyRequests,
      profile.objective,
      ...(profile.reviewModels || []).map((row) => `${row.name}|${row.dependency}|${row.owner}|${row.risk}`)
    ].join("||");
  }
  function normalizeOptionalInt(value) {
    if (value === "" || value === null || value === void 0) return "";
    if (!isPositiveInteger(value)) return String(value);
    return String(Number(value));
  }
  function isPositiveInteger(value) {
    return /^\d+$/.test(String(value).trim()) && Number(value) > 0;
  }
  function containsAny(value, terms) {
    return terms.some((term) => value.includes(term));
  }
  function stableHash(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
  }
  function deterministicTimestamp(seed) {
    const base = Date.UTC(2026, 5, 30, 9, 0, 0);
    const offsetMinutes = seed % (24 * 60);
    return new Date(base + offsetMinutes * 60 * 1e3).toISOString();
  }
  function slugify2(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function clamp(value) {
    return Math.max(0, Math.min(100, value));
  }

  // products/issue-triage-field-planner/src/storage.js
  function storageAvailable() {
    try {
      const testKey = "issuetriagefieldplanner:storage-test";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
  function loadLastBrief() {
    return loadJson(STORAGE_KEYS.lastBrief);
  }
  function saveLastBrief(brief) {
    return saveJson(STORAGE_KEYS.lastBrief, brief);
  }
  function clearSavedState() {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.lastBrief);
      window.localStorage.removeItem(STORAGE_KEYS.draftProfile);
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }
  function loadDraftProfile() {
    return loadJson(STORAGE_KEYS.draftProfile);
  }
  function saveDraftProfile(profile) {
    return saveJson(STORAGE_KEYS.draftProfile, profile);
  }
  function loadJson(key) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return { ok: true, value: null };
      return { ok: true, value: JSON.parse(raw) };
    } catch (error) {
      return { ok: false, error, value: null };
    }
  }
  function saveJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }

  // products/issue-triage-field-planner/src/app.js
  var params = new URLSearchParams(window.location.search);
  var forceStorageDisabled = params.get("storage") === "off";
  var forceCopyFallback = params.get("copy") === "fallback";
  var state = {
    brief: null,
    view: "founder",
    storageDisabled: forceStorageDisabled || !storageAvailable(),
    copyFallbackVisible: false,
    lastMessage: ""
  };
  var elements = {
    form: document.querySelector("#brand-form"),
    appName: document.querySelector("#app-name"),
    provider: document.querySelector("#provider"),
    currentModel: document.querySelector("#current-model"),
    workload: document.querySelector("#workload"),
    region: document.querySelector("#region"),
    monthlyRequests: document.querySelector("#monthly-requests"),
    reviewModels: document.querySelector("#review-models"),
    reviewHint: document.querySelector("#review-hint"),
    appNameError: document.querySelector("#app-name-error"),
    providerError: document.querySelector("#provider-error"),
    currentModelError: document.querySelector("#current-model-error"),
    workloadError: document.querySelector("#workload-error"),
    regionError: document.querySelector("#region-error"),
    monthlyRequestsError: document.querySelector("#monthly-requests-error"),
    storageNotice: document.querySelector("#storage-notice"),
    restoreBanner: document.querySelector("#restore-banner"),
    restoreButton: document.querySelector("#restore-button"),
    resetButton: document.querySelector("#reset-button"),
    emptyState: document.querySelector("#empty-state"),
    reportShell: document.querySelector("#report-shell"),
    generatedAt: document.querySelector("#generated-at"),
    scoreGrid: document.querySelector("#score-grid"),
    summaryGrid: document.querySelector("#summary-grid"),
    promptList: document.querySelector("#prompt-list"),
    readinessList: document.querySelector("#readiness-list"),
    actionList: document.querySelector("#action-list"),
    copyButton: document.querySelector("#copy-button"),
    downloadButton: document.querySelector("#download-button"),
    reviewButton: document.querySelector("#review-button"),
    reviewPanel: document.querySelector("#review-panel"),
    reviewMarkdown: document.querySelector("#review-markdown"),
    selectFallback: document.querySelector("#select-review-button"),
    closeFallback: document.querySelector("#close-review-button"),
    viewInputs: document.querySelectorAll('input[name="report-view"]'),
    presetButtons: document.querySelectorAll("[data-preset]")
  };
  init();
  function init() {
    bindEvents();
    restoreDraft();
    refreshStorageState();
    render();
  }
  function bindEvents() {
    elements.form.addEventListener("submit", (event) => {
      event.preventDefault();
      generateFromForm();
    });
    elements.form.addEventListener("input", () => {
      saveDraft();
      setGenerateLabel();
    });
    elements.presetButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const preset = getPreset(button.dataset.preset);
        if (!preset) return;
        fillForm(preset.profile);
        generateFromForm({ fromPreset: true });
      });
    });
    elements.restoreButton.addEventListener("click", () => {
      if (state.storageDisabled) return;
      const loaded = loadLastBrief();
      if (loaded.ok && loaded.value?.schemaVersion === 1) {
        state.brief = loaded.value;
        fillForm(loaded.value.profile);
        state.lastMessage = "Restored last brief from this browser.";
        state.copyFallbackVisible = false;
        render();
      }
    });
    elements.resetButton.addEventListener("click", () => {
      const confirmed = window.confirm("Reset demo data and clear the saved Issue Triage Field Planner brief from this browser?");
      if (!confirmed) return;
      state.brief = null;
      state.copyFallbackVisible = false;
      clearErrors();
      fillForm({
        appName: "",
        provider: "",
        currentModel: "",
        reviewModels: [],
        workload: "",
        region: "",
        monthlyRequests: "",
        objective: "speed-up-ci",
        createdAt: ""
      });
      if (!state.storageDisabled) clearSavedState();
      state.lastMessage = "Reset complete. Start a new deterministic triage brief.";
      refreshStorageState();
      render();
    });
    elements.viewInputs.forEach((input) => {
      input.addEventListener("change", () => {
        state.view = input.value;
        renderReport();
      });
    });
    elements.copyButton.addEventListener("click", async () => {
      if (!state.brief) return;
      const markdown = buildMarkdown(state.brief, state.view);
      const result = await copyMarkdown(markdown, forceCopyFallback);
      if (result.ok) {
        state.copyFallbackVisible = false;
        state.lastMessage = "Markdown triage plan copied to clipboard.";
      } else {
        state.copyFallbackVisible = true;
        state.lastMessage = `Clipboard copy unavailable. ${result.reason || "Use the fallback panel."}`;
      }
      renderReport();
    });
    elements.downloadButton.addEventListener("click", () => {
      if (!state.brief) return;
      const markdown = buildMarkdown(state.brief, state.view);
      const fileName = downloadMarkdown(state.brief, markdown);
      state.lastMessage = `Downloaded ${fileName}.`;
      renderReport();
    });
    elements.reviewButton.addEventListener("click", () => {
      state.copyFallbackVisible = true;
      state.lastMessage = "Markdown fallback opened for manual copy.";
      renderReport();
    });
    elements.selectFallback.addEventListener("click", () => {
      elements.reviewMarkdown.focus();
      elements.reviewMarkdown.select();
    });
    elements.closeFallback.addEventListener("click", () => {
      state.copyFallbackVisible = false;
      renderReport();
    });
  }
  function generateFromForm() {
    clearErrors();
    const raw = readForm();
    const validation = validateProfile(raw);
    if (!validation.ok) {
      renderValidation(validation);
      state.lastMessage = "Fix the highlighted fields before generating a triage brief.";
      render();
      return;
    }
    const submit = elements.form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Building deterministic triage plan...";
    window.setTimeout(() => {
      state.brief = generateBrief(validation.profile);
      state.copyFallbackVisible = false;
      state.lastMessage = "Brief generated as a deterministic issue triage simulation.";
      if (!state.storageDisabled) {
        const saveResult = saveLastBrief(state.brief);
        if (!saveResult.ok) {
          state.storageDisabled = true;
          state.lastMessage = "Brief generated. Storage is unavailable, so restore is disabled.";
        }
      }
      renderValidation(validation);
      refreshStorageState();
      render();
      submit.disabled = false;
      setGenerateLabel();
    }, 220);
  }
  function readForm() {
    return {
      appName: elements.appName.value,
      provider: elements.provider.value,
      currentModel: elements.currentModel.value,
      workload: elements.workload.value,
      region: elements.region.value,
      monthlyRequests: elements.monthlyRequests.value,
      objective: document.querySelector('input[name="objective"]:checked')?.value || "speed-up-ci",
      reviewModels: elements.reviewModels.value.split("\n").map((line, index) => parseInventoryRow2(line, index)).filter(Boolean)
    };
  }
  function parseInventoryRow2(line, index) {
    const raw = line.trim();
    if (!raw) return null;
    const parts = raw.split(/[|,]/).map((part) => part.trim());
    return {
      id: `step-${index + 1}`,
      name: parts[0] || "",
      dependency: parts[1] || "",
      owner: parts[2] || "",
      risk: parts[3] || "watch"
    };
  }
  function fillForm(profile) {
    elements.appName.value = profile.appName || "";
    elements.provider.value = profile.provider || "";
    elements.currentModel.value = profile.currentModel || "";
    elements.workload.value = profile.workload || "";
    elements.region.value = profile.region || "";
    elements.monthlyRequests.value = profile.monthlyRequests || "";
    const objectiveInput = document.querySelector(`input[name="objective"][value="${profile.objective || "speed-up-ci"}"]`);
    if (objectiveInput) objectiveInput.checked = true;
    elements.reviewModels.value = (profile.reviewModels || []).map((review) => {
      if (typeof review === "string") return review;
      return [review.name, review.dependency, review.owner, review.risk].filter(Boolean).join(" | ");
    }).join("\n");
    saveDraft();
    setGenerateLabel();
  }
  function restoreDraft() {
    if (state.storageDisabled) return;
    const draft = loadDraftProfile();
    if (draft.ok && draft.value) fillForm(draft.value);
  }
  function saveDraft() {
    if (state.storageDisabled) return;
    saveDraftProfile(readForm());
  }
  function refreshStorageState() {
    if (state.storageDisabled) {
      elements.storageNotice.hidden = false;
      elements.storageNotice.textContent = storageDisabledMessage();
      elements.restoreBanner.hidden = true;
      return;
    }
    elements.storageNotice.hidden = !state.lastMessage;
    elements.storageNotice.textContent = state.lastMessage || "";
    const loaded = loadLastBrief();
    elements.restoreBanner.hidden = !(loaded.ok && loaded.value?.schemaVersion === 1 && !state.brief);
  }
  function render() {
    refreshStorageState();
    elements.emptyState.hidden = Boolean(state.brief);
    elements.reportShell.hidden = !state.brief;
    if (state.brief) renderReport();
    setGenerateLabel();
  }
  function renderReport() {
    if (!state.brief) return;
    const brief = state.brief;
    const copy = VIEW_COPY[state.view] || VIEW_COPY.founder;
    elements.copyButton.textContent = copy.copyCta;
    elements.downloadButton.textContent = copy.downloadCta;
    elements.generatedAt.textContent = `${SIMULATION_NOTICE} Generated ${formatDate(brief.generatedAt)}`;
    replaceChildren(elements.scoreGrid, [
      metricCard(`${brief.score.overall}`, `Overall triage readiness - ${scoreBand(brief.score.overall)}`),
      metricCard(`${brief.findings.length}`, "issue rows"),
      metricCard(`${brief.score.impactSplit}`, "duplicate coverage"),
      metricCard(`${brief.score.ownerClarity}`, "owner clarity")
    ]);
    replaceChildren(elements.summaryGrid, [
      summaryCard("Issue snapshot", `${brief.profile.appName} comparing ${brief.profile.provider} while tracking the shared signals across ${brief.profile.region}.`),
      summaryCard("Issue gap", brief.summary.impactGap),
      summaryCard("Next step focus", `${copy.framing} Priority: ${brief.summary.topAction}`)
    ]);
    replaceChildren(elements.promptList, brief.findings.map((finding) => promptCard(brief, finding)));
    replaceChildren(elements.readinessList, brief.readiness.map(readinessCard));
    replaceChildren(elements.actionList, brief.actions.map(actionCard));
    const markdown = buildMarkdown(brief, state.view);
    elements.reviewMarkdown.value = markdown;
    elements.reviewPanel.hidden = !state.copyFallbackVisible;
    elements.storageNotice.hidden = !state.storageDisabled && !state.lastMessage;
    elements.storageNotice.textContent = state.storageDisabled ? storageDisabledMessage() : state.lastMessage || "";
  }
  function metricCard(value, label) {
    const card = el("article", "metric-card");
    const strong = el("strong");
    strong.textContent = value;
    const span = el("span");
    span.textContent = label;
    card.append(strong, span);
    return card;
  }
  function summaryCard(title, text) {
    const card = el("article", "summary-card");
    const heading = el("h3");
    heading.textContent = title;
    const copy = el("p");
    copy.textContent = text;
    card.append(heading, copy);
    return card;
  }
  function promptCard(brief, finding) {
    const prompt = brief.prompts.find((item) => item.id === finding.promptId);
    const card = el("article", "prompt-card");
    card.append(
      cell("Issue row", prompt?.prompt || finding.promptId),
      statusCell(finding.status),
      cell("Lane", INTENT_GROUPS[prompt?.intentGroup] || prompt?.intentGroup || ""),
      cell("Source gap", SOURCE_GAPS[finding.likelySourceGap] || finding.likelySourceGap),
      cell("Recommended action", finding.recommendedAction)
    );
    if (finding.topAlternatives?.length) {
      card.append(cell("Owner pressure", finding.topAlternatives.join(", ")));
    }
    return card;
  }
  function cell(label, value) {
    const wrapper = el("div", "prompt-cell");
    const labelNode = el("span", "prompt-label");
    labelNode.textContent = label;
    const valueNode = el("div", "prompt-value");
    valueNode.textContent = value || "None";
    wrapper.append(labelNode, valueNode);
    return wrapper;
  }
  function statusCell(status) {
    const wrapper = el("div", "prompt-cell");
    const label = el("span", "prompt-label");
    label.textContent = "Mode";
    const pill = el("span", `status-pill status-${status}`);
    pill.textContent = STATUS_LABELS[status] || status;
    wrapper.append(label, pill);
    return wrapper;
  }
  function readinessCard(check) {
    const card = el("article", "readiness-card");
    const pill = el("span", `status-pill state-${check.state}`);
    pill.textContent = check.state;
    const heading = el("h3");
    heading.textContent = check.label;
    const detail = el("p");
    detail.textContent = check.detail;
    card.append(pill, heading, detail);
    return card;
  }
  function actionCard(action) {
    const card = el("article", "action-card");
    const meta = el("div", "action-meta");
    const impact = el("span");
    impact.textContent = `Priority ${action.impact}/5`;
    const effort = el("span");
    effort.textContent = `Effort ${action.effort}/5`;
    meta.append(impact, effort);
    const heading = el("h3");
    heading.textContent = action.title;
    const why = el("p");
    why.textContent = action.why;
    card.append(meta, heading, why);
    return card;
  }
  function renderValidation(validation) {
    clearErrors();
    elements.appNameError.textContent = validation.errors.appName || "";
    elements.providerError.textContent = validation.errors.provider || "";
    elements.currentModelError.textContent = validation.errors.currentModel || "";
    elements.workloadError.textContent = validation.errors.workload || "";
    elements.regionError.textContent = validation.errors.region || "";
    elements.monthlyRequestsError.textContent = validation.errors.monthlyRequests || "";
    elements.reviewHint.textContent = validation.notes.length ? validation.notes.join(" ") : "Optional. Extra rows are ignored after the first 6 issue rows.";
  }
  function clearErrors() {
    elements.appNameError.textContent = "";
    elements.providerError.textContent = "";
    elements.currentModelError.textContent = "";
    elements.workloadError.textContent = "";
    elements.regionError.textContent = "";
    elements.monthlyRequestsError.textContent = "";
  }
  function setGenerateLabel() {
    const submit = elements.form.querySelector('button[type="submit"]');
    if (!submit.disabled) submit.textContent = state.brief ? "Regenerate triage plan" : "Generate triage plan";
  }
  function el(tag, className = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }
  function replaceChildren(parent, children) {
    parent.replaceChildren(...children);
  }
  function formatDate(value) {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }
  function storageDisabledMessage() {
    const prefix = state.lastMessage ? `${state.lastMessage} ` : "";
    return `${prefix}Storage disabled: you can still generate, copy, and download reports, but restore will not be available. Test with ?storage=off.`;
  }
})();
