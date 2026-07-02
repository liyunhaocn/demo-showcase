var AgentRepoTrustScanner = (() => {
  // products/agent-repo-trust-scanner/src/model.js
  var SIMULATION_NOTICE = "Demo simulation: deterministic Agent repo trust scanning, no live API calls.";
  var INTENT_GROUPS = {
    "pilot-coverage": "Pilot coverage",
    "budget-gate": "Budget gate",
    "policy-gate": "Policy gate",
    "rollout-view": "Trust board fit"
  };
  var STATUS_LABELS = {
    critical: "Hold trust lane",
    watch: "Needs owner",
    opportunity: "Ready to enable",
    "no-action": "Already covered"
  };
  var SOURCE_GAPS = {
    "owner-map": "Assign a repo owner before the trust review",
    "budget-cap": "Set an active committer budget",
    "policy-review": "Confirm code review and Autofix policy",
    "rollout-view": "Align the trust board",
    "security-gate": "Add a security review gate",
    "enablement-note": "Add a trust note before enabling",
    "coverage-gap": "Add a trust coverage note"
  };
  var VIEW_COPY = {
    founder: {
      reportTitle: "Trust lead brief",
      framing: "Enable Code Quality first on repos that already have owners, budgets, and review gates.",
      copyCta: "Copy trust scan",
      downloadCta: "Download client-ready report"
    },
    consultant: {
      reportTitle: "Platform engineer brief",
      framing: "Treat this as a trust and budget problem: pilot the ready repos, gate the risky ones, and delay the noisy ones.",
      copyCta: "Copy trust scan",
      downloadCta: "Download client-ready report"
    }
  };
  var STORAGE_KEYS = {
    lastBrief: "agentrepotrustscanner:lastBrief:v1",
    draftProfile: "agentrepotrustscanner:draftProfile:v1"
  };
  function scoreBand(score) {
    if (score >= 80) return "Trust ready";
    if (score >= 55) return "Needs routing";
    return "Needs cleanup";
  }

  // products/agent-repo-trust-scanner/src/export.js
  function buildMarkdown(brief, view = "founder") {
    const copy = VIEW_COPY[view] || VIEW_COPY.founder;
    const lines = [
      `# Agent Repo Trust Scanner - ${copy.reportTitle}`,
      "",
      SIMULATION_NOTICE,
      "",
      "## Fleet profile",
      "",
      `- Fleet: ${brief.profile.appName}`,
      `- Source: ${brief.profile.provider}`,
      `- Trust goal: ${brief.profile.currentModel}`,
      `- Repo target: ${brief.profile.workload}`,
      `- Owning team: ${brief.profile.region}`,
      `- Active committers: ${brief.profile.monthlyRequests || "Not set"}`,
      `- Objective: ${objectiveLabel(brief.profile.objective)}`,
      `- Generated date: ${brief.generatedAt}`,
      "",
      "## Trust summary",
      "",
      `- Overall score: ${brief.score.overall}/100`,
      `- Coverage score: ${brief.score.coverageSplit}/100`,
      `- Owner clarity: ${brief.score.ownerClarity}/100`,
      `- Action clarity: ${brief.score.actionClarity}/100`,
      `- Safety: ${brief.score.safety}/100`,
      "",
      "## Trust questions",
      "",
      ...brief.prompts.map((prompt) => `- ${prompt.prompt}`),
      "",
      "## Repo matrix",
      "",
      "| Repo | Gate | Owner | Mode | Status | Gap | Recommended action |",
      "|---|---|---|---|---|---|---|",
      ...brief.findings.map((finding) => `| ${finding.promptId} | ${finding.dependency || "\u2014"} | ${finding.owner || "\u2014"} | ${finding.rolloutMode} | ${statusLabel(finding.status)} | ${gapLabel(finding.likelySourceGap)} | ${escapePipe(finding.recommendedAction)} |`),
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
      "This deterministic simulation proves the trust graph. A future product would validate against live GitHub Code Quality data before automation decisions."
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
    const fileName = `${slugify(brief.profile.appName || "trust-report")}-code-quality-brief.md`;
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
    if (objective === "control-budget") return "Control budget";
    if (objective === "policy-ready") return "Policy ready";
    return "Reduce trust risk";
  }
  function statusLabel(status) {
    return {
      critical: "Hold trust lane",
      watch: "Needs owner",
      opportunity: "Ready to enable",
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

  // products/agent-repo-trust-scanner/src/presets.js
  var PRESETS = [
    {
      id: "clean-repo-trap",
      label: "Clean repo trap",
      profile: {
        appName: "Trusted repo lane",
        provider: "GitHub Code Quality GA, Copilot code review controls, and clean-repo trust checks",
        currentModel: "Enable code quality only on repos with owner coverage, policy gates, and review baselines before the trust lane widens",
        reviewModels: [
          "checkout-service | ready for trust pilot | Platform owner | opportunity",
          "payments-api | missing owner gate | Backend lead | watch",
          "docs-site | already covered | Docs owner | no-action",
          "mobile-app | security review pending | Mobile owner | critical",
          "design-system | autofix off by policy | Frontend owner | watch",
          "search-service | trust-ready | Search owner | opportunity"
        ],
        workload: "repository fleet",
        region: "platform and engineering",
        monthlyRequests: "6",
        objective: "reduce-trust-risk"
      }
    },
    {
      id: "budget-guard",
      label: "Budget guard",
      profile: {
        appName: "Budget guard",
        provider: "AI usage metrics, cost centers, and code quality pricing",
        currentModel: "Keep code quality adoption inside a predictable budget for active committers and review minutes",
        reviewModels: [
          "monorepo-core | active committer spike | Platform owner | critical",
          "billing-service | budget cap needed | FinOps owner | watch",
          "customer-support | low-risk pilot | Support owner | opportunity",
          "release-branch | already routed | Release owner | no-action",
          "ops-tooling | review minutes unclear | DevEx owner | watch",
          "analytics-pipeline | high-change repo | Data owner | critical"
        ],
        workload: "billing and trust queue",
        region: "engineering finance and platform",
        monthlyRequests: "6",
        objective: "control-budget"
      }
    },
    {
      id: "policy-ready",
      label: "Policy ready",
      profile: {
        appName: "Policy ready",
        provider: "Strict marketplaces, Copilot code review, and security validation",
        currentModel: "Enable Code Quality only where policy, owner, and security gates are already in place",
        reviewModels: [
          "security-agent | marketplace policy unclear | Security owner | critical",
          "infra-adapter | review gate present | Infra owner | opportunity",
          "admin-console | owner missing | Platform owner | watch",
          "customer-portal | already covered | Product owner | no-action",
          "sdk-client | security review required | SDK owner | critical",
          "ops-dashboard | trust board needs cleanup | Ops owner | watch"
        ],
        workload: "policy and enablement board",
        region: "security and platform engineering",
        monthlyRequests: "6",
        objective: "policy-ready"
      }
    }
  ];
  function getPreset(id) {
    return PRESETS.find((preset) => preset.id === id);
  }

  // products/agent-repo-trust-scanner/src/prompt-generation.js
  var templates = {
    "pilot-coverage": [
      {
        id: "pilot-repo",
        intentGroup: "pilot-coverage",
        priority: "high",
        text: "Which repo in {workload} should be the first trust pilot for GitHub Code Quality?"
      },
      {
        id: "owner-gap",
        intentGroup: "pilot-coverage",
        priority: "high",
        text: "Which repo in {workload} still needs a named owner before trust review can start?"
      },
      {
        id: "review-baseline",
        intentGroup: "pilot-coverage",
        priority: "medium",
        text: "Which repo should lock its review baseline before Copilot code review is enabled?"
      }
    ],
    "budget-gate": [
      {
        id: "cost-cap",
        intentGroup: "budget-gate",
        priority: "high",
        text: "Which repo in {workload} is most likely to break the active committer budget?"
      },
      {
        id: "usage-spike",
        intentGroup: "budget-gate",
        priority: "high",
        text: "Where should {appName} watch for an AI usage spike before turning on Code Quality?"
      },
      {
        id: "budget-note",
        intentGroup: "budget-gate",
        priority: "medium",
        text: "What budget note should {appName} attach so finance and platform agree on trust limits?"
      }
    ],
    "policy-gate": [
      {
        id: "policy-check",
        intentGroup: "policy-gate",
        priority: "high",
        text: "Which repo in {workload} still needs a security or marketplace policy check before enablement?"
      },
      {
        id: "autofix-gate",
        intentGroup: "policy-gate",
        priority: "high",
        text: "Which repo should keep Autofix disabled until the security owner signs off?"
      },
      {
        id: "policy-brief",
        intentGroup: "policy-gate",
        priority: "medium",
        text: "How should {appName} brief the owner so policy exceptions stay visible?"
      }
    ],
    "rollout-view": [
      {
        id: "rollout-view-fit",
        intentGroup: "rollout-view",
        priority: "high",
        text: "Which trust board in {appName} should be updated so the team sees trusted repos first?"
      },
      {
        id: "rollout-filter",
        intentGroup: "rollout-view",
        priority: "medium",
        text: "What filter in {workload} should change first to keep risky repos and ready repos in the same board?"
      },
      {
        id: "rollout-share",
        intentGroup: "rollout-view",
        priority: "medium",
        text: "How should {appName} share a trust board so engineering and finance see the same enablement queue?"
      }
    ]
  };
  var objectiveOrder = {
    "reduce-trust-risk": ["pilot-coverage", "policy-gate", "budget-gate", "rollout-view"],
    "control-budget": ["budget-gate", "pilot-coverage", "policy-gate", "rollout-view"],
    "policy-ready": ["policy-gate", "pilot-coverage", "rollout-view", "budget-gate"]
  };
  function generatePrompts(profile) {
    const order = objectiveOrder[profile.objective] || objectiveOrder["reduce-trust-risk"];
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
    const inventoryText = profile.reviewModels.length ? profile.reviewModels.map((model) => model.name).join(", ") : "known trust targets";
    return template.replaceAll("{appName}", profile.appName).replaceAll("{provider}", profile.provider).replaceAll("{currentModel}", profile.currentModel).replaceAll("{workload}", profile.workload || "the current repo fleet").replaceAll("{region}", profile.region || "the current owner group").replaceAll("{reviewModels}", inventoryText);
  }

  // products/agent-repo-trust-scanner/src/scoring.js
  var DEFAULT_ROWS = [
    {
      name: "checkout-service",
      dependency: "ready for pilot",
      owner: "Platform owner",
      risk: "opportunity"
    },
    {
      name: "payments-api",
      dependency: "missing owner gate",
      owner: "Backend lead",
      risk: "watch"
    },
    {
      name: "docs-site",
      dependency: "already covered",
      owner: "Docs owner",
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
      objective: input.objective || "reduce-trust-risk",
      createdAt: input.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  function validateProfile(input) {
    const errors = {};
    const normalized = normalizeProfile(input);
    const parsedRows = normalizeInventoryRows(input.reviewModels || []);
    const notes = [];
    if (!normalized.appName) {
      errors.appName = "Repo name is required to generate a trust report.";
    }
    if (!normalized.provider) {
      errors.provider = "Repo source is required to generate a trust report.";
    }
    if (!normalized.currentModel) {
      errors.currentModel = "Trust goal is required to generate a trust report.";
    }
    if (!normalized.workload) {
      errors.workload = "Repo target is required to generate a trust report.";
    }
    if (!normalized.region) {
      errors.region = "Owning team is required to generate a trust report.";
    }
    if (input.monthlyRequests && !isPositiveInteger(input.monthlyRequests)) {
      errors.monthlyRequests = "Setup step count must be a whole number greater than zero.";
    }
    if (!parsedRows.length) {
      notes.push("Add at least 3 repos before a realistic trust review.");
    } else if (parsedRows.length < 6) {
      notes.push("Add up to 6 repos to exercise the full matrix.");
    } else if (parsedRows.length > 6) {
      notes.push("Only the first 6 repos are used in this deterministic demo.");
    }
    const missingOwnerRows = parsedRows.filter((row) => !row.owner);
    if (missingOwnerRows.length) {
      notes.push("Owner names are optional, but the matrix is clearer when each repo has a named owner.");
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
      id: `agentrepotrustscanner-${slugify2(profile.appName || profile.provider)}-${seed}`,
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
        rolloutMode: modeForStatus(status, row),
        prompt: promptForRow(row, prompts, index)
      };
    });
  }
  function classifyStatus(profile, row, bucket) {
    const text = `${profile.provider} ${profile.currentModel} ${profile.workload} ${row.name} ${row.dependency} ${row.risk}`.toLowerCase();
    const explicit = normalizeRisk(row.risk);
    if (containsAny(text, ["already covered", "covered", "pilot-ready", "ready for pilot"])) {
      return explicit === "critical" ? "watch" : "opportunity";
    }
    if (containsAny(text, ["budget", "committer", "pricing", "minutes", "cost"])) {
      return explicit === "opportunity" ? "watch" : explicit === "critical" ? "critical" : "watch";
    }
    if (containsAny(text, ["policy", "security", "autofix", "marketplace"])) {
      return explicit === "opportunity" ? "watch" : "critical";
    }
    if (containsAny(text, ["owner", "assignee", "unassigned", "gate"])) {
      return explicit === "critical" ? "critical" : "watch";
    }
    if (containsAny(text, ["view", "filter", "coverage", "baseline"])) {
      return explicit === "critical" ? "watch" : "opportunity";
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
    if (status === "critical") return /budget|pricing|minutes/i.test(`${row.name} ${row.dependency}`) ? "budget-gate" : "policy-gate";
    if (status === "watch") return /owner|assignee|gate/i.test(`${row.name} ${row.dependency}`) ? "owner-gate" : "rollout-view";
    if (status === "opportunity") return /view|coverage|baseline|pilot/i.test(`${row.name} ${row.dependency}`) ? "pilot-coverage" : "rollout-view";
    return "rollout-view";
  }
  function pickSourceGap(status, row, bucket) {
    if (status === "critical") {
      if (/budget|pricing|minutes/i.test(`${row.name} ${row.dependency}`)) return "budget-cap";
      if (/security|policy|autofix|marketplace/i.test(`${row.name} ${row.dependency}`)) return "policy-review";
      return "security-gate";
    }
    if (status === "watch") {
      if (!row.owner) return "owner-map";
      if (/budget|pricing|minutes/i.test(`${row.name} ${row.dependency}`)) return "budget-cap";
      return /view|filter|coverage|baseline/i.test(`${row.name} ${row.dependency}`) ? "rollout-view" : "enablement-note";
    }
    if (status === "opportunity") {
      return /view|filter|coverage|baseline/i.test(`${row.name} ${row.dependency}`) ? "rollout-view" : "coverage-gap";
    }
    return bucket % 2 === 0 ? "coverage-gap" : "rollout-view";
  }
  function actionFor(profile, row, status, gap) {
    const repo = row.name || "this repo";
    const owner = row.owner || "the owner";
    const dependency = row.dependency || "the repo fleet";
    if (status === "critical") {
      if (gap === "budget-cap") {
        return `Set a hard committer budget on ${repo}, keep ${owner} on the gate, and do not expand the trust lane until pricing stays inside plan.`;
      }
      return `Keep ${repo} behind the policy gate, confirm ${owner} owns the review path, and do not enable the repo until the current blocker is cleared.`;
    }
    if (status === "opportunity") {
      return `Move ${repo} into the trusted lane so ${profile.appName} can enable Code Quality with the right coverage and views.`;
    }
    if (status === "watch") {
      return `Assign ${owner} to ${repo} and confirm the next trust scan has the gate or field needed to move it forward.`;
    }
    if (gap === "owner-map") {
      return `Record an owner for ${repo} before the next sweep so the trust queue has a clear checker.`;
    }
    return `Keep ${repo} on the trust watch list and attach a note if the same blocker appears again in ${dependency}.`;
  }
  function buildReadiness(profile, findings) {
    const pilotCount = findings.filter((item) => item.status === "opportunity").length;
    const ownerCount = profile.reviewModels.filter((row) => row.owner).length;
    const budgetCount = findings.filter((item) => item.likelySourceGap === "budget-cap").length;
    const policyCount = findings.filter((item) => item.likelySourceGap === "policy-review" || item.likelySourceGap === "security-gate").length;
    const viewCount = findings.filter((item) => item.likelySourceGap === "rollout-view").length;
    return [
      {
        state: pilotCount >= 2 ? "ready" : "watch",
        label: "Pilot coverage",
        detail: pilotCount >= 2 ? `${pilotCount} repo${pilotCount === 1 ? "" : "s"} already look ready for the trusted lane.` : `Only ${pilotCount} repo${pilotCount === 1 ? "" : "s"} are clearly ready for the trusted lane right now.`,
        gap: pilotCount >= 2 ? "" : "coverage-gap"
      },
      {
        state: ownerCount > 0 ? "ready" : "manual",
        label: "Owner map",
        detail: ownerCount > 0 ? `${ownerCount} tracked repo${ownerCount === 1 ? "" : "s"} already has a named owner.` : "No repo currently has a named owner in this preset.",
        gap: ownerCount > 0 ? "" : "owner-map"
      },
      {
        state: budgetCount > 0 ? "watch" : "ready",
        label: "Budget guard",
        detail: budgetCount > 0 ? `${budgetCount} repo${budgetCount === 1 ? "" : "s"} still needs an active committer budget check.` : "The main budget guard already looks ready.",
        gap: budgetCount > 0 ? "budget-cap" : ""
      },
      {
        state: policyCount > 0 ? "watch" : "ready",
        label: "Policy gate",
        detail: policyCount > 0 ? `${policyCount} repo${policyCount === 1 ? "" : "s"} still needs a policy or Autofix review.` : "The policy gate already looks ready.",
        gap: policyCount > 0 ? "policy-review" : ""
      },
      {
        state: viewCount > 0 ? "watch" : "ready",
        label: "Trust board",
        detail: viewCount > 0 ? "The trust board should be tuned so trusted repos surface before noisy ones." : "Add or adjust a trust board so the queue stays visible to the whole team.",
        gap: viewCount > 0 ? "rollout-view" : ""
      }
    ];
  }
  function buildActions(profile, prompts, findings, readiness) {
    const actions = [];
    const criticalItems = findings.filter((item) => item.status === "critical");
    const watchItems = findings.filter((item) => item.status === "watch");
    const opportunityItems = findings.filter((item) => item.status === "opportunity");
    const missingOwners = findings.filter((item) => !item.owner);
    if (opportunityItems.length) {
      actions.push({
        title: "Enable the trusted repos first",
        why: `${opportunityItems.length} repo${opportunityItems.length === 1 ? "" : "s"} are already ready for the trusted lane.`,
        impact: 5,
        effort: 2
      });
    }
    if (criticalItems.length) {
      actions.push({
        title: "Lock the policy and budget gates",
        why: `${criticalItems.length} repo${criticalItems.length === 1 ? "" : "s"} still need a hard gate before the trust lane can widen.`,
        impact: 5,
        effort: 2
      });
    }
    if (missingOwners.length) {
      actions.push({
        title: "Assign an owner to every repo",
        why: `${missingOwners.length} tracked repo${missingOwners.length === 1 ? "" : "s"} still need a named owner before the trust review can close cleanly.`,
        impact: 4,
        effort: 1
      });
    }
    if (watchItems.length) {
      actions.push({
        title: "Update the trust board filters",
        why: `${watchItems.length} repo${watchItems.length === 1 ? "" : "s"} need the queue view to keep blockers and pilots visible.`,
        impact: 3,
        effort: 1
      });
    }
    if (!actions.length) {
      actions.push({
        title: "Keep the fleet as-is",
        why: "This preset already looks routed; the next iteration should validate against live GitHub Code Quality data rather than reworking the graph.",
        impact: 2,
        effort: 1
      });
    }
    return actions.slice(0, 3).map((action, index) => ({
      ...action,
      id: `action-${index + 1}`,
      owner: prompts[index]?.prompt || "Review the plan",
      checkpoint: readiness[index % readiness.length]?.label || "Trust gate"
    }));
  }
  function buildScore(profile, findings, readiness) {
    const total = findings.length || 1;
    const criticalCount = findings.filter((item) => item.status === "critical").length;
    const watchCount = findings.filter((item) => item.status === "watch").length;
    const opportunityCount = findings.filter((item) => item.status === "opportunity").length;
    const noActionCount = findings.filter((item) => item.status === "no-action").length;
    const ownerCount = findings.filter((item) => item.owner).length;
    const budgetGate = readiness.some((item) => item.gap === "budget-cap") ? 1 : 0;
    const policyGate = readiness.some((item) => item.gap === "policy-review" || item.gap === "security-gate") ? 1 : 0;
    const viewGate = readiness.some((item) => item.gap === "rollout-view") ? 1 : 0;
    const coverageSplit = clamp(
      Math.round(34 + opportunityCount * 16 + noActionCount * 8 - criticalCount * 10 - watchCount * 4)
    );
    const ownerClarity = clamp(Math.round(45 + ownerCount * 9 - (total - ownerCount) * 8));
    const actionClarity = clamp(Math.round(48 + opportunityCount * 7 + watchCount * 5 - criticalCount * 3 + budgetGate * 4 + policyGate * 4 + viewGate * 4));
    const safety = clamp(Math.round(54 + (readiness[0]?.state === "ready" ? 10 : -14) - criticalCount * 5 + budgetGate * 4 + policyGate * 4));
    const overall = clamp(Math.round(coverageSplit * 0.35 + ownerClarity * 0.2 + actionClarity * 0.2 + safety * 0.25));
    return {
      overall,
      coverageSplit,
      ownerClarity,
      actionClarity,
      safety,
      summary: bandSummary(profile, overall, coverageSplit, ownerClarity, actionClarity, safety)
    };
  }
  function bandSummary(profile, overall, coverageSplit, ownerClarity, actionClarity, safety) {
    const coverageText = coverageSplit >= 75 ? "most repos can move into a clean trusted lane" : coverageSplit >= 50 ? "a few repos still need coverage cleanup before trust expansion" : "the fleet still needs a serious trust cleanup pass";
    const ownerText = ownerClarity >= 75 ? "owner coverage is clear" : "owner gaps still need cleanup";
    const safetyText = safety >= 75 ? "policy and budget gates look controlled" : "the policy or budget gate still needs attention";
    return `${profile.appName || "This fleet"} ${coverageText}, ${ownerText}, and ${safetyText}. Action clarity is ${actionClarity}/100 with an overall score of ${overall}/100.`;
  }
  function buildSummary(profile, findings, actions, score) {
    const criticalCount = findings.filter((item) => item.status === "critical").length;
    const pilotCount = findings.filter((item) => item.status === "opportunity").length;
    const ownerCount = findings.filter((item) => item.owner).length;
    const missingOwnerCount = findings.length - ownerCount;
    return {
      coverageGap: `${criticalCount} hard gate${criticalCount === 1 ? "" : "s"} and ${pilotCount} trust-ready repo${pilotCount === 1 ? "" : "s"} are highlighted in the matrix.`,
      ownerGap: missingOwnerCount > 0 ? `${missingOwnerCount} repo${missingOwnerCount === 1 ? "" : "s"} still need a named owner before the next sweep.` : "Every tracked repo has a clear owner or checker.",
      topAction: actions[0]?.title || "Keep the fleet as-is",
      scoreNote: `${score.overall}/100 overall based on the current deterministic Agent repo trust simulation.`
    };
  }
  function promptForRow(row, prompts, index) {
    return prompts[index % prompts.length]?.prompt || row.name || `Repo ${index + 1}`;
  }
  function topAlternativesFor(status, row) {
    const nextStep = modeForStatus(status, row);
    if (status === "critical") return [nextStep, "rollout-view", "pilot-coverage"];
    if (status === "watch") return [nextStep, "owner-gate", "rollout-view"];
    if (status === "opportunity") return ["pilot-coverage", "rollout-view", "owner-gate"];
    return ["rollout-view", "pilot-coverage", "owner-gate"];
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
    if (["critical", "blocker", "gate", "policy-blocked", "budget-risk"].includes(raw)) return "critical";
    if (["opportunity", "route-ready", "field-ready", "saved-view", "pilot-ready"].includes(raw)) return "opportunity";
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

  // products/agent-repo-trust-scanner/src/storage.js
  function storageAvailable() {
    try {
      const testKey = "agentrepotrustscanner:storage-test";
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

  // products/agent-repo-trust-scanner/src/app.js
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
      const confirmed = window.confirm("Reset demo data and clear the saved Agent Repo Trust Scanner brief from this browser?");
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
        objective: "reduce-trust-risk",
        createdAt: ""
      });
      if (!state.storageDisabled) clearSavedState();
      state.lastMessage = "Reset complete. Start a new deterministic trust report.";
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
        state.lastMessage = "Markdown trust report copied to clipboard.";
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
      state.lastMessage = "Fix the highlighted fields before generating a trust report.";
      render();
      return;
    }
    const submit = elements.form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Building deterministic trust report...";
    window.setTimeout(() => {
      state.brief = generateBrief(validation.profile);
      state.copyFallbackVisible = false;
      state.lastMessage = "Brief generated as a deterministic repo trust simulation.";
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
      objective: document.querySelector('input[name="objective"]:checked')?.value || "reduce-trust-risk",
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
    const objectiveInput = document.querySelector(`input[name="objective"][value="${profile.objective || "reduce-trust-risk"}"]`);
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
      metricCard(`${brief.score.overall}`, `Overall trust readiness - ${scoreBand(brief.score.overall)}`),
      metricCard(`${brief.findings.length}`, "repo rows"),
      metricCard(`${brief.score.coverageSplit}`, "coverage score"),
      metricCard(`${brief.score.ownerClarity}`, "owner clarity")
    ]);
    replaceChildren(elements.summaryGrid, [
      summaryCard("Fleet snapshot", `${brief.profile.appName} comparing ${brief.profile.provider} while tracking the shared signals across ${brief.profile.region}.`),
      summaryCard("Coverage gap", brief.summary.coverageGap),
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
      cell("Repo row", prompt?.prompt || finding.promptId),
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
    elements.reviewHint.textContent = validation.notes.length ? validation.notes.join(" ") : "Optional. Extra rows are ignored after the first 6 repo rows.";
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
    if (!submit.disabled) submit.textContent = state.brief ? "Regenerate trust scan" : "Generate trust scan";
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
