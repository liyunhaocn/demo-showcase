import { SIMULATION_NOTICE, SOURCE_GAPS, STATUS_WEIGHTS } from './model.js'
import { generatePrompts } from './prompt-generation.js'

const DEFAULT_ROWS = [
  {
    name: 'Crash on checkout',
    dependency: 'Duplicate of issue 1842',
    owner: 'Backend',
    risk: 'critical',
  },
  {
    name: 'Search filter bug',
    dependency: 'Missing area field',
    owner: 'Frontend',
    risk: 'watch',
  },
  {
    name: 'Release note typo',
    dependency: 'Already routed',
    owner: 'Docs',
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
    objective: input.objective || 'reduce-duplicate-load',
    createdAt: input.createdAt || new Date().toISOString(),
  }
}

export function validateProfile(input) {
  const errors = {}
  const normalized = normalizeProfile(input)
  const parsedRows = normalizeInventoryRows(input.reviewModels || [])
  const notes = []

  if (!normalized.appName) {
    errors.appName = 'Issue queue name is required to generate a triage plan.'
  }

  if (!normalized.provider) {
    errors.provider = 'GitHub Issues source is required to generate a triage plan.'
  }

  if (!normalized.currentModel) {
    errors.currentModel = 'Triage goal is required to generate a triage plan.'
  }

  if (!normalized.workload) {
    errors.workload = 'Issue queue / repo is required to generate a triage plan.'
  }

  if (!normalized.region) {
    errors.region = 'Owning team is required to generate a triage plan.'
  }

  if (input.monthlyRequests && !isPositiveInteger(input.monthlyRequests)) {
    errors.monthlyRequests = 'Issue count must be a whole number greater than zero.'
  }

  if (!parsedRows.length) {
    notes.push('Add at least 3 issues before a realistic triage review.')
  } else if (parsedRows.length < 6) {
    notes.push('Add up to 6 issues to exercise the full matrix.')
  } else if (parsedRows.length > 6) {
    notes.push('Only the first 6 issues are used in this deterministic demo.')
  }

  const missingOwnerRows = parsedRows.filter((row) => !row.owner)
  if (missingOwnerRows.length) {
    notes.push('Owner names are optional, but the matrix is clearer when each issue has a named owner.')
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
    id: `issuetriagefieldplanner-${slugify(profile.appName || profile.provider)}-${seed}`,
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
      triageMode: modeForStatus(status, row),
      prompt: promptForRow(row, prompts, index),
    }
  })
}

function classifyStatus(profile, row, bucket) {
  const text = `${profile.provider} ${profile.currentModel} ${profile.workload} ${row.name} ${row.dependency} ${row.risk}`.toLowerCase()
  const explicit = normalizeRisk(row.risk)

  if (containsAny(text, ['duplicate', 'same bug', 'repeat', 'canonical', 'dedupe'])) {
    return explicit === 'opportunity' ? 'watch' : 'critical'
  }

  if (containsAny(text, ['owner', 'assignee', 'unassigned', 'triage', 'blocked'])) {
    return explicit === 'critical' ? 'critical' : 'watch'
  }

  if (containsAny(text, ['field', 'priority', 'area', 'severity', 'due date', 'saved view'])) {
    return explicit === 'critical' ? 'watch' : 'opportunity'
  }

  if (containsAny(text, ['release', 'security', 'deploy', 'failing', 'smoke'])) {
    return 'critical'
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
  if (status === 'critical') return /duplicate|same bug|canonical/i.test(`${row.name} ${row.dependency}`) ? 'dedupe-cluster' : 'owner-gate'
  if (status === 'watch') return /owner|assignee|triage/i.test(`${row.name} ${row.dependency}`) ? 'owner-gate' : 'field-gap'
  if (status === 'opportunity') return /view|field|priority|area/i.test(`${row.name} ${row.dependency}`) ? 'saved-view' : 'field-gap'
  return 'saved-view'
}

function pickSourceGap(status, row, bucket) {
  if (status === 'critical') return /duplicate|same bug|canonical/i.test(`${row.name} ${row.dependency}`) ? 'duplicate-link' : 'owner-map'
  if (status === 'watch') {
    if (!row.owner) return 'owner-map'
    return /field|priority|area|severity|due date/i.test(`${row.name} ${row.dependency}`) ? 'field-gap' : 'dedupe-note'
  }
  if (status === 'opportunity') return /view|field|priority|area/i.test(`${row.name} ${row.dependency}`) ? 'saved-view' : 'mcp-fields'
  return bucket % 2 === 0 ? 'mcp-fields' : 'saved-view'
}

function actionFor(profile, row, status, gap) {
  const issue = row.name || 'this issue'
  const owner = row.owner || 'the owner'
  const dependency = row.dependency || 'the issue queue'

  if (status === 'critical') {
    return `Merge ${issue} into the canonical cluster, keep ${owner} on the gate, and do not split the duplicate chain from ${dependency}.`
  }
  if (status === 'opportunity') {
    return `Normalize ${issue} into the saved view flow so ${profile.appName} can route it with the right fields and filters.`
  }
  if (status === 'watch') {
    return `Assign ${owner} to ${issue} and confirm the next triage pass has the field set needed to move it forward.`
  }
  if (gap === 'owner-map') {
    return `Record an owner for ${issue} before the next sweep so the queue has a clear checker.`
  }
  return `Keep ${issue} on the watch list and attach a dedupe note if the same report appears again.`
}

function buildReadiness(profile, findings) {
  const dedupeCount = findings.filter((item) => item.status === 'critical').length
  const ownerCount = profile.reviewModels.filter((row) => row.owner).length
  const fieldCount = findings.filter((item) => /field|priority|area|severity|due date/i.test(`${item.dependency} ${item.recommendedAction}`)).length
  const viewCount = findings.filter((item) => item.status === 'opportunity').length

  return [
    {
      state: dedupeCount >= 2 ? 'ready' : 'watch',
      label: 'Duplicate clusters',
      detail: dedupeCount >= 2
        ? `${dedupeCount} issues are clearly marked as duplicate clusters.`
        : `Only ${dedupeCount} cluster${dedupeCount === 1 ? '' : 's'} is clearly deduped right now.`,
      gap: dedupeCount >= 2 ? '' : 'duplicate-link',
    },
    {
      state: ownerCount > 0 ? 'ready' : 'manual',
      label: 'Owner map',
      detail: ownerCount > 0
        ? `${ownerCount} tracked issue${ownerCount === 1 ? '' : 's'} already has a named owner.`
        : 'No issue currently has a named owner in this preset.',
      gap: ownerCount > 0 ? '' : 'owner-map',
    },
    {
      state: fieldCount > 0 ? 'watch' : 'ready',
      label: 'Field coverage',
      detail: fieldCount > 0
        ? `${fieldCount} issue${fieldCount === 1 ? '' : 's'} still needs a field normalization pass.`
        : 'The main issue fields already look aligned.',
      gap: fieldCount > 0 ? 'field-gap' : '',
    },
    {
      state: viewCount > 0 ? 'ready' : 'watch',
      label: 'Saved views',
      detail: viewCount > 0
        ? 'Saved views should surface blockers and owner gaps clearly.'
        : 'Add or adjust a saved view so the queue stays visible to the whole team.',
      gap: viewCount > 0 ? '' : 'saved-view',
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
      title: `Collapse ${criticalItems[0].promptId.replace(/-\d+$/, '')} into the canonical issue`,
      why: `Duplicate clusters should be linked once so the team does not chase the same bug twice.`,
      impact: 5,
      effort: 2,
    })
  }

  if (opportunityItems.length) {
    actions.push({
      title: 'Normalize issue fields for saved views',
      why: `${opportunityItems.length} issue${opportunityItems.length === 1 ? '' : 's'} can move into a cleaner saved view once the fields are aligned.`,
      impact: 4,
      effort: 2,
    })
  }

  if (missingOwners.length) {
    actions.push({
      title: 'Assign owners to every issue',
      why: `${missingOwners.length} tracked issue${missingOwners.length === 1 ? '' : 's'} still need a named owner before triage can close cleanly.`,
      impact: 4,
      effort: 1,
    })
  }

  if (watchItems.length) {
    actions.push({
      title: 'Update the saved view filters',
      why: `${watchItems.length} issue${watchItems.length === 1 ? '' : 's'} needs the queue view to keep blockers and duplicates visible.`,
      impact: 3,
      effort: 1,
    })
  }

  if (!actions.length) {
    actions.push({
      title: 'Keep the queue as-is',
      why: 'This preset already looks routed; the next iteration should validate against live GitHub issue data rather than reworking the graph.',
      impact: 2,
      effort: 1,
    })
  }

  return actions.slice(0, 3).map((action, index) => ({
    ...action,
    id: `action-${index + 1}`,
    owner: prompts[index]?.prompt || 'Review the plan',
    checkpoint: readiness[index % readiness.length]?.label || 'Triage gate',
  }))
}

function buildScore(profile, findings, readiness) {
  const total = findings.length || 1
  const criticalCount = findings.filter((item) => item.status === 'critical').length
  const watchCount = findings.filter((item) => item.status === 'watch').length
  const opportunityCount = findings.filter((item) => item.status === 'opportunity').length
  const noActionCount = findings.filter((item) => item.status === 'no-action').length
  const ownerCount = findings.filter((item) => item.owner).length
  const viewGate = readiness.some((item) => item.gap === 'saved-view') ? 1 : 0

  const triageLane = clamp(
    Math.round(32 + opportunityCount * 16 + noActionCount * 8 - criticalCount * 10 - watchCount * 4),
  )
  const ownerClarity = clamp(Math.round(45 + ownerCount * 9 - (total - ownerCount) * 8))
  const actionClarity = clamp(Math.round(48 + opportunityCount * 7 + watchCount * 5 - criticalCount * 3 + viewGate * 6))
  const safety = clamp(Math.round(54 + (readiness[0]?.state === 'ready' ? 10 : -14) - criticalCount * 5 + viewGate * 4))
  const overall = clamp(Math.round((triageLane * 0.35) + (ownerClarity * 0.2) + (actionClarity * 0.2) + (safety * 0.25)))

  return {
    overall,
    impactSplit: triageLane,
    ownerClarity,
    actionClarity,
    safety,
    summary: bandSummary(profile, overall, triageLane, ownerClarity, actionClarity, safety),
  }
}

function bandSummary(profile, overall, triageLane, ownerClarity, actionClarity, safety) {
  const laneText = triageLane >= 75 ? 'most issues can be routed into clear saved views' : triageLane >= 50 ? 'a few issues need cleanup before routing' : 'the queue still needs dedupe work'
  const ownerText = ownerClarity >= 75 ? 'owner coverage is clear' : 'owner gaps still need cleanup'
  const safetyText = safety >= 75 ? 'triage gating looks controlled' : 'the saved view and duplicate gate still need attention'
  return `${profile.appName || 'This queue'} ${laneText}, ${ownerText}, and ${safetyText}. Action clarity is ${actionClarity}/100 with an overall score of ${overall}/100.`
}

function buildSummary(profile, findings, actions, score) {
  const criticalCount = findings.filter((item) => item.status === 'critical').length
  const dedupeCount = findings.filter((item) => item.status === 'opportunity').length
  const ownerCount = findings.filter((item) => item.owner).length
  const missingOwnerCount = findings.length - ownerCount

  return {
    impactGap: `${criticalCount} duplicate cluster${criticalCount === 1 ? '' : 's'} and ${dedupeCount} route-ready issue${dedupeCount === 1 ? '' : 's'} are highlighted in the matrix.`,
    ownerGap: missingOwnerCount > 0
      ? `${missingOwnerCount} issue${missingOwnerCount === 1 ? '' : 's'} still need a named owner before the next sweep.`
      : 'Every tracked issue has a clear owner or checker.',
    topAction: actions[0]?.title || 'Keep the queue as-is',
    scoreNote: `${score.overall}/100 overall based on the current deterministic GitHub issue triage simulation.`,
  }
}

function promptForRow(row, prompts, index) {
  return prompts[index % prompts.length]?.prompt || row.name || `Issue ${index + 1}`
}

function topAlternativesFor(status, row) {
  const nextStep = modeForStatus(status, row)
  if (status === 'critical') return [nextStep, 'saved-view', 'field-gap']
  if (status === 'watch') return [nextStep, 'owner-gate', 'saved-view']
  if (status === 'opportunity') return ['saved-view', 'field-gap', 'owner-gate']
  return ['saved-view', 'field-gap', 'owner-gate']
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
  if (['critical', 'duplicate', 'blocker', 'gate'].includes(raw)) return 'critical'
  if (['opportunity', 'route-ready', 'field-ready', 'saved-view'].includes(raw)) return 'opportunity'
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
