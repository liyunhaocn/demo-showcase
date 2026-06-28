var ActionsParallelismPlanner = (() => {
  // products/actions-parallelism-planner/src/model.js
  var SIMULATION_NOTICE = "Demo simulation: deterministic GitHub Actions parallelization planning, no live workflow analysis.";
  var INTENT_GROUPS = {
    "parallel-opportunity": "Parallel opportunity",
    "sequence-gate": "Sequence gate",
    "owner-checkpoint": "Owner checkpoint",
    "cancel-plan": "Cancel / rollback plan"
  };
  var STATUS_LABELS = {
    critical: "Serial gate",
    watch: "Needs wait / gate",
    opportunity: "Parallel-safe",
    "no-action": "Already safe"
  };
  var SOURCE_GAPS = {
    "parallel-lane": "Can split into a background lane",
    "release-gate": "Keep this step serial",
    "owner-map": "Missing owner or approver",
    "log-fanout": "Split logs or group the output",
    "wait-link": "Add wait / wait-all link",
    "cancel-path": "Add a cancel or rollback path"
  };
  var VIEW_COPY = {
    founder: {
      reportTitle: "Release lead brief",
      framing: "Use the critical rows first and protect release gates before parallelizing further.",
      copyCta: "Copy parallel plan",
      downloadCta: "Download client-ready report"
    },
    consultant: {
      reportTitle: "Workflow engineer brief",
      framing: "Treat this as a step-graph review: isolate safe background work, then keep the gate serial.",
      copyCta: "Copy parallel plan",
      downloadCta: "Download client-ready report"
    }
  };
  var STORAGE_KEYS = {
    lastBrief: "actionsparallelismplanner:lastBrief:v1",
    draftProfile: "actionsparallelismplanner:draftProfile:v1"
  };
  function scoreBand(score) {
    if (score >= 80) return "Parallel ready";
    if (score >= 55) return "Needs gating";
    return "Needs sequencing";
  }

  // products/actions-parallelism-planner/src/export.js
  function buildMarkdown(brief, view = "founder") {
    const copy = VIEW_COPY[view] || VIEW_COPY.founder;
    const lines = [
      `# Actions Parallelism Planner - ${copy.reportTitle}`,
      "",
      SIMULATION_NOTICE,
      "",
      "## Workflow profile",
      "",
      `- Workflow: ${brief.profile.appName}`,
      `- Source: ${brief.profile.provider}`,
      `- Goal: ${brief.profile.currentModel}`,
      `- Repo / pipeline: ${brief.profile.workload}`,
      `- Owning team: ${brief.profile.region}`,
      `- Step count: ${brief.profile.monthlyRequests || "Not set"}`,
      `- Objective: ${objectiveLabel(brief.profile.objective)}`,
      `- Generated date: ${brief.generatedAt}`,
      "",
      "## Parallel summary",
      "",
      `- Overall score: ${brief.score.overall}/100`,
      `- Parallel lanes: ${brief.score.impactSplit}/100`,
      `- Owner clarity: ${brief.score.ownerClarity}/100`,
      `- Action clarity: ${brief.score.actionClarity}/100`,
      `- Safety: ${brief.score.safety}/100`,
      "",
      "## Parallel questions",
      "",
      ...brief.prompts.map((prompt) => `- ${prompt.prompt}`),
      "",
      "## Parallelization matrix",
      "",
      "| Step | Dependency | Owner | Mode | Status | Parallel gap | Recommended action |",
      "|---|---|---|---|---|---|---|",
      ...brief.findings.map((finding) => `| ${finding.promptId} | ${finding.dependency || "\u2014"} | ${finding.owner || "\u2014"} | ${finding.parallelMode} | ${statusLabel(finding.status)} | ${gapLabel(finding.likelySourceGap)} | ${escapePipe(finding.recommendedAction)} |`),
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
      "This deterministic simulation proves the workflow graph. A future product would validate against live workflow signals before making automation decisions."
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
    const fileName = `${slugify(brief.profile.appName || "parallel-plan")}-workflow-brief.md`;
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
    if (objective === "safeguard-release") return "Safeguard release";
    if (objective === "reduce-debug-noise") return "Reduce debug noise";
    return "Speed up CI";
  }
  function statusLabel(status) {
    return {
      critical: "Serial gate",
      watch: "Needs wait / gate",
      opportunity: "Parallel-safe",
      "no-action": "Already safe"
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

  // products/actions-parallelism-planner/src/presets.js
  var PRESETS = [
    {
      id: "matrix-build-parallel",
      label: "Matrix build",
      profile: {
        appName: "Monorepo CI",
        provider: "GitHub Actions parallel steps changelog",
        currentModel: "Split lint, tests, and docs into safe background lanes while keeping deploy serial",
        reviewModels: [
          "Lint and typecheck | independent from tests | Platform engineer | opportunity",
          "Unit tests | no deploy access | QA owner | opportunity",
          "Docs build | no repo mutation | Docs owner | no-action",
          "Integration smoke | waits on build artifact | Release owner | watch",
          "Preview deploy | after green smoke | Release owner | critical",
          "Cleanup and cancel | run after failure | Infra owner | watch"
        ],
        workload: "checkout repo",
        region: "platform team",
        monthlyRequests: "6",
        objective: "speed-up-ci"
      }
    },
    {
      id: "release-gate-parallel",
      label: "Release gate",
      profile: {
        appName: "Production release",
        provider: "GitHub Actions workflow and release checklist",
        currentModel: "Protect production deploy while surfacing owner gaps, wait links, and cancel paths",
        reviewModels: [
          "Build artifact | stable output for all branches | Build owner | opportunity",
          "Security scan | blocks release if it fails | Security owner | critical",
          "Staging smoke | must finish before deploy | QA owner | watch",
          "Production deploy | keep serial and manual | Release owner | critical",
          "Rollback check | needed if deploy fails | SRE owner | watch",
          "Release note publish | can run after deploy | Comms owner | no-action"
        ],
        workload: "release pipeline",
        region: "release team",
        monthlyRequests: "6",
        objective: "safeguard-release"
      }
    },
    {
      id: "agentic-workflow-parallel",
      label: "Agentic workflow",
      profile: {
        appName: "Agent workflow graph",
        provider: "GitHub Actions parallel background and wait-all preview",
        currentModel: "Break a longer workflow into independent lanes without losing owner visibility or log clarity",
        reviewModels: [
          "Plan job | no writes, just graph shaping | PM owner | no-action",
          "Tool setup | independent install lane | DevEx owner | opportunity",
          "Policy check | waits on setup logs | Security owner | watch",
          "Main task | depends on policy gate | Agent owner | critical",
          "Audit export | can run in background | QA owner | opportunity",
          "Cancel hook | stops stale lanes | Infra owner | watch"
        ],
        workload: "agent orchestration repo",
        region: "workflow engineering",
        monthlyRequests: "6",
        objective: "reduce-debug-noise"
      }
    }
  ];
  function getPreset(id) {
    return PRESETS.find((preset) => preset.id === id);
  }

  // products/actions-parallelism-planner/src/prompt-generation.js
  var templates = {
    "parallel-opportunity": [
      {
        id: "parallel-lane",
        intentGroup: "parallel-opportunity",
        priority: "high",
        text: "Which step in {workload} can move to a background lane without risking the release?"
      },
      {
        id: "parallel-logs",
        intentGroup: "parallel-opportunity",
        priority: "high",
        text: "Which lane in {appName} needs separate logs so the team can read failures quickly?"
      },
      {
        id: "parallel-split",
        intentGroup: "parallel-opportunity",
        priority: "medium",
        text: "Where can {appName} split work into independent branches without adding more manual review?"
      }
    ],
    "sequence-gate": [
      {
        id: "sequence-gate",
        intentGroup: "sequence-gate",
        priority: "high",
        text: "Which step in {workload} must stay serial because it gates a deploy or a secret?"
      },
      {
        id: "sequence-wait",
        intentGroup: "sequence-gate",
        priority: "high",
        text: "Where should {appName} add a wait or wait-all step before the next lane starts?"
      },
      {
        id: "sequence-risk",
        intentGroup: "sequence-gate",
        priority: "medium",
        text: "Which branch in {appName} becomes unsafe if it is allowed to run in parallel?"
      }
    ],
    "owner-checkpoint": [
      {
        id: "owner-gap",
        intentGroup: "owner-checkpoint",
        priority: "high",
        text: "Which step in {workload} needs an owner before the next run can be considered ready?"
      },
      {
        id: "owner-handoff",
        intentGroup: "owner-checkpoint",
        priority: "medium",
        text: "Who should own the manual checkpoint for {appName} if the parallel branch blocks?"
      },
      {
        id: "owner-summary",
        intentGroup: "owner-checkpoint",
        priority: "medium",
        text: "How should {appName} summarize the owner map so a lead can assign the next action fast?"
      }
    ],
    "cancel-plan": [
      {
        id: "cancel-path",
        intentGroup: "cancel-plan",
        priority: "high",
        text: "Which lane in {workload} needs an explicit cancel or rollback path?"
      },
      {
        id: "cancel-stale",
        intentGroup: "cancel-plan",
        priority: "medium",
        text: "What should {appName} do with stale background lanes when the main gate changes?"
      },
      {
        id: "cancel-brief",
        intentGroup: "cancel-plan",
        priority: "medium",
        text: "How should {appName} brief the team on a failed lane so the next rerun is shorter?"
      }
    ]
  };
  var objectiveOrder = {
    "speed-up-ci": ["parallel-opportunity", "sequence-gate", "owner-checkpoint", "cancel-plan"],
    "safeguard-release": ["sequence-gate", "cancel-plan", "owner-checkpoint", "parallel-opportunity"],
    "reduce-debug-noise": ["owner-checkpoint", "cancel-plan", "parallel-opportunity", "sequence-gate"]
  };
  function generatePrompts(profile) {
    const order = objectiveOrder[profile.objective] || objectiveOrder["speed-up-ci"];
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
    const inventoryText = profile.reviewModels.length ? profile.reviewModels.map((model) => model.name).join(", ") : "known workflow steps";
    return template.replaceAll("{appName}", profile.appName).replaceAll("{provider}", profile.provider).replaceAll("{currentModel}", profile.currentModel).replaceAll("{workload}", profile.workload || "the current repo surface").replaceAll("{region}", profile.region || "the current owner group").replaceAll("{reviewModels}", inventoryText);
  }

  // products/actions-parallelism-planner/src/scoring.js
  var DEFAULT_ROWS = [
    {
      name: "Lint and typecheck",
      dependency: "Independent from release",
      owner: "Platform",
      risk: "opportunity"
    },
    {
      name: "Unit tests",
      dependency: "No deploy access",
      owner: "QA",
      risk: "opportunity"
    },
    {
      name: "Deploy preview",
      dependency: "Waits on green smoke",
      owner: "Release owner",
      risk: "critical"
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
      objective: input.objective || "speed-up-ci",
      createdAt: input.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  function validateProfile(input) {
    const errors = {};
    const normalized = normalizeProfile(input);
    const parsedRows = normalizeInventoryRows(input.reviewModels || []);
    const notes = [];
    if (!normalized.appName) {
      errors.appName = "Workflow name is required to generate a parallel plan.";
    }
    if (!normalized.provider) {
      errors.provider = "GitHub Actions source is required to generate a parallel plan.";
    }
    if (!normalized.currentModel) {
      errors.currentModel = "Workflow goal is required to generate a parallel plan.";
    }
    if (!normalized.workload) {
      errors.workload = "Repo / pipeline is required to generate a parallel plan.";
    }
    if (!normalized.region) {
      errors.region = "Owning team is required to generate a parallel plan.";
    }
    if (input.monthlyRequests && !isPositiveInteger(input.monthlyRequests)) {
      errors.monthlyRequests = "Step count must be a whole number greater than zero.";
    }
    if (!parsedRows.length) {
      notes.push("Add at least 3 workflow steps before a realistic parallel review.");
    } else if (parsedRows.length < 6) {
      notes.push("Add up to 6 workflow steps to exercise the full matrix.");
    } else if (parsedRows.length > 6) {
      notes.push("Only the first 6 workflow steps are used in this deterministic demo.");
    }
    const missingOwnerRows = parsedRows.filter((row) => !row.owner);
    if (missingOwnerRows.length) {
      notes.push("Owner names are optional, but the matrix is clearer when each step has a named owner.");
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
      id: `actionsparallelismplanner-${slugify2(profile.appName || profile.provider)}-${seed}`,
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
        parallelMode: modeForStatus(status, row),
        prompt: promptForRow(row, prompts, index)
      };
    });
  }
  function classifyStatus(profile, row, bucket) {
    const text = `${profile.provider} ${profile.currentModel} ${profile.workload} ${row.name} ${row.dependency} ${row.risk}`.toLowerCase();
    const explicit = normalizeRisk(row.risk);
    if (containsAny(text, ["deploy", "production", "prod", "release", "publish", "secret", "token"])) {
      return explicit === "opportunity" ? "watch" : "critical";
    }
    if (containsAny(text, ["lint", "test", "typecheck", "docs", "format", "scan", "smoke", "validate"])) {
      return explicit === "critical" ? "watch" : "opportunity";
    }
    if (containsAny(text, ["migrate", "database", "stateful", "seed"])) {
      return "critical";
    }
    if (containsAny(text, ["cache", "artifact", "bundle", "build"])) {
      return bucket % 2 === 0 ? "opportunity" : "watch";
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
    if (status === "critical") return "serial";
    if (status === "watch") return /wait|gate|approve|release/i.test(`${row.name} ${row.dependency}`) ? "wait-all" : "wait";
    if (status === "opportunity") return "background";
    return "background";
  }
  function pickSourceGap(status, row, bucket) {
    if (status === "critical") return "release-gate";
    if (status === "watch") {
      if (!row.owner) return "owner-map";
      return /wait|gate|approve|release/i.test(`${row.name} ${row.dependency}`) ? "wait-link" : "log-fanout";
    }
    if (status === "opportunity") return /log|artifact|bundle/i.test(`${row.name} ${row.dependency}`) ? "log-fanout" : "parallel-lane";
    return bucket % 2 === 0 ? "parallel-lane" : "cancel-path";
  }
  function actionFor(profile, row, status, gap) {
    const step = row.name || "this step";
    const owner = row.owner || "the owner";
    const dependency = row.dependency || "the pipeline";
    if (status === "critical") {
      return `Keep ${step} serial, attach a manual gate for ${owner}, and do not let it bypass ${dependency}.`;
    }
    if (status === "opportunity") {
      return `Move ${step} into background with separate logs so ${profile.appName} can keep the main flow moving.`;
    }
    if (status === "watch") {
      return `Insert a wait point for ${step} and confirm ${owner} knows what must finish before the next lane starts.`;
    }
    if (gap === "owner-map") {
      return `Assign an owner to ${step} before the next rerun so the parallel branch has a clear checker.`;
    }
    return `Keep ${step} on the watch list and add a rollback or cancel path if the lane drifts.`;
  }
  function buildReadiness(profile, findings) {
    const parallelCount = findings.filter((item) => item.status === "opportunity").length;
    const criticalCount = findings.filter((item) => item.status === "critical").length;
    const watchCount = findings.filter((item) => item.status === "watch").length;
    const ownerCount = profile.reviewModels.filter((row) => row.owner).length;
    const cancelTerms = findings.filter((item) => /cancel|rollback/i.test(item.recommendedAction)).length;
    return [
      {
        state: parallelCount >= 2 ? "ready" : "watch",
        label: "Parallel lanes",
        detail: parallelCount >= 2 ? `${parallelCount} steps can move into background lanes without slowing the release gate.` : `Only ${parallelCount} step${parallelCount === 1 ? "" : "s"} is clearly parallel-safe right now.`,
        gap: parallelCount >= 2 ? "" : "parallel-lane"
      },
      {
        state: criticalCount > 0 ? "risk" : "ready",
        label: "Serial gates",
        detail: criticalCount > 0 ? `${criticalCount} step${criticalCount === 1 ? "" : "s"} must stay serial before the next release move.` : "No step is forcing a release gate in this preset.",
        gap: criticalCount > 0 ? "release-gate" : ""
      },
      {
        state: ownerCount >= profile.reviewModels.length ? "ready" : "manual",
        label: "Owner map",
        detail: ownerCount >= profile.reviewModels.length ? "Every tracked lane has a named owner or checker." : `${profile.reviewModels.length - ownerCount} step${profile.reviewModels.length - ownerCount === 1 ? "" : "s"} still need a clear owner.`,
        gap: ownerCount >= profile.reviewModels.length ? "" : "owner-map"
      },
      {
        state: cancelTerms > 0 || watchCount > 0 ? "watch" : "ready",
        label: "Cancel path",
        detail: cancelTerms > 0 ? "A cancel or rollback path is present in the checklist." : watchCount > 0 ? "A wait / wait-all chain is needed before a rerun can continue." : "No explicit cancel or wait chain is required in this plan.",
        gap: cancelTerms > 0 ? "cancel-path" : watchCount > 0 ? "wait-link" : ""
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
        title: `Keep ${criticalItems[0].promptId.replace(/-\d+$/, "")} serial`,
        why: `Critical lanes should not run in background until ${criticalItems[0].owner || "the owner"} confirms the gate and fallback path.`,
        impact: 5,
        effort: 2
      });
    }
    if (opportunityItems.length) {
      actions.push({
        title: "Move safe lanes to background",
        why: `${opportunityItems.length} step${opportunityItems.length === 1 ? "" : "s"} can run in parallel with separate logs and a shorter main path.`,
        impact: 4,
        effort: 2
      });
    }
    if (missingOwners.length) {
      actions.push({
        title: "Assign owners to every lane",
        why: `${missingOwners.length} tracked step${missingOwners.length === 1 ? "" : "s"} still need a named checker before the workflow can be reused.`,
        impact: 4,
        effort: 1
      });
    }
    if (watchItems.length) {
      actions.push({
        title: "Add explicit wait links",
        why: `${watchItems.length} step${watchItems.length === 1 ? "" : "s"} needs a wait or wait-all rule so parallel branches do not drift.`,
        impact: 3,
        effort: 1
      });
    }
    if (!actions.length) {
      actions.push({
        title: "Keep the workflow as-is",
        why: "This preset already reads as parallel-ready, so the next iteration should validate live workflow evidence rather than reshaping the graph again.",
        impact: 2,
        effort: 1
      });
    }
    return actions.slice(0, 3).map((action, index) => ({
      ...action,
      id: `action-${index + 1}`,
      owner: prompts[index]?.prompt || "Review the plan",
      checkpoint: readiness[index % readiness.length]?.label || "Workflow gate"
    }));
  }
  function buildScore(profile, findings, readiness) {
    const total = findings.length || 1;
    const criticalCount = findings.filter((item) => item.status === "critical").length;
    const watchCount = findings.filter((item) => item.status === "watch").length;
    const opportunityCount = findings.filter((item) => item.status === "opportunity").length;
    const noActionCount = findings.filter((item) => item.status === "no-action").length;
    const ownerCount = findings.filter((item) => item.owner).length;
    const cancelCount = readiness.some((item) => item.gap === "cancel-path") ? 1 : 0;
    const parallelLane = clamp(
      Math.round(32 + opportunityCount * 16 + noActionCount * 8 - criticalCount * 10 - watchCount * 4)
    );
    const ownerClarity = clamp(Math.round(45 + ownerCount * 9 - (total - ownerCount) * 8));
    const actionClarity = clamp(Math.round(48 + opportunityCount * 7 + watchCount * 5 - criticalCount * 3 + cancelCount * 6));
    const safety = clamp(Math.round(54 + (readiness[1]?.state === "risk" ? -14 : 10) - criticalCount * 5 + cancelCount * 4));
    const overall = clamp(Math.round(parallelLane * 0.35 + ownerClarity * 0.2 + actionClarity * 0.2 + safety * 0.25));
    return {
      overall,
      impactSplit: parallelLane,
      ownerClarity,
      actionClarity,
      safety,
      summary: bandSummary(profile, overall, parallelLane, ownerClarity, actionClarity, safety)
    };
  }
  function bandSummary(profile, overall, parallelLane, ownerClarity, actionClarity, safety) {
    const laneText = parallelLane >= 75 ? "most lanes can move into background" : parallelLane >= 50 ? "a few lanes can run in parallel" : "the graph still needs sequencing";
    const ownerText = ownerClarity >= 75 ? "owner coverage is clear" : "owner gaps still need cleanup";
    const safetyText = safety >= 75 ? "release gating looks controlled" : "the serial gate still needs attention";
    return `${profile.appName || "This workflow"} ${laneText}, ${ownerText}, and ${safetyText}. Action clarity is ${actionClarity}/100 with an overall score of ${overall}/100.`;
  }
  function buildSummary(profile, findings, actions, score) {
    const criticalCount = findings.filter((item) => item.status === "critical").length;
    const parallelCount = findings.filter((item) => item.status === "opportunity").length;
    const ownerCount = findings.filter((item) => item.owner).length;
    const missingOwnerCount = findings.length - ownerCount;
    return {
      impactGap: `${parallelCount} parallel-safe step${parallelCount === 1 ? "" : "s"} and ${criticalCount} serial gate${criticalCount === 1 ? "" : "s"} are highlighted in the matrix.`,
      ownerGap: missingOwnerCount > 0 ? `${missingOwnerCount} step${missingOwnerCount === 1 ? "" : "s"} still need a named owner before the next rerun.` : "Every tracked step has a clear owner or checker.",
      topAction: actions[0]?.title || "Keep the workflow as-is",
      scoreNote: `${score.overall}/100 overall based on the current deterministic workflow simulation.`
    };
  }
  function promptForRow(row, prompts, index) {
    return prompts[index % prompts.length]?.prompt || row.name || `Step ${index + 1}`;
  }
  function topAlternativesFor(status, row) {
    const nextStep = modeForStatus(status, row);
    if (status === "critical") return [nextStep, "wait-all", "background"];
    if (status === "watch") return [nextStep, "serial", "background"];
    if (status === "opportunity") return ["background", "wait", "serial"];
    return ["background", "wait", "serial"];
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
    if (["critical", "serial", "gate", "blocker"].includes(raw)) return "critical";
    if (["opportunity", "parallel", "background", "safe"].includes(raw)) return "opportunity";
    if (["no-action", "noop", "already-safe"].includes(raw)) return "no-action";
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
    const base = Date.UTC(2026, 5, 29, 9, 0, 0);
    const offsetMinutes = seed % (24 * 60);
    return new Date(base + offsetMinutes * 60 * 1e3).toISOString();
  }
  function slugify2(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function clamp(value) {
    return Math.max(0, Math.min(100, value));
  }

  // products/actions-parallelism-planner/src/storage.js
  function storageAvailable() {
    try {
      const testKey = "actionsparallelismplanner:storage-test";
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

  // products/actions-parallelism-planner/src/app.js
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
      const confirmed = window.confirm("Reset demo data and clear the saved Actions Parallelism Planner brief from this browser?");
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
      state.lastMessage = "Reset complete. Start a new deterministic workflow brief.";
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
        state.lastMessage = "Markdown parallel plan copied to clipboard.";
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
      state.lastMessage = "Fix the highlighted fields before generating a workflow brief.";
      render();
      return;
    }
    const submit = elements.form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Building deterministic parallel plan...";
    window.setTimeout(() => {
      state.brief = generateBrief(validation.profile);
      state.copyFallbackVisible = false;
      state.lastMessage = "Brief generated as a deterministic workflow simulation.";
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
      metricCard(`${brief.score.overall}`, `Overall parallel readiness - ${scoreBand(brief.score.overall)}`),
      metricCard(`${brief.findings.length}`, "workflow steps"),
      metricCard(`${brief.score.impactSplit}`, "parallel lanes"),
      metricCard(`${brief.score.ownerClarity}`, "owner clarity")
    ]);
    replaceChildren(elements.summaryGrid, [
      summaryCard("Workflow snapshot", `${brief.profile.appName} comparing ${brief.profile.provider} while tracking the shared steps across ${brief.profile.region}.`),
      summaryCard("Parallel gap", brief.summary.impactGap),
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
      cell("Workflow step", prompt?.prompt || finding.promptId),
      statusCell(finding.status),
      cell("Lane", INTENT_GROUPS[prompt?.intentGroup] || prompt?.intentGroup || ""),
      cell("Parallel gap", SOURCE_GAPS[finding.likelySourceGap] || finding.likelySourceGap),
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
    elements.reviewHint.textContent = validation.notes.length ? validation.notes.join(" ") : "Optional. Extra rows are ignored after the first 6 workflow steps.";
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
    if (!submit.disabled) submit.textContent = state.brief ? "Regenerate parallel plan" : "Generate parallel plan";
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
