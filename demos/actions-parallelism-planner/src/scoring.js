import { SIMULATION_NOTICE, SOURCE_GAPS, STATUS_WEIGHTS } from './model.js'
import { generatePrompts } from './prompt-generation.js'

const DEFAULT_ROWS = [
  {
    name: 'Lint and typecheck',
    dependency: 'Independent from release',
    owner: 'Platform',
    risk: 'opportunity',
  },
  {
    name: 'Unit tests',
    dependency: 'No deploy access',
    owner: 'QA',
    risk: 'opportunity',
  },
  {
    name: 'Deploy preview',
    dependency: 'Waits on green smoke',
    owner: 'Release owner',
    risk: 'critical',
  },
]

export function normalizeProfile(input) {
  const rows = normalizeInventoryRows(input.reviewModels || [])
  const normalizedRows = rows.slice(0, 6)

  return {
    appName: String(input.appName || '').trim(),
    provider: String(input.provider || '').trim(),
    currentModel: String(input.currentModel || '').trim(),
    reviewModels: normalizedRows,
    workload: String(input.workload || '').trim(),
    region: String(input.region || '').trim(),
    monthlyRequests: normalizeOptionalInt(input.monthlyRequests),
    objective: input.objective || 'speed-up-ci',
    createdAt: input.createdAt || new Date().toISOString(),
  }
}

export function validateProfile(input) {
  const errors = {}
  const normalized = normalizeProfile(input)
  const parsedRows = normalizeInventoryRows(input.reviewModels || [])
  const notes = []

  if (!normalized.appName) {
    errors.appName = 'Workflow name is required to generate a parallel plan.'
  }

  if (!normalized.provider) {
    errors.provider = 'GitHub Actions source is required to generate a parallel plan.'
  }

  if (!normalized.currentModel) {
    errors.currentModel = 'Workflow goal is required to generate a parallel plan.'
  }

  if (!normalized.workload) {
    errors.workload = 'Repo / pipeline is required to generate a parallel plan.'
  }

  if (!normalized.region) {
    errors.region = 'Owning team is required to generate a parallel plan.'
  }

  if (input.monthlyRequests && !isPositiveInteger(input.monthlyRequests)) {
    errors.monthlyRequests = 'Step count must be a whole number greater than zero.'
  }

  if (!parsedRows.length) {
    notes.push('Add at least 3 workflow steps before a realistic parallel review.')
  } else if (parsedRows.length < 6) {
    notes.push('Add up to 6 workflow steps to exercise the full matrix.')
  } else if (parsedRows.length > 6) {
    notes.push('Only the first 6 workflow steps are used in this deterministic demo.')
  }

  const missingOwnerRows = parsedRows.filter((row) => !row.owner)
  if (missingOwnerRows.length) {
    notes.push('Owner names are optional, but the matrix is clearer when each step has a named owner.')
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    notes,
    rowsTruncated: parsedRows.length > normalized.reviewModels.length,
    ignoredRowCount: Math.max(parsedRows.length - normalized.reviewModels.length, 0),
    profile: normalized,
  }
}

export function generateBrief(input) {
  const profile = normalizeProfile(input)
  const prompts = generatePrompts(profile)
  const seed = stableHash(seedInput(profile))
  const findings = buildFindings(profile, prompts, seed)
  const readiness = buildReadiness(profile, findings)
  const actions = buildActions(profile, prompts, findings, readiness)
  const score = buildScore(profile, findings, readiness)
  const generatedAt = deterministicTimestamp(seed)

  return {
    schemaVersion: 1,
    id: `actionsparallelismplanner-${slugify(profile.appName || profile.provider)}-${seed}`,
    generatedAt,
    profile,
    prompts,
    findings,
    readiness,
    actions,
    score,
    summary: buildSummary(profile, findings, actions, score),
    simulationNotice: SIMULATION_NOTICE,
  }
}

function buildFindings(profile, prompts, seed) {
  const rows = profile.reviewModels.length ? profile.reviewModels : DEFAULT_ROWS
  return rows.map((row, index) => {
    const bucket = stableHash(`${seed}|${row.name}|${row.dependency}|${row.owner}|${row.risk}|${index}`)
    const status = classifyStatus(profile, row, bucket)
    const signalGap = pickSourceGap(status, row, bucket)
    return {
      promptId: `${slugify(row.name)}-${index + 1}`,
      status,
      dependency: row.dependency || '',
      owner: row.owner || '',
      risk: row.risk || 'watch',
      topAlternatives: topAlternativesFor(status, row),
      likelySourceGap: signalGap,
      recommendedAction: actionFor(profile, row, status, signalGap),
      parallelMode: modeForStatus(status, row),
      prompt: promptForRow(row, prompts, index),
    }
  })
}

function classifyStatus(profile, row, bucket) {
  const text = `${profile.provider} ${profile.currentModel} ${profile.workload} ${row.name} ${row.dependency} ${row.risk}`.toLowerCase()
  const explicit = normalizeRisk(row.risk)

  if (containsAny(text, ['deploy', 'production', 'prod', 'release', 'publish', 'secret', 'token'])) {
    return explicit === 'opportunity' ? 'watch' : 'critical'
  }

  if (containsAny(text, ['lint', 'test', 'typecheck', 'docs', 'format', 'scan', 'smoke', 'validate'])) {
    return explicit === 'critical' ? 'watch' : 'opportunity'
  }

  if (containsAny(text, ['migrate', 'database', 'stateful', 'seed'])) {
    return 'critical'
  }

  if (containsAny(text, ['cache', 'artifact', 'bundle', 'build'])) {
    return bucket % 2 === 0 ? 'opportunity' : 'watch'
  }

  if (explicit === 'critical') {
    return bucket % 2 === 0 ? 'critical' : 'watch'
  }

  if (explicit === 'opportunity') {
    return bucket % 3 === 0 ? 'opportunity' : 'watch'
  }

  if (explicit === 'watch') {
    return bucket % 4 === 0 ? 'watch' : 'no-action'
  }

  return bucket % 5 === 0 ? 'watch' : 'no-action'
}

function modeForStatus(status, row) {
  if (status === 'critical') return 'serial'
  if (status === 'watch') return /wait|gate|approve|release/i.test(`${row.name} ${row.dependency}`) ? 'wait-all' : 'wait'
  if (status === 'opportunity') return 'background'
  return 'background'
}

function pickSourceGap(status, row, bucket) {
  if (status === 'critical') return 'release-gate'
  if (status === 'watch') {
    if (!row.owner) return 'owner-map'
    return /wait|gate|approve|release/i.test(`${row.name} ${row.dependency}`) ? 'wait-link' : 'log-fanout'
  }
  if (status === 'opportunity') return /log|artifact|bundle/i.test(`${row.name} ${row.dependency}`) ? 'log-fanout' : 'parallel-lane'
  return bucket % 2 === 0 ? 'parallel-lane' : 'cancel-path'
}

function actionFor(profile, row, status, gap) {
  const step = row.name || 'this step'
  const owner = row.owner || 'the owner'
  const dependency = row.dependency || 'the pipeline'

  if (status === 'critical') {
    return `Keep ${step} serial, attach a manual gate for ${owner}, and do not let it bypass ${dependency}.`
  }
  if (status === 'opportunity') {
    return `Move ${step} into background with separate logs so ${profile.appName} can keep the main flow moving.`
  }
  if (status === 'watch') {
    return `Insert a wait point for ${step} and confirm ${owner} knows what must finish before the next lane starts.`
  }
  if (gap === 'owner-map') {
    return `Assign an owner to ${step} before the next rerun so the parallel branch has a clear checker.`
  }
  return `Keep ${step} on the watch list and add a rollback or cancel path if the lane drifts.`
}

function buildReadiness(profile, findings) {
  const parallelCount = findings.filter((item) => item.status === 'opportunity').length
  const criticalCount = findings.filter((item) => item.status === 'critical').length
  const watchCount = findings.filter((item) => item.status === 'watch').length
  const ownerCount = profile.reviewModels.filter((row) => row.owner).length
  const cancelTerms = findings.filter((item) => /cancel|rollback/i.test(item.recommendedAction)).length

  return [
    {
      state: parallelCount >= 2 ? 'ready' : 'watch',
      label: 'Parallel lanes',
      detail: parallelCount >= 2
        ? `${parallelCount} steps can move into background lanes without slowing the release gate.`
        : `Only ${parallelCount} step${parallelCount === 1 ? '' : 's'} is clearly parallel-safe right now.`,
      gap: parallelCount >= 2 ? '' : 'parallel-lane',
    },
    {
      state: criticalCount > 0 ? 'risk' : 'ready',
      label: 'Serial gates',
      detail: criticalCount > 0
        ? `${criticalCount} step${criticalCount === 1 ? '' : 's'} must stay serial before the next release move.`
        : 'No step is forcing a release gate in this preset.',
      gap: criticalCount > 0 ? 'release-gate' : '',
    },
    {
      state: ownerCount >= profile.reviewModels.length ? 'ready' : 'manual',
      label: 'Owner map',
      detail: ownerCount >= profile.reviewModels.length
        ? 'Every tracked lane has a named owner or checker.'
        : `${profile.reviewModels.length - ownerCount} step${profile.reviewModels.length - ownerCount === 1 ? '' : 's'} still need a clear owner.`,
      gap: ownerCount >= profile.reviewModels.length ? '' : 'owner-map',
    },
    {
      state: cancelTerms > 0 || watchCount > 0 ? 'watch' : 'ready',
      label: 'Cancel path',
      detail: cancelTerms > 0
        ? 'A cancel or rollback path is present in the checklist.'
        : watchCount > 0
          ? 'A wait / wait-all chain is needed before a rerun can continue.'
          : 'No explicit cancel or wait chain is required in this plan.',
      gap: cancelTerms > 0 ? 'cancel-path' : watchCount > 0 ? 'wait-link' : '',
    },
  ]
}

function buildActions(profile, prompts, findings, readiness) {
  const actions = []
  const criticalItems = findings.filter((item) => item.status === 'critical')
  const watchItems = findings.filter((item) => item.status === 'watch')
  const opportunityItems = findings.filter((item) => item.status === 'opportunity')
  const missingOwners = findings.filter((item) => !item.owner)

  if (criticalItems.length) {
    actions.push({
      title: `Keep ${criticalItems[0].promptId.replace(/-\d+$/, '')} serial`,
      why: `Critical lanes should not run in background until ${criticalItems[0].owner || 'the owner'} confirms the gate and fallback path.`,
      impact: 5,
      effort: 2,
    })
  }

  if (opportunityItems.length) {
    actions.push({
      title: 'Move safe lanes to background',
      why: `${opportunityItems.length} step${opportunityItems.length === 1 ? '' : 's'} can run in parallel with separate logs and a shorter main path.`,
      impact: 4,
      effort: 2,
    })
  }

  if (missingOwners.length) {
    actions.push({
      title: 'Assign owners to every lane',
      why: `${missingOwners.length} tracked step${missingOwners.length === 1 ? '' : 's'} still need a named checker before the workflow can be reused.`,
      impact: 4,
      effort: 1,
    })
  }

  if (watchItems.length) {
    actions.push({
      title: 'Add explicit wait links',
      why: `${watchItems.length} step${watchItems.length === 1 ? '' : 's'} needs a wait or wait-all rule so parallel branches do not drift.`,
      impact: 3,
      effort: 1,
    })
  }

  if (!actions.length) {
    actions.push({
      title: 'Keep the workflow as-is',
      why: 'This preset already reads as parallel-ready, so the next iteration should validate live workflow evidence rather than reshaping the graph again.',
      impact: 2,
      effort: 1,
    })
  }

  return actions.slice(0, 3).map((action, index) => ({
    ...action,
    id: `action-${index + 1}`,
    owner: prompts[index]?.prompt || 'Review the plan',
    checkpoint: readiness[index % readiness.length]?.label || 'Workflow gate',
  }))
}

function buildScore(profile, findings, readiness) {
  const total = findings.length || 1
  const criticalCount = findings.filter((item) => item.status === 'critical').length
  const watchCount = findings.filter((item) => item.status === 'watch').length
  const opportunityCount = findings.filter((item) => item.status === 'opportunity').length
  const noActionCount = findings.filter((item) => item.status === 'no-action').length
  const ownerCount = findings.filter((item) => item.owner).length
  const cancelCount = readiness.some((item) => item.gap === 'cancel-path') ? 1 : 0

  const parallelLane = clamp(
    Math.round(32 + opportunityCount * 16 + noActionCount * 8 - criticalCount * 10 - watchCount * 4),
  )
  const ownerClarity = clamp(Math.round(45 + ownerCount * 9 - (total - ownerCount) * 8))
  const actionClarity = clamp(Math.round(48 + opportunityCount * 7 + watchCount * 5 - criticalCount * 3 + cancelCount * 6))
  const safety = clamp(Math.round(54 + (readiness[1]?.state === 'risk' ? -14 : 10) - criticalCount * 5 + cancelCount * 4))
  const overall = clamp(Math.round((parallelLane * 0.35) + (ownerClarity * 0.2) + (actionClarity * 0.2) + (safety * 0.25)))

  return {
    overall,
    impactSplit: parallelLane,
    ownerClarity,
    actionClarity,
    safety,
    summary: bandSummary(profile, overall, parallelLane, ownerClarity, actionClarity, safety),
  }
}

function bandSummary(profile, overall, parallelLane, ownerClarity, actionClarity, safety) {
  const laneText = parallelLane >= 75 ? 'most lanes can move into background' : parallelLane >= 50 ? 'a few lanes can run in parallel' : 'the graph still needs sequencing'
  const ownerText = ownerClarity >= 75 ? 'owner coverage is clear' : 'owner gaps still need cleanup'
  const safetyText = safety >= 75 ? 'release gating looks controlled' : 'the serial gate still needs attention'
  return `${profile.appName || 'This workflow'} ${laneText}, ${ownerText}, and ${safetyText}. Action clarity is ${actionClarity}/100 with an overall score of ${overall}/100.`
}

function buildSummary(profile, findings, actions, score) {
  const criticalCount = findings.filter((item) => item.status === 'critical').length
  const parallelCount = findings.filter((item) => item.status === 'opportunity').length
  const ownerCount = findings.filter((item) => item.owner).length
  const missingOwnerCount = findings.length - ownerCount

  return {
    impactGap: `${parallelCount} parallel-safe step${parallelCount === 1 ? '' : 's'} and ${criticalCount} serial gate${criticalCount === 1 ? '' : 's'} are highlighted in the matrix.`,
    ownerGap: missingOwnerCount > 0
      ? `${missingOwnerCount} step${missingOwnerCount === 1 ? '' : 's'} still need a named owner before the next rerun.`
      : 'Every tracked step has a clear owner or checker.',
    topAction: actions[0]?.title || 'Keep the workflow as-is',
    scoreNote: `${score.overall}/100 overall based on the current deterministic workflow simulation.`,
  }
}

function promptForRow(row, prompts, index) {
  return prompts[index % prompts.length]?.prompt || row.name || `Step ${index + 1}`
}

function topAlternativesFor(status, row) {
  const nextStep = modeForStatus(status, row)
  if (status === 'critical') return [nextStep, 'wait-all', 'background']
  if (status === 'watch') return [nextStep, 'serial', 'background']
  if (status === 'opportunity') return ['background', 'wait', 'serial']
  return ['background', 'wait', 'serial']
}

function normalizeInventoryRows(rows) {
  return rows
    .map((row, index) => {
      if (typeof row === 'string') {
        return parseInventoryRow(row, index)
      }

      if (!row || typeof row !== 'object') return null

      return {
        name: String(row.name || '').trim(),
        dependency: String(row.dependency || '').trim(),
        owner: String(row.owner || '').trim(),
        risk: String(row.risk || 'watch').trim(),
      }
    })
    .filter(Boolean)
    .map((row) => ({
      name: row.name,
      dependency: row.dependency,
      owner: row.owner,
      risk: normalizeRisk(row.risk),
    }))
}

function parseInventoryRow(line, index) {
  const raw = String(line || '').trim()
  if (!raw) return null
  const parts = raw.split(/[|,]/).map((part) => part.trim())
  return {
    id: `step-${index + 1}`,
    name: parts[0] || '',
    dependency: parts[1] || '',
    owner: parts[2] || '',
    risk: normalizeRisk(parts[3] || 'watch'),
  }
}

function normalizeRisk(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (['critical', 'serial', 'gate', 'blocker'].includes(raw)) return 'critical'
  if (['opportunity', 'parallel', 'background', 'safe'].includes(raw)) return 'opportunity'
  if (['no-action', 'noop', 'already-safe'].includes(raw)) return 'no-action'
  return 'watch'
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
    ...(profile.reviewModels || []).map((row) => `${row.name}|${row.dependency}|${row.owner}|${row.risk}`),
  ].join('||')
}

function normalizeOptionalInt(value) {
  if (value === '' || value === null || value === undefined) return ''
  if (!isPositiveInteger(value)) return String(value)
  return String(Number(value))
}

function isPositiveInteger(value) {
  return /^\d+$/.test(String(value).trim()) && Number(value) > 0
}

function containsAny(value, terms) {
  return terms.some((term) => value.includes(term))
}

function stableHash(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0)
}

function deterministicTimestamp(seed) {
  const base = Date.UTC(2026, 5, 29, 9, 0, 0)
  const offsetMinutes = seed % (24 * 60)
  return new Date(base + offsetMinutes * 60 * 1000).toISOString()
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function clamp(value) {
  return Math.max(0, Math.min(100, value))
}
