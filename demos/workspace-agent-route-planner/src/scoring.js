import { SIMULATION_NOTICE, SOURCE_GAPS, STATUS_WEIGHTS } from './model.js'
import { generatePrompts } from './prompt-generation.js'

const DEFAULT_ROWS = [
  {
    name: 'Task inventory',
    dependency: 'Slack, docs, CRM, GitHub',
    owner: 'Ops',
    risk: 'watch',
  },
  {
    name: 'First route pilot',
    dependency: 'One repeatable workflow',
    owner: 'PM',
    risk: 'opportunity',
  },
  {
    name: 'Sensitive flow',
    dependency: 'Private notes and approvals',
    owner: 'Security',
    risk: 'critical',
  },
]

const SURFACES = ['copilot', 'workspace', 'claude', 'manual']

export function normalizeProfile(input) {
  const rows = normalizeInventoryRows(input.driftModels || [])
  const normalizedRows = rows.slice(0, 6)

  return {
    appName: String(input.appName || '').trim(),
    provider: String(input.provider || '').trim(),
    currentModel: String(input.currentModel || '').trim(),
    driftModels: normalizedRows,
    workload: String(input.workload || '').trim(),
    region: String(input.region || '').trim(),
    monthlyRequests: normalizeOptionalInt(input.monthlyRequests),
    objective: input.objective || 'route-repeatable-work',
    createdAt: input.createdAt || new Date().toISOString(),
  }
}

export function validateProfile(input) {
  const errors = {}
  const normalized = normalizeProfile(input)
  const parsedRows = normalizeInventoryRows(input.driftModels || [])
  const notes = []

  if (!normalized.appName) {
    errors.appName = 'Workspace name is required to generate a route plan.'
  }

  if (!normalized.provider) {
    errors.provider = 'Signal source is required to generate a route plan.'
  }

  if (!normalized.currentModel) {
    errors.currentModel = 'Route headline is required to generate a route plan.'
  }

  if (!normalized.workload) {
    errors.workload = 'Workflow surface is required to generate a route plan.'
  }

  if (!normalized.region) {
    errors.region = 'Owner group is required to generate a route plan.'
  }

  if (input.monthlyRequests && !isPositiveInteger(input.monthlyRequests)) {
    errors.monthlyRequests = 'Tracked workflows must be a whole number greater than zero.'
  }

  if (!parsedRows.length) {
    notes.push('Add at least 3 workflow rows before a real routing review.')
  } else if (parsedRows.length < 6) {
    notes.push('Add up to 6 workflow rows to exercise the full route matrix.')
  } else if (parsedRows.length > 6) {
    notes.push('Only the first 6 workflow rows are used in this deterministic demo.')
  }

  const missingOwnerRows = parsedRows.filter((row) => !row.owner)
  if (missingOwnerRows.length) {
    notes.push('Owner names are optional, but the matrix is clearer when each workflow has an owner.')
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    notes,
    rowsTruncated: parsedRows.length > normalized.driftModels.length,
    ignoredRowCount: Math.max(parsedRows.length - normalized.driftModels.length, 0),
    profile: normalized,
  }
}

export function generateBrief(input) {
  const profile = normalizeProfile(input)
  const prompts = generatePrompts(profile)
  const seed = stableHash(seedInput(profile))
  const findings = buildFindings(profile, prompts, seed)
  const readiness = buildReadiness(profile, findings)
  const actions = buildActions(profile, prompts, findings)
  const score = buildScore(profile, findings, readiness)
  const generatedAt = deterministicTimestamp(seed)

  return {
    schemaVersion: 1,
    id: `workspaceagentroute-${slugify(profile.appName || profile.provider)}-${seed}`,
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
  const rows = profile.driftModels.length ? profile.driftModels : DEFAULT_ROWS
  return rows.map((row, index) => {
    const bucket = stableHash(`${seed}|${row.name}|${row.dependency}|${row.owner}|${row.risk}|${index}`)
    const scores = scoreSurfaces(profile, row, bucket)
    const ordered = [...scores.entries()].sort((a, b) => b[1] - a[1])
    const [bestSurface, bestScore] = ordered[0]
    const [secondSurface, secondScore] = ordered[1] || ['manual', 0]
    const confidenceGap = Math.max(bestScore - secondScore, 0)
    const status = classifyStatus(profile, row, bestSurface, bestScore, confidenceGap, bucket)
    const signalGap = pickSourceGap(status, row, bestSurface, bucket)

    return {
      promptId: `${slugify(row.name)}-${index + 1}`,
      status,
      dependency: row.dependency || '',
      owner: row.owner || '',
      risk: row.risk || 'watch',
      bestSurface,
      bestSurfaceScore: bestScore,
      confidenceGap,
      topAlternatives: ordered.slice(1, 3).map(([surface, score]) => `${surface} ${score}`),
      likelySourceGap: signalGap,
      recommendedAction: actionFor(profile, row, status, bestSurface, signalGap),
      prompt: promptForRow(row, prompts, index),
    }
  })
}

function scoreSurfaces(profile, row, bucket) {
  const text = `${profile.provider} ${profile.currentModel} ${profile.workload} ${row.name} ${row.dependency} ${row.risk} ${row.owner}`.toLowerCase()
  const appText = `${row.dependency} ${profile.provider}`.toLowerCase()
  const scores = new Map(
    SURFACES.map((surface) => [surface, 24 + (bucket % 11)]),
  )

  bumpIf(scores, 'copilot', text, ['git', 'github', 'repo', 'pull request', 'pr', 'code', 'ci', 'build', 'review', 'bug', 'commit'], 18)
  bumpIf(scores, 'copilot', text, ['copilot', 'agent finder', 'code review', 'pull'], 8)

  bumpIf(scores, 'workspace', text, ['slack', 'docs', 'sheet', 'calendar', 'email', 'crm', 'support', 'ops', 'workflow', 'handoff', 'customer', 'ticket'], 18)
  bumpIf(scores, 'workspace', text, ['workspace agent', 'shared publishing', 'connected apps'], 10)

  bumpIf(scores, 'claude', text, ['write', 'writing', 'summary', 'analysis', 'research', 'memo', 'policy', 'long context', 'report', 'vision'], 18)
  bumpIf(scores, 'claude', text, ['claude', 'model deprecation', 'release notes'], 10)

  bumpIf(scores, 'manual', text, ['sensitive', 'legal', 'finance', 'private', 'approval', 'incident', 'security'], 26)
  bumpIf(scores, 'manual', appText, ['private', 'approval', 'security'], 12)

  if (normalizeRisk(row.risk) === 'critical') bumpIf(scores, 'manual', text, [''], 10)
  if (normalizeRisk(row.risk) === 'opportunity') bumpIf(scores, 'workspace', text, [''], 5)
  if (normalizeRisk(row.risk) === 'watch') bumpIf(scores, 'workspace', text, [''], 3)

  if (profile.objective === 'route-repeatable-work') bumpIf(scores, 'copilot', text, ['repeatable', 'code'], 5)
  if (profile.objective === 'protect-sensitive-tasks') bumpIf(scores, 'manual', text, ['sensitive', 'private'], 10)
  if (profile.objective === 'find-upside') bumpIf(scores, 'workspace', text, ['opportunity', 'pilot', 'rollout'], 6)

  const ownerMissing = !row.owner
  if (ownerMissing) bumpIf(scores, 'manual', text, [''], 6)
  return scores
}

function classifyStatus(profile, row, bestSurface, bestScore, confidenceGap, bucket) {
  const explicit = normalizeRisk(row.risk)
  const sensitive = containsAny(`${profile.provider} ${profile.currentModel} ${row.name} ${row.dependency}`.toLowerCase(), ['sensitive', 'legal', 'finance', 'private', 'approval', 'incident'])

  if (bestSurface === 'manual' || bestScore < 60 || sensitive) {
    return explicit === 'opportunity' && bestScore >= 60 ? 'watch' : 'critical'
  }

  if (bestScore >= 90 || confidenceGap >= 18) {
    return 'no-action'
  }

  if (bestScore >= 75) {
    return explicit === 'critical' ? 'watch' : 'opportunity'
  }

  if (explicit === 'critical') return 'watch'
  if (explicit === 'opportunity') return bucket % 2 === 0 ? 'opportunity' : 'watch'
  return 'watch'
}

function pickSourceGap(status, row, bestSurface, bucket) {
  if (status === 'critical') return 'access-plan'
  if (status === 'opportunity' || status === 'no-action') return 'rollout-plan'
  if (!row.owner) return 'owner-map'
  if (bestSurface === 'manual') return 'access-plan'
  return bucket % 2 === 0 ? 'task-inventory' : 'signal-source'
}

function actionFor(profile, row, status, bestSurface, gap) {
  const workflow = row.name || 'this workflow'
  const owner = row.owner || 'the owner'
  const dependency = row.dependency || 'the current app surface'

  if (status === 'critical') {
    return `Keep ${workflow} manual for now, lock ${owner} to review ${dependency}, and write the access plan before rollout.`
  }
  if (status === 'opportunity') {
    return `Pilot ${workflow} on the ${bestSurface} surface first, then record the owner checklist and rollout order.`
  }
  if (status === 'watch') {
    return `Route ${workflow} to ${bestSurface} only after a quick review of ${dependency} and the owner map.`
  }
  if (gap === 'owner-map') {
    return `Record ${owner} for ${workflow} so the next route plan has a clear checker.`
  }
  return `Keep ${workflow} on the rollout list and note ${bestSurface} as the default surface for the first pilot.`
}

function buildReadiness(profile, findings) {
  const source = profile.provider ? 'ready' : 'risk'
  const inventoryCount = profile.driftModels.length
  const ownerCoverage = profile.driftModels.filter((row) => row.owner).length
  const criticalCount = findings.filter((item) => item.status === 'critical').length

  return [
    {
      state: source,
      label: 'Signal source',
      detail: profile.provider
        ? `The team has a named source: ${profile.provider}.`
        : 'No signal source has been mapped yet.',
      gap: profile.provider ? '' : 'signal-source',
    },
    {
      state: inventoryCount >= 6 ? 'ready' : inventoryCount >= 3 ? 'watch' : 'risk',
      label: 'Task inventory',
      detail:
        inventoryCount >= 6
          ? `The matrix covers ${inventoryCount} workflow rows.`
          : inventoryCount >= 3
            ? `The matrix has ${inventoryCount} rows, but 6 gives better coverage.`
            : 'The matrix is too small to expose the main routing edges.',
      gap: inventoryCount >= 3 ? '' : 'task-inventory',
    },
    {
      state: ownerCoverage === inventoryCount && inventoryCount > 0 ? 'ready' : ownerCoverage > 0 ? 'watch' : 'risk',
      label: 'Owner map',
      detail:
        ownerCoverage === inventoryCount && inventoryCount > 0
          ? 'Every row has an owner.'
          : ownerCoverage > 0
            ? 'Some rows have owners, but not all.'
            : 'No owner has been assigned in the matrix.',
      gap: ownerCoverage ? '' : 'owner-map',
    },
    {
      state: criticalCount <= 1 ? 'ready' : criticalCount <= 3 ? 'watch' : 'risk',
      label: 'Access plan',
      detail:
        criticalCount <= 1
          ? 'The sensitive paths can be reviewed before rollout.'
          : 'The rollout needs a stricter access or manual review plan before it is safe.',
      gap: criticalCount <= 1 ? '' : 'access-plan',
    },
  ]
}

function buildActions(profile, prompts, findings) {
  const criticalRows = findings.filter((item) => item.status === 'critical').slice(0, 3)
  const opportunityRows = findings.filter((item) => item.status === 'opportunity').slice(0, 2)
  const topPrompt = prompts[0]
  const topRow = criticalRows[0] || opportunityRows[0] || findings[0]

  return [
    {
      id: 'map-source',
      title: 'Map the signal source',
      impact: 5,
      effort: 1,
      why: `Summarize ${profile.provider} into one routing brief before the team acts on it.`,
    },
    {
      id: 'assign-owners',
      title: 'Assign owners to critical rows',
      impact: 5,
      effort: 2,
      why: criticalRows.length
        ? `Make ${criticalRows.length} sensitive workflow rows explicit so the checklist has one owner per item.`
        : 'Keep the owner map visible so the next critical workflow does not surprise the team.',
    },
    {
      id: 'write-access-plan',
      title: 'Write the access plan',
      impact: 5,
      effort: 2,
      why: `Document the app access, review boundary, or manual fallback for ${topRow?.prompt || topPrompt?.prompt || profile.currentModel}.`,
    },
    {
      id: 'run-pilot',
      title: 'Run one route pilot',
      impact: 4,
      effort: 2,
      why: `Use the route matrix to validate ${profile.workload} before the first agent rollout.`,
    },
    {
      id: 'capture-upside',
      title: 'Capture rollout upside',
      impact: 4,
      effort: 2,
      why: opportunityRows.length
        ? `Turn ${opportunityRows.length} recommended rows into the first pilot checklist.`
        : 'Keep one row in the matrix for rollout upside so the team does not only react to risk.',
    },
    {
      id: 'publish-checklist',
      title: 'Publish the rollout checklist',
      impact: 4,
      effort: 1,
      why: 'Give the team one page that lists the source, the route matrix, the owners, and the next checks.',
    },
  ]
}

function buildScore(profile, findings, readiness) {
  const routeScore = average(findings.map((finding) => STATUS_WEIGHTS[finding.status] || 0))
  const readinessScore = average(
    readiness.map((item) => {
      if (item.state === 'ready') return 100
      if (item.state === 'watch') return 72
      return 28
    }),
  )
  const inventoryBonus = profile.driftModels.length ? 8 + profile.driftModels.length * 2 : 0
  const criticalCount = findings.filter((item) => item.status === 'critical').length
  const opportunityCount = findings.filter((item) => item.status === 'opportunity').length

  const overall = clamp(
    Math.round(routeScore * 0.42 + readinessScore * 0.38 + inventoryBonus + opportunityCount * 2 - criticalCount * 6),
    0,
    100,
  )

  const routeCoverage = clamp(
    Math.round((findings.filter((item) => item.status !== 'critical').length / Math.max(findings.length, 1)) * 100),
    0,
    100,
  )

  const ownerClarity = clamp(
    Math.round((profile.driftModels.filter((row) => row.owner).length / Math.max(profile.driftModels.length, 1)) * 100),
    0,
    100,
  )

  const accessClarity = clamp(
    Math.round(
      average(
        readiness.map((item) => {
          if (item.state === 'ready') return 100
          if (item.state === 'watch') return 72
          return 28
        }),
      ),
    ),
    0,
    100,
  )

  return {
    overall,
    impactCoverage: routeCoverage,
    ownerClarity,
    actionClarity: accessClarity,
  }
}

function buildSummary(profile, findings, actions, score) {
  const criticalCount = findings.filter((finding) => finding.status === 'critical').length
  const watchCount = findings.filter((finding) => finding.status === 'watch').length
  const topAction = actions[0]?.title || 'Map the signal source'
  const highestPressure = profile.driftModels[0]?.name || profile.currentModel

  return {
    headline:
      score.overall >= 70
        ? 'The rollout is manageable if the team keeps the route matrix and owner checklist first.'
        : 'The routing plan still has a few high-risk edges that should be fixed before rollout.',
    releaseWindow:
      criticalCount > 0
        ? 'This week'
        : watchCount > 2
          ? 'Next rollout'
          : 'This month',
    impactGap:
      profile.driftModels.length
        ? `The matrix centers on ${highestPressure}.`
        : 'No workflow rows have been added yet, so the route matrix is incomplete.',
    ownerGap:
      profile.driftModels.filter((row) => row.owner).length
        ? 'Owners are mapped for the rollout checklist.'
        : 'The workspace has no owner map yet.',
    topAction,
  }
}

function normalizeInventoryRows(value) {
  const rows = Array.isArray(value)
    ? value
    : String(value || '')
      .split(/\n/)
      .map((line, index) => parseInventoryRow(line, index))

  return rows
    .map((item, index) => {
      if (!item) return null
      if (typeof item === 'string') {
        const parsed = parseInventoryRow(item, index)
        return parsed
      }
      return {
        id: item.id || stableId(`${item.name || item.feature || 'row'}-${index}`),
        name: String(item.name || item.feature || '').trim(),
        dependency: String(item.dependency || item.link || '').trim(),
        owner: String(item.owner || '').trim(),
        risk: normalizeRisk(item.risk),
      }
    })
    .filter((item) => item && item.name)
}

function parseInventoryRow(line, index) {
  const raw = String(line || '').trim()
  if (!raw) return null
  const parts = raw.split('|').map((part) => part.trim())
  const [name, dependency = '', owner = '', risk = 'watch'] = parts
  return {
    id: `row-${index + 1}`,
    name,
    dependency,
    owner,
    risk: normalizeRisk(risk),
  }
}

function normalizeRisk(value) {
  const text = String(value || '').trim().toLowerCase()
  if (text.startsWith('crit')) return 'critical'
  if (text.startsWith('opp')) return 'opportunity'
  if (text.startsWith('no')) return 'no-action'
  return 'watch'
}

function promptForRow(row, prompts, index) {
  if (!prompts.length) return row.name
  const selected = prompts[index % prompts.length]
  return selected?.prompt || row.name
}

function containsAny(text, needles) {
  return needles.some((needle) => text.includes(needle))
}

function bumpIf(scores, surface, text, needles, amount) {
  if (containsAny(text, needles)) {
    scores.set(surface, (scores.get(surface) || 0) + amount)
  }
}

function seedInput(profile) {
  return [
    profile.appName,
    profile.provider,
    profile.currentModel,
    profile.driftModels.map((item) => [item.name, item.dependency, item.owner, item.risk].join('|')).join('|'),
    profile.workload,
    profile.region,
    profile.monthlyRequests,
    profile.objective,
  ].join('|')
}

export function stableHash(value) {
  let hash = 0
  const input = String(value || '')
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0
  }
  return hash
}

function normalizeOptionalInt(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  const number = Number.parseInt(text, 10)
  return Number.isFinite(number) && number > 0 ? number : ''
}

function isPositiveInteger(value) {
  const number = Number.parseInt(String(value || '').trim(), 10)
  return Number.isInteger(number) && number > 0
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function deterministicTimestamp(seed) {
  const base = Date.UTC(2026, 5, 22, 0, 0, 0)
  const offsetMinutes = seed % (24 * 60)
  return new Date(base + offsetMinutes * 60 * 1000).toISOString()
}

function stableId(value) {
  return `${slugify(value)}-${stableHash(value).toString(36)}`
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
