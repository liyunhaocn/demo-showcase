import { SIMULATION_NOTICE, SOURCE_GAPS, STATUS_LABELS, scoreBand } from './model.js'
import { generatePrompts } from './prompt-generation.js'

const DEFAULT_ROWS = [
  {
    name: 'docs-repo',
    evidence: 'public README snippet',
    owner: 'Security owner',
    state: 'critical',
  },
  {
    name: 'release-notes',
    evidence: 'token echoed in issue body',
    owner: 'Platform on-call',
    state: 'watch',
  },
  {
    name: 'billing-service',
    evidence: 'revocation already queued',
    owner: 'Billing owner',
    state: 'contained',
  },
]

export function normalizeProfile(input) {
  const rows = normalizeAlertRows(input.reviewModels || [])
  const normalizedRows = rows.slice(0, 6)

  return {
    incidentName: String(input.incidentName || '').trim(),
    alertSource: String(input.alertSource || '').trim(),
    secretType: String(input.secretType || '').trim(),
    exposureSurface: String(input.exposureSurface || '').trim(),
    owningTeam: String(input.owningTeam || '').trim(),
    alertAgeHours: normalizeOptionalInt(input.alertAgeHours),
    objective: input.objective || 'contain-fast',
    reviewModels: normalizedRows,
    createdAt: input.createdAt || new Date().toISOString(),
  }
}

export function validateProfile(input) {
  const errors = {}
  const normalized = normalizeProfile(input)
  const parsedRows = normalizeAlertRows(input.reviewModels || [])
  const notes = []

  if (!normalized.incidentName) {
    errors.incidentName = 'Incident name is required to generate a response brief.'
  }

  if (!normalized.alertSource) {
    errors.alertSource = 'Alert source is required to generate a response brief.'
  }

  if (!normalized.secretType) {
    errors.secretType = 'Secret type is required to generate a response brief.'
  }

  if (!normalized.exposureSurface) {
    errors.exposureSurface = 'Exposure surface is required to generate a response brief.'
  }

  if (!normalized.owningTeam) {
    errors.owningTeam = 'Owning team is required to generate a response brief.'
  }

  if (input.alertAgeHours && !isPositiveInteger(input.alertAgeHours)) {
    errors.alertAgeHours = 'Alert age must be a whole number greater than zero.'
  }

  if (!parsedRows.length) {
    notes.push('Add at least 3 alerts before a realistic incident review.')
  } else if (parsedRows.length < 6) {
    notes.push('Add up to 6 alerts to exercise the full containment matrix.')
  } else if (parsedRows.length > 6) {
    notes.push('Only the first 6 alerts are used in this deterministic demo.')
  }

  const missingOwnerRows = parsedRows.filter((row) => !row.owner)
  if (missingOwnerRows.length) {
    notes.push('Owner names are optional, but the matrix is clearer when each alert has a named owner.')
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
    id: `secret-exposure-response-planner-${slugify(profile.incidentName || profile.alertSource)}-${seed}`,
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
    const bucket = stableHash(`${seed}|${row.name}|${row.evidence}|${row.owner}|${row.state}|${index}`)
    const status = classifyStatus(profile, row, bucket)
    const signalGap = pickSourceGap(status, row, bucket)
    return {
      promptId: `${slugify(row.name)}-${index + 1}`,
      status,
      evidence: row.evidence || '',
      owner: row.owner || '',
      state: row.state || 'watch',
      topAlternatives: topAlternativesFor(status, row),
      likelySourceGap: signalGap,
      recommendedAction: actionFor(profile, row, status, signalGap),
      exposureMode: modeForStatus(status, row),
      prompt: promptForRow(row, prompts, index),
    }
  })
}

function classifyStatus(profile, row, bucket) {
  const text = `${profile.alertSource} ${profile.secretType} ${profile.exposureSurface} ${row.name} ${row.evidence} ${row.state}`.toLowerCase()
  const explicit = normalizeRisk(row.state)

  if (containsAny(text, ['contained', 'revoked', 'rotated', 'disabled', 'cleared'])) {
    return explicit === 'critical' ? 'watch' : 'contained'
  }

  if (containsAny(text, ['public', 'prod', 'customer', 'logs', 'artifact', 'token', 'key'])) {
    return explicit === 'contained' ? 'watch' : 'critical'
  }

  if (containsAny(text, ['owner', 'assignee', 'unassigned', 'gate'])) {
    return explicit === 'critical' ? 'critical' : 'watch'
  }

  if (containsAny(text, ['evidence', 'scope', 'audit', 'trace'])) {
    return explicit === 'critical' ? 'watch' : 'contained'
  }

  if (containsAny(text, ['comms', 'notify', 'statement', 'legal'])) {
    return explicit === 'watch' ? 'watch' : 'contained'
  }

  if (explicit === 'critical') {
    return bucket % 2 === 0 ? 'critical' : 'watch'
  }

  if (explicit === 'contained') {
    return bucket % 3 === 0 ? 'contained' : 'watch'
  }

  if (explicit === 'watch') {
    return bucket % 4 === 0 ? 'watch' : 'contained'
  }

  return bucket % 5 === 0 ? 'watch' : 'contained'
}

function modeForStatus(status, row) {
  if (status === 'critical') return /public|token|key|artifact/i.test(`${row.name} ${row.evidence}`) ? 'containment' : 'rotation'
  if (status === 'watch') return /owner|assignee|gate/i.test(`${row.name} ${row.evidence}`) ? 'owner-gate' : 'evidence'
  if (status === 'contained') return /comms|statement|legal/i.test(`${row.name} ${row.evidence}`) ? 'comms' : 'containment'
  return 'containment'
}

function pickSourceGap(status, row, bucket) {
  if (status === 'critical') {
    if (/public|token|key|artifact/i.test(`${row.name} ${row.evidence}`)) return 'containment'
    if (/comms|statement|legal/i.test(`${row.name} ${row.evidence}`)) return 'comms'
    return 'rotation'
  }

  if (status === 'watch') {
    if (!row.owner) return 'owner-map'
    if (/public|token|key|artifact/i.test(`${row.name} ${row.evidence}`)) return 'containment'
    return /evidence|scope|audit|trace/i.test(`${row.name} ${row.evidence}`) ? 'evidence' : 'logging'
  }

  if (status === 'contained') {
    return /comms|statement|legal/i.test(`${row.name} ${row.evidence}`) ? 'comms' : 'logging'
  }

  return bucket % 2 === 0 ? 'logging' : 'evidence'
}

function actionFor(profile, row, status, gap) {
  const alert = row.name || 'this alert'
  const owner = row.owner || 'the owner'
  const evidence = row.evidence || 'the exposure surface'

  if (status === 'critical') {
    if (gap === 'containment') {
      return `Freeze ${alert}, cut the blast radius on ${evidence}, and keep ${owner} on the containment gate until the surface is confirmed.`
    }
    if (gap === 'rotation') {
      return `Revoke the exposed secret on ${alert}, rotate the credential, and do not reopen access until the current key is replaced.`
    }
    return `Keep ${alert} behind the incident gate, preserve evidence, and do not expand access until ${owner} signs off.`
  }

  if (status === 'contained') {
    return `Confirm ${alert} is contained, keep the owner on call, and record the audit trail before closing the first response loop.`
  }

  if (status === 'watch') {
    return `Assign ${owner} to ${alert} and confirm the next review has the containment or evidence needed to move it forward.`
  }

  if (gap === 'owner-map') {
    return `Record an owner for ${alert} before the next sweep so the incident queue has a clear checker.`
  }

  return `Keep ${alert} on the response watch list and attach a note if the same blocker appears again on ${evidence}.`
}

function topAlternativesFor(status, row) {
  if (status === 'critical') {
    return [
      `Contain ${row.name || 'the alert'} immediately`,
      `Rotate the exposed secret`,
      `Keep the owner on the gate`,
    ]
  }

  if (status === 'watch') {
    return [
      `Assign a named owner`,
      `Attach evidence for the alert`,
      `Prepare the next containment step`,
    ]
  }

  if (status === 'contained') {
    return [
      `Preserve the audit trail`,
      `Publish the response brief`,
      `Keep rotation notes visible`,
    ]
  }

  return [
    `Keep the alert documented`,
    `Preserve the current scope`,
    `Avoid reopening the same surface`,
  ]
}

function buildReadiness(profile, findings) {
  const containedCount = findings.filter((item) => item.status === 'contained').length
  const criticalCount = findings.filter((item) => item.status === 'critical').length
  const ownerCount = profile.reviewModels.filter((row) => row.owner).length
  const rotationCount = findings.filter((item) => item.likelySourceGap === 'rotation').length
  const commsCount = findings.filter((item) => item.likelySourceGap === 'comms').length

  return [
    {
      state: criticalCount === 0 ? 'ready' : 'watch',
      label: 'Containment status',
      detail: criticalCount === 0
        ? `${containedCount} alert${containedCount === 1 ? '' : 's'} already look contained.`
        : `${criticalCount} alert${criticalCount === 1 ? '' : 's'} still need containment work.`,
      gap: criticalCount === 0 ? '' : 'containment',
    },
    {
      state: ownerCount > 0 ? 'ready' : 'manual',
      label: 'Owner map',
      detail: ownerCount > 0
        ? `${ownerCount} tracked alert${ownerCount === 1 ? '' : 's'} already has a named owner.`
        : 'No alert currently has a named owner in this preset.',
      gap: ownerCount > 0 ? '' : 'owner-map',
    },
    {
      state: rotationCount > 0 ? 'watch' : 'ready',
      label: 'Rotation order',
      detail: rotationCount > 0
        ? `${rotationCount} alert${rotationCount === 1 ? '' : 's'} still need a rotation or revoke step.`
        : 'Rotation appears complete for the current alert set.',
      gap: rotationCount > 0 ? 'rotation' : '',
    },
    {
      state: commsCount > 0 ? 'watch' : 'ready',
      label: 'Comms readiness',
      detail: commsCount > 0
        ? `${commsCount} alert${commsCount === 1 ? '' : 's'} still need the communication path.`
        : 'Comms handoff looks ready for the current response brief.',
      gap: commsCount > 0 ? 'comms' : '',
    },
  ]
}

function buildActions(profile, findings, readiness) {
  const actions = []
  const critical = findings.filter((item) => item.status === 'critical').slice(0, 3)
  const watch = findings.filter((item) => item.status === 'watch').slice(0, 2)

  for (const item of critical) {
    actions.push({
      title: `Contain ${item.promptId}`,
      why: item.recommendedAction,
    })
  }

  for (const item of watch) {
    actions.push({
      title: `Assign owner for ${item.promptId}`,
      why: item.recommendedAction,
    })
  }

  if (!actions.length) {
    actions.push({
      title: `Keep ${profile.incidentName} on watch`,
      why: 'The incident is already mostly contained, so keep the checklist visible and preserve the audit trail.',
    })
  }

  const hasComms = readiness.some((item) => item.gap === 'comms')
  actions.push({
    title: hasComms ? 'Publish communication draft' : 'Archive incident brief',
    why: hasComms
      ? 'Prepare the internal and external note before the next stakeholder update.'
      : 'Share the exported brief with the same owner map so the response path stays visible.',
  })

  return actions.slice(0, 5)
}

function buildScore(profile, findings, readiness) {
  const criticalCount = findings.filter((item) => item.status === 'critical').length
  const containedCount = findings.filter((item) => item.status === 'contained').length
  const ownerCount = profile.reviewModels.filter((row) => row.owner).length
  const commsReady = readiness.some((item) => item.label === 'Comms readiness' && item.state === 'ready')

  const severity = clamp(100 - criticalCount * 28 - Math.max(0, 2 - containedCount) * 8)
  const containment = clamp(containedCount * 22 + (criticalCount === 0 ? 22 : 0) + 12)
  const ownerClarity = clamp(ownerCount * 16 + (profile.owningTeam ? 20 : 0))
  const comms = clamp((commsReady ? 54 : 24) + (profile.alertAgeHours && profile.alertAgeHours > 24 ? 8 : 0))
  const overall = clamp(Math.round((severity + containment + ownerClarity + comms) / 4))

  return {
    severity,
    containment,
    ownerClarity,
    comms,
    overall,
    band: scoreBand(overall),
  }
}

function buildSummary(profile, findings, actions, score) {
  const criticalCount = findings.filter((item) => item.status === 'critical').length
  if (criticalCount > 0) {
    return `${profile.incidentName} still has ${criticalCount} critical alert${criticalCount === 1 ? '' : 's'}. Keep containment and rotation in the same response path.`
  }

  return `${profile.incidentName} looks mostly contained. Keep the owner map, communication draft, and exported brief in one place.`
}

function promptForRow(row, prompts, index) {
  if (!prompts.length) return ''
  const prompt = prompts[index % prompts.length]
  return `${prompt.prompt} (${row.name})`
}

function normalizeAlertRows(rows) {
  return rows
    .map((row, index) => normalizeAlertRow(row, index))
    .filter(Boolean)
}

function normalizeAlertRow(row, index) {
  if (typeof row === 'string') {
    const raw = row.trim()
    if (!raw) return null
    const parts = raw.split(/[|,]/).map((part) => part.trim())
    return {
      id: `alert-${index + 1}`,
      name: parts[0] || '',
      evidence: parts[1] || '',
      owner: parts[2] || '',
      state: parts[3] || 'watch',
    }
  }

  if (!row || typeof row !== 'object') return null

  return {
    id: row.id || `alert-${index + 1}`,
    name: String(row.name || '').trim(),
    evidence: String(row.evidence || '').trim(),
    owner: String(row.owner || '').trim(),
    state: normalizeRisk(row.state || row.risk || 'watch'),
  }
}

function normalizeRisk(value) {
  const risk = String(value || '').toLowerCase().trim()
  if (['critical', 'watch', 'contained', 'clean'].includes(risk)) return risk
  if (['opportunity', 'no-action'].includes(risk)) return 'contained'
  return 'watch'
}

function normalizeOptionalInt(value) {
  if (value === '' || value === null || value === undefined) return ''
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : ''
}

function isPositiveInteger(value) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 && String(parsed) === String(value).trim()
}

function containsAny(text, list) {
  return list.some((item) => text.includes(item))
}

function stableHash(input) {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `${hash >>> 0}`
}

function seedInput(profile) {
  return [
    profile.incidentName,
    profile.alertSource,
    profile.secretType,
    profile.exposureSurface,
    profile.owningTeam,
    profile.alertAgeHours,
    profile.objective,
    ...profile.reviewModels.map((row) => [row.name, row.evidence, row.owner, row.state].join('|')),
  ].join('||')
}

function deterministicTimestamp(seed) {
  const base = Date.UTC(2026, 6, 6, 9, 0, 0)
  const offsetMinutes = Number.parseInt(seed.slice(0, 6), 10) % (12 * 60)
  return new Date(base + offsetMinutes * 60 * 1000).toISOString()
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
