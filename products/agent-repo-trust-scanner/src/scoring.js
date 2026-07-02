import { SIMULATION_NOTICE, SOURCE_GAPS, STATUS_LABELS } from './model.js'
import { generatePrompts } from './prompt-generation.js'

const DEFAULT_ROWS = [
  {
    name: 'checkout-service',
    dependency: 'ready for pilot',
    owner: 'Platform owner',
    risk: 'opportunity',
  },
  {
    name: 'payments-api',
    dependency: 'missing owner gate',
    owner: 'Backend lead',
    risk: 'watch',
  },
  {
    name: 'docs-site',
    dependency: 'already covered',
    owner: 'Docs owner',
    risk: 'no-action',
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
    objective: input.objective || 'reduce-trust-risk',
    createdAt: input.createdAt || new Date().toISOString(),
  }
}

export function validateProfile(input) {
  const errors = {}
  const normalized = normalizeProfile(input)
  const parsedRows = normalizeInventoryRows(input.reviewModels || [])
  const notes = []

  if (!normalized.appName) {
    errors.appName = 'Repo name is required to generate a trust report.'
  }

  if (!normalized.provider) {
    errors.provider = 'Repo source is required to generate a trust report.'
  }

  if (!normalized.currentModel) {
    errors.currentModel = 'Trust goal is required to generate a trust report.'
  }

  if (!normalized.workload) {
    errors.workload = 'Repo target is required to generate a trust report.'
  }

  if (!normalized.region) {
    errors.region = 'Owning team is required to generate a trust report.'
  }

  if (input.monthlyRequests && !isPositiveInteger(input.monthlyRequests)) {
    errors.monthlyRequests = 'Setup step count must be a whole number greater than zero.'
  }

  if (!parsedRows.length) {
    notes.push('Add at least 3 repos before a realistic trust review.')
  } else if (parsedRows.length < 6) {
    notes.push('Add up to 6 repos to exercise the full matrix.')
  } else if (parsedRows.length > 6) {
    notes.push('Only the first 6 repos are used in this deterministic demo.')
  }

  const missingOwnerRows = parsedRows.filter((row) => !row.owner)
  if (missingOwnerRows.length) {
    notes.push('Owner names are optional, but the matrix is clearer when each repo has a named owner.')
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
    id: `agentrepotrustscanner-${slugify(profile.appName || profile.provider)}-${seed}`,
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
      rolloutMode: modeForStatus(status, row),
      prompt: promptForRow(row, prompts, index),
    }
  })
}

function classifyStatus(profile, row, bucket) {
  const text = `${profile.provider} ${profile.currentModel} ${profile.workload} ${row.name} ${row.dependency} ${row.risk}`.toLowerCase()
  const explicit = normalizeRisk(row.risk)

  if (containsAny(text, ['already covered', 'covered', 'pilot-ready', 'ready for pilot'])) {
    return explicit === 'critical' ? 'watch' : 'opportunity'
  }

  if (containsAny(text, ['budget', 'committer', 'pricing', 'minutes', 'cost'])) {
    return explicit === 'opportunity' ? 'watch' : (explicit === 'critical' ? 'critical' : 'watch')
  }

  if (containsAny(text, ['policy', 'security', 'autofix', 'marketplace'])) {
    return explicit === 'opportunity' ? 'watch' : 'critical'
  }

  if (containsAny(text, ['owner', 'assignee', 'unassigned', 'gate'])) {
    return explicit === 'critical' ? 'critical' : 'watch'
  }

  if (containsAny(text, ['view', 'filter', 'coverage', 'baseline'])) {
    return explicit === 'critical' ? 'watch' : 'opportunity'
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
  if (status === 'critical') return /budget|pricing|minutes/i.test(`${row.name} ${row.dependency}`) ? 'budget-gate' : 'policy-gate'
  if (status === 'watch') return /owner|assignee|gate/i.test(`${row.name} ${row.dependency}`) ? 'owner-gate' : 'rollout-view'
  if (status === 'opportunity') return /view|coverage|baseline|pilot/i.test(`${row.name} ${row.dependency}`) ? 'pilot-coverage' : 'rollout-view'
  return 'rollout-view'
}

function pickSourceGap(status, row, bucket) {
  if (status === 'critical') {
    if (/budget|pricing|minutes/i.test(`${row.name} ${row.dependency}`)) return 'budget-cap'
    if (/security|policy|autofix|marketplace/i.test(`${row.name} ${row.dependency}`)) return 'policy-review'
    return 'security-gate'
  }

  if (status === 'watch') {
    if (!row.owner) return 'owner-map'
    if (/budget|pricing|minutes/i.test(`${row.name} ${row.dependency}`)) return 'budget-cap'
    return /view|filter|coverage|baseline/i.test(`${row.name} ${row.dependency}`) ? 'rollout-view' : 'enablement-note'
  }

  if (status === 'opportunity') {
    return /view|filter|coverage|baseline/i.test(`${row.name} ${row.dependency}`) ? 'rollout-view' : 'coverage-gap'
  }

  return bucket % 2 === 0 ? 'coverage-gap' : 'rollout-view'
}

function actionFor(profile, row, status, gap) {
  const repo = row.name || 'this repo'
  const owner = row.owner || 'the owner'
  const dependency = row.dependency || 'the repo fleet'

  if (status === 'critical') {
    if (gap === 'budget-cap') {
      return `Set a hard committer budget on ${repo}, keep ${owner} on the gate, and do not expand the trust lane until pricing stays inside plan.`
    }
    return `Keep ${repo} behind the policy gate, confirm ${owner} owns the review path, and do not enable the repo until the current blocker is cleared.`
  }

  if (status === 'opportunity') {
    return `Move ${repo} into the trusted lane so ${profile.appName} can enable Code Quality with the right coverage and views.`
  }

  if (status === 'watch') {
    return `Assign ${owner} to ${repo} and confirm the next trust scan has the gate or field needed to move it forward.`
  }

  if (gap === 'owner-map') {
    return `Record an owner for ${repo} before the next sweep so the trust queue has a clear checker.`
  }

  return `Keep ${repo} on the trust watch list and attach a note if the same blocker appears again in ${dependency}.`
}

function buildReadiness(profile, findings) {
  const pilotCount = findings.filter((item) => item.status === 'opportunity').length
  const ownerCount = profile.reviewModels.filter((row) => row.owner).length
  const budgetCount = findings.filter((item) => item.likelySourceGap === 'budget-cap').length
  const policyCount = findings.filter((item) => item.likelySourceGap === 'policy-review' || item.likelySourceGap === 'security-gate').length
  const viewCount = findings.filter((item) => item.likelySourceGap === 'rollout-view').length

  return [
    {
      state: pilotCount >= 2 ? 'ready' : 'watch',
      label: 'Pilot coverage',
      detail: pilotCount >= 2
        ? `${pilotCount} repo${pilotCount === 1 ? '' : 's'} already look ready for the trusted lane.`
        : `Only ${pilotCount} repo${pilotCount === 1 ? '' : 's'} are clearly ready for the trusted lane right now.`,
      gap: pilotCount >= 2 ? '' : 'coverage-gap',
    },
    {
      state: ownerCount > 0 ? 'ready' : 'manual',
      label: 'Owner map',
      detail: ownerCount > 0
        ? `${ownerCount} tracked repo${ownerCount === 1 ? '' : 's'} already has a named owner.`
        : 'No repo currently has a named owner in this preset.',
      gap: ownerCount > 0 ? '' : 'owner-map',
    },
    {
      state: budgetCount > 0 ? 'watch' : 'ready',
      label: 'Budget guard',
      detail: budgetCount > 0
        ? `${budgetCount} repo${budgetCount === 1 ? '' : 's'} still needs an active committer budget check.`
        : 'The main budget guard already looks ready.',
      gap: budgetCount > 0 ? 'budget-cap' : '',
    },
    {
      state: policyCount > 0 ? 'watch' : 'ready',
      label: 'Policy gate',
      detail: policyCount > 0
        ? `${policyCount} repo${policyCount === 1 ? '' : 's'} still needs a policy or Autofix review.`
        : 'The policy gate already looks ready.',
      gap: policyCount > 0 ? 'policy-review' : '',
    },
    {
      state: viewCount > 0 ? 'watch' : 'ready',
      label: 'Trust board',
      detail: viewCount > 0
        ? 'The trust board should be tuned so trusted repos surface before noisy ones.'
        : 'Add or adjust a trust board so the queue stays visible to the whole team.',
      gap: viewCount > 0 ? 'rollout-view' : '',
    },
  ]
}

function buildActions(profile, prompts, findings, readiness) {
  const actions = []
  const criticalItems = findings.filter((item) => item.status === 'critical')
  const watchItems = findings.filter((item) => item.status === 'watch')
  const opportunityItems = findings.filter((item) => item.status === 'opportunity')
  const missingOwners = findings.filter((item) => !item.owner)

  if (opportunityItems.length) {
    actions.push({
      title: 'Enable the trusted repos first',
      why: `${opportunityItems.length} repo${opportunityItems.length === 1 ? '' : 's'} are already ready for the trusted lane.`,
      impact: 5,
      effort: 2,
    })
  }

  if (criticalItems.length) {
    actions.push({
      title: 'Lock the policy and budget gates',
      why: `${criticalItems.length} repo${criticalItems.length === 1 ? '' : 's'} still need a hard gate before the trust lane can widen.`,
      impact: 5,
      effort: 2,
    })
  }

  if (missingOwners.length) {
    actions.push({
      title: 'Assign an owner to every repo',
      why: `${missingOwners.length} tracked repo${missingOwners.length === 1 ? '' : 's'} still need a named owner before the trust review can close cleanly.`,
      impact: 4,
      effort: 1,
    })
  }

  if (watchItems.length) {
    actions.push({
      title: 'Update the trust board filters',
      why: `${watchItems.length} repo${watchItems.length === 1 ? '' : 's'} need the queue view to keep blockers and pilots visible.`,
      impact: 3,
      effort: 1,
    })
  }

  if (!actions.length) {
    actions.push({
      title: 'Keep the fleet as-is',
      why: 'This preset already looks routed; the next iteration should validate against live GitHub Code Quality data rather than reworking the graph.',
      impact: 2,
      effort: 1,
    })
  }

  return actions.slice(0, 3).map((action, index) => ({
    ...action,
    id: `action-${index + 1}`,
    owner: prompts[index]?.prompt || 'Review the plan',
      checkpoint: readiness[index % readiness.length]?.label || 'Trust gate',
  }))
}

function buildScore(profile, findings, readiness) {
  const total = findings.length || 1
  const criticalCount = findings.filter((item) => item.status === 'critical').length
  const watchCount = findings.filter((item) => item.status === 'watch').length
  const opportunityCount = findings.filter((item) => item.status === 'opportunity').length
  const noActionCount = findings.filter((item) => item.status === 'no-action').length
  const ownerCount = findings.filter((item) => item.owner).length
  const budgetGate = readiness.some((item) => item.gap === 'budget-cap') ? 1 : 0
  const policyGate = readiness.some((item) => item.gap === 'policy-review' || item.gap === 'security-gate') ? 1 : 0
  const viewGate = readiness.some((item) => item.gap === 'rollout-view') ? 1 : 0

  const coverageSplit = clamp(
    Math.round(34 + opportunityCount * 16 + noActionCount * 8 - criticalCount * 10 - watchCount * 4),
  )
  const ownerClarity = clamp(Math.round(45 + ownerCount * 9 - (total - ownerCount) * 8))
  const actionClarity = clamp(Math.round(48 + opportunityCount * 7 + watchCount * 5 - criticalCount * 3 + budgetGate * 4 + policyGate * 4 + viewGate * 4))
  const safety = clamp(Math.round(54 + (readiness[0]?.state === 'ready' ? 10 : -14) - criticalCount * 5 + budgetGate * 4 + policyGate * 4))
  const overall = clamp(Math.round((coverageSplit * 0.35) + (ownerClarity * 0.2) + (actionClarity * 0.2) + (safety * 0.25)))

  return {
    overall,
    coverageSplit,
    ownerClarity,
    actionClarity,
    safety,
    summary: bandSummary(profile, overall, coverageSplit, ownerClarity, actionClarity, safety),
  }
}

function bandSummary(profile, overall, coverageSplit, ownerClarity, actionClarity, safety) {
  const coverageText = coverageSplit >= 75 ? 'most repos can move into a clean trusted lane' : coverageSplit >= 50 ? 'a few repos still need coverage cleanup before trust expansion' : 'the fleet still needs a serious trust cleanup pass'
  const ownerText = ownerClarity >= 75 ? 'owner coverage is clear' : 'owner gaps still need cleanup'
  const safetyText = safety >= 75 ? 'policy and budget gates look controlled' : 'the policy or budget gate still needs attention'
  return `${profile.appName || 'This fleet'} ${coverageText}, ${ownerText}, and ${safetyText}. Action clarity is ${actionClarity}/100 with an overall score of ${overall}/100.`
}

function buildSummary(profile, findings, actions, score) {
  const criticalCount = findings.filter((item) => item.status === 'critical').length
  const pilotCount = findings.filter((item) => item.status === 'opportunity').length
  const ownerCount = findings.filter((item) => item.owner).length
  const missingOwnerCount = findings.length - ownerCount

  return {
    coverageGap: `${criticalCount} hard gate${criticalCount === 1 ? '' : 's'} and ${pilotCount} trust-ready repo${pilotCount === 1 ? '' : 's'} are highlighted in the matrix.`,
    ownerGap: missingOwnerCount > 0
      ? `${missingOwnerCount} repo${missingOwnerCount === 1 ? '' : 's'} still need a named owner before the next sweep.`
      : 'Every tracked repo has a clear owner or checker.',
    topAction: actions[0]?.title || 'Keep the fleet as-is',
    scoreNote: `${score.overall}/100 overall based on the current deterministic Agent repo trust simulation.`,
  }
}

function promptForRow(row, prompts, index) {
  return prompts[index % prompts.length]?.prompt || row.name || `Repo ${index + 1}`
}

function topAlternativesFor(status, row) {
  const nextStep = modeForStatus(status, row)
  if (status === 'critical') return [nextStep, 'rollout-view', 'pilot-coverage']
  if (status === 'watch') return [nextStep, 'owner-gate', 'rollout-view']
  if (status === 'opportunity') return ['pilot-coverage', 'rollout-view', 'owner-gate']
  return ['rollout-view', 'pilot-coverage', 'owner-gate']
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
  if (['critical', 'blocker', 'gate', 'policy-blocked', 'budget-risk'].includes(raw)) return 'critical'
  if (['opportunity', 'route-ready', 'field-ready', 'saved-view', 'pilot-ready'].includes(raw)) return 'opportunity'
  if (['no-action', 'noop', 'already-covered'].includes(raw)) return 'no-action'
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
  const base = Date.UTC(2026, 5, 30, 9, 0, 0)
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
