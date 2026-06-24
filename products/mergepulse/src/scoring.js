import { SIMULATION_NOTICE, SOURCE_GAPS, STATUS_WEIGHTS } from './model.js'
import { generatePrompts } from './prompt-generation.js'

const DEFAULT_ROWS = [
  {
    name: 'Repo source',
    dependency: 'OpenAI / Anthropic / GitHub changelog',
    owner: 'Platform',
    risk: 'watch',
  },
  {
    name: 'PR inventory',
    dependency: 'Core customer flow',
    owner: 'PM',
    risk: 'critical',
  },
  {
    name: 'Owner map',
    dependency: 'Named owner',
    owner: 'Ops',
    risk: 'watch',
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
    objective: input.objective || 'find-bottlenecks',
    createdAt: input.createdAt || new Date().toISOString(),
  }
}

export function validateProfile(input) {
  const errors = {}
  const normalized = normalizeProfile(input)
  const parsedRows = normalizeInventoryRows(input.reviewModels || [])
  const notes = []

  if (!normalized.appName) {
    errors.appName = 'App name is required to generate a merge brief.'
  }

  if (!normalized.provider) {
    errors.provider = 'Repo source is required to generate a merge brief.'
  }

  if (!normalized.currentModel) {
    errors.currentModel = 'Run headline is required to generate a merge brief.'
  }

  if (!normalized.workload) {
    errors.workload = 'Repo surface is required to generate a merge brief.'
  }

  if (!normalized.region) {
    errors.region = 'Owner group is required to generate a merge brief.'
  }

  if (input.monthlyRequests && !isPositiveInteger(input.monthlyRequests)) {
    errors.monthlyRequests = 'Changed files must be a whole number greater than zero.'
  }

  if (!parsedRows.length) {
    notes.push('Add at least 3 PR rows before a real merge review.')
  } else if (parsedRows.length < 6) {
    notes.push('Add up to 6 PR rows to exercise the full merge matrix.')
  } else if (parsedRows.length > 6) {
    notes.push('Only the first 6 PR rows are used in this deterministic demo.')
  }

  const missingOwnerRows = parsedRows.filter((row) => !row.owner)
  if (missingOwnerRows.length) {
    notes.push('Owner names are optional, but the matrix is clearer when each PR row has an owner.')
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
    id: `agentmergeconsole-${slugify(profile.appName || profile.provider)}-${seed}`,
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
      topAlternatives: topAlternativesFor(row),
      likelySourceGap: signalGap,
      recommendedAction: actionFor(profile, row, status, signalGap),
      prompt: promptForRow(row, prompts, index),
    }
  })
}

function classifyStatus(profile, row, bucket) {
  const text = `${profile.provider} ${profile.currentModel} ${profile.workload} ${row.name} ${row.dependency} ${row.risk}`.toLowerCase()
  const explicit = normalizeRisk(row.risk)

  if (containsAny(text, ['error', 'retry', 'latency', 'timeout', 'failure', 'crash', 'drop'])) {
    return explicit === 'opportunity' ? 'watch' : 'critical'
  }

  if (containsAny(text, ['merge', 'span', 'tool', 'handoff', 'approval', 'agent', 'eval', 'observability'])) {
    if (profile.objective === 'reduce-cost') return bucket % 3 === 0 ? 'opportunity' : 'watch'
    return bucket % 4 === 0 ? 'opportunity' : 'watch'
  }

  if (containsAny(text, ['retire', 'deprec', 'billing', 'limit', 'suspend', 'remove'])) {
    return explicit === 'opportunity' ? 'watch' : 'critical'
  }

  if (containsAny(text, ['preview', 'launch', 'metrics', 'usage', 'policy', 'sdk'])) {
    if (profile.objective === 'reduce-cost') return 'opportunity'
    return bucket % 3 === 0 ? 'opportunity' : 'watch'
  }

  if (explicit === 'critical') {
    return bucket % 2 === 0 ? 'critical' : 'watch'
  }

  if (explicit === 'opportunity') {
    return bucket % 2 === 0 ? 'opportunity' : 'watch'
  }

  if (explicit === 'watch') {
    return bucket % 4 === 0 ? 'watch' : 'no-action'
  }

  return bucket % 5 === 0 ? 'watch' : 'no-action'
}

function pickSourceGap(status, row, bucket) {
  if (status === 'critical') return 'replay-plan'
  if (status === 'opportunity') return 'threshold-plan'
  if (status === 'watch') {
    if (containsAny(`${row.dependency} ${row.name}`.toLowerCase(), ['owner', 'owner map'])) return 'owner-map'
    return bucket % 2 === 0 ? 'span-inventory' : 'merge-source'
  }
  return bucket % 2 === 0 ? 'span-inventory' : 'owner-map'
}

function actionFor(profile, row, status, gap) {
  const featureName = row.name || 'this feature'
  const owner = row.owner || 'the owner'
  const dependency = row.dependency || 'the merge'

  if (status === 'critical') {
    return `Assign ${owner} to replay ${featureName} against ${dependency} and keep a fallback path ready for ${profile.appName}.`
  }
  if (status === 'opportunity') {
    return `Have ${owner} test whether ${featureName} can benefit from ${dependency} without changing the merge gate.`
  }
  if (status === 'watch') {
    return `Monitor ${featureName} for the next merge run and confirm the owner can smoke test the change.`
  }
  if (gap === 'owner-map') {
    return `Record ${owner} for ${featureName} so the next merge has a clear checker.`
  }
  return `Keep ${featureName} on the watch list and note the repo source in the team checklist.`
}

function buildReadiness(profile, findings) {
  const source = profile.provider ? 'ready' : 'risk'
  const inventoryCount = profile.reviewModels.length
  const ownerCoverage = profile.reviewModels.filter((row) => row.owner).length
  const criticalCount = findings.filter((item) => item.status === 'critical').length

  return [
    {
      state: source,
      label: 'Repo source',
      detail: profile.provider
        ? `The team has a named repo source: ${profile.provider}.`
        : 'No repo source has been mapped yet.',
      gap: profile.provider ? '' : 'merge-source',
    },
    {
      state: inventoryCount >= 6 ? 'ready' : inventoryCount >= 3 ? 'watch' : 'risk',
      label: 'PR inventory',
      detail:
        inventoryCount >= 6
          ? `The matrix covers ${inventoryCount} PR rows.`
          : inventoryCount >= 3
            ? `The matrix has ${inventoryCount} rows, but 6 gives better coverage.`
            : 'The matrix is too small to expose the main merge edges.',
      gap: inventoryCount >= 3 ? '' : 'span-inventory',
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
      label: 'Validation plan',
      detail:
        criticalCount <= 1
          ? 'The critical paths can be smoke-tested before the next merge run.'
          : 'The merge needs a replay or smoke plan before it is safe.',
      gap: criticalCount <= 1 ? '' : 'replay-plan',
    },
  ]
}

function buildActions(profile, prompts, findings, readiness) {
  const criticalRows = findings.filter((item) => item.status === 'critical').slice(0, 3)
  const opportunityRows = findings.filter((item) => item.status === 'opportunity').slice(0, 2)
  const topPrompt = prompts[0]
  const topRow = criticalRows[0] || opportunityRows[0] || findings[0]

  return [
    {
      id: 'map-source',
      title: 'Map the repo source',
      impact: 5,
      effort: 1,
      why: `Summarize ${profile.provider} into one merge brief before the team acts on it.`,
    },
    {
      id: 'assign-owners',
      title: 'Assign owners to critical rows',
      impact: 5,
      effort: 2,
      why: criticalRows.length
        ? `Make ${criticalRows.length} critical PR rows explicit so the checklist has one owner per item.`
        : 'Keep the owner map visible so the next critical row does not surprise the team.',
    },
    {
      id: 'write-fallback',
      title: 'Write the replay plan',
      impact: 5,
      effort: 2,
      why: `Document the replay or smoke path for ${topRow?.prompt || topPrompt?.prompt || profile.currentModel}.`,
    },
    {
      id: 'run-smoke',
      title: 'Run a merge smoke check',
      impact: 4,
      effort: 2,
      why: `Use the merge matrix to validate ${profile.workload} before the next merge lands.`,
    },
    {
      id: 'capture-upgrade',
      title: 'Capture upgrade opportunities',
      impact: 4,
      effort: 2,
      why: opportunityRows.length
        ? `Turn ${opportunityRows.length} opportunity rows into a follow-up checklist for the next iteration.`
        : 'Keep one row in the matrix for upside so the team does not only react to risk.',
    },
    {
      id: 'publish-checklist',
      title: 'Publish the action checklist',
      impact: 4,
      effort: 1,
      why: 'Give the team one page that lists the repo source, the matrix, the owners, and the next checks.',
    },
  ]
}

function buildScore(profile, findings, readiness) {
  const impactScore = average(findings.map((finding) => STATUS_WEIGHTS[finding.status] || 0))
  const readinessScore = average(
    readiness.map((item) => {
      if (item.state === 'ready') return 100
      if (item.state === 'watch') return 72
      return 28
    }),
  )
  const inventoryBonus = profile.reviewModels.length ? 8 + profile.reviewModels.length * 2 : 0
  const criticalCount = findings.filter((item) => item.status === 'critical').length
  const opportunityCount = findings.filter((item) => item.status === 'opportunity').length

  const overall = clamp(
    Math.round(impactScore * 0.4 + readinessScore * 0.4 + inventoryBonus + opportunityCount * 2 - criticalCount * 6),
    0,
    100,
  )

  const impactCoverage = clamp(
    Math.round((findings.filter((item) => item.status !== 'no-action').length / Math.max(findings.length, 1)) * 100),
    0,
    100,
  )

  const ownerClarity = clamp(
    Math.round((profile.reviewModels.filter((row) => row.owner).length / Math.max(profile.reviewModels.length, 1)) * 100),
    0,
    100,
  )

  const actionClarity = clamp(
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
    impactCoverage,
    ownerClarity,
    actionClarity,
  }
}

function buildSummary(profile, findings, actions, score) {
  const criticalCount = findings.filter((finding) => finding.status === 'critical').length
  const watchCount = findings.filter((finding) => finding.status === 'watch').length
  const topAction = actions[0]?.title || 'Map the repo source'
  const highestPressure = profile.reviewModels[0]?.name || profile.currentModel

  return {
    headline:
      score.overall >= 70
        ? 'The merge plan is manageable if the team keeps the matrix and owner checklist first.'
        : 'The merge still has a few high-risk edges that should be fixed before cutover.',
    mergeWindow:
      criticalCount > 0
        ? 'This week'
        : watchCount > 2
          ? 'Next merge run'
          : 'This month',
    impactGap:
      profile.reviewModels.length
        ? `The matrix centers on ${highestPressure}.`
        : 'No PR rows have been added yet, so the matrix is incomplete.',
    ownerGap:
      profile.reviewModels.filter((row) => row.owner).length
        ? 'Owners are mapped for the merge checklist.'
        : 'The merge has no owner map yet.',
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

function topAlternativesFor(row) {
  const alternatives = [row.owner, row.dependency]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  return alternatives.slice(0, 2)
}

function promptForRow(row, prompts, index) {
  if (!prompts.length) return row.name
  const selected = prompts[index % prompts.length]
  return selected?.prompt || row.name
}

function containsAny(text, needles) {
  return needles.some((needle) => text.includes(needle))
}

function seedInput(profile) {
  return [
    profile.appName,
    profile.provider,
    profile.currentModel,
    profile.reviewModels.map((item) => [item.name, item.dependency, item.owner, item.risk].join('|')).join('|'),
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
