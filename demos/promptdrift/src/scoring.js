import { SIMULATION_NOTICE, SOURCE_GAPS, STATUS_WEIGHTS } from './model.js'
import { generatePrompts } from './prompt-generation.js'

const readinessTemplates = [
  {
    id: 'release-notes',
    group: 'sunset-risk',
    label: 'Change watch',
    pass: 'The team already tracks model release notes and can catch model changes early.',
    watch: 'Set a weekly watch on model model release notes and prompt updates.',
    gap: 'No one is assigned to watch release notes or model deprecations.',
  },
  {
    id: 'drift-policy',
    group: 'drift-routing',
    label: 'Fallback policy',
    pass: 'A named critical case exists and the routing rule is explicit.',
    watch: 'Document a primary-to-drift route before the next model change.',
    gap: 'There is no clear prompt contract for an outage or retirement event.',
  },
  {
    id: 'eval-suite',
    group: 'regression-coverage',
    label: 'Eval suite',
    pass: 'The top workflows have enough fixtures to catch output drift.',
    watch: 'Add golden prompts and expected outputs for the most visible workflows.',
    gap: 'The team lacks a prompt regression suite for high-value cases.',
  },
  {
    id: 'prompt-contracts',
    group: 'regression-coverage',
    label: 'Prompt contracts',
    pass: 'System prompts and tool contracts are separated from model choice.',
    watch: 'Pin prompt contracts and tool schemas before changing the model.',
    gap: 'Prompt contracts are too coupled to a specific model behavior.',
  },
  {
    id: 'region-policy',
    group: 'vendor-choice',
    label: 'Release policy fit',
    pass: 'The chosen prompt pairing and region shape are explicit enough to ship safely.',
    watch: 'Check regional handling and data residency before rolling out a change.',
    gap: 'Region and data policy are not mapped to the new prompt path.',
  },
]

export function normalizeFallbackModels(value) {
  const rows = Array.isArray(value)
    ? value
    : String(value || '')
      .split(/\n|,/)
      .map((model) => ({ name: model }))

  return rows
    .map((item, index) => {
      const name = typeof item === 'string' ? item : item.name
      return {
        id: typeof item === 'string' ? stableId(`${name}-${index}`) : item.id || stableId(`${name}-${index}`),
        name: String(name || '').trim(),
      }
    })
    .filter((item) => item.name)
}

export function normalizeProfile(input) {
  const driftModels = normalizeFallbackModels(input.driftModels || [])
  const normalizedFallbackModels = driftModels.slice(0, 4)

  return {
    appName: String(input.appName || '').trim(),
    provider: String(input.provider || '').trim(),
    currentModel: String(input.currentModel || '').trim(),
    driftModels: normalizedFallbackModels,
    workload: String(input.workload || '').trim(),
    region: String(input.region || '').trim(),
    monthlyRequests: normalizeOptionalInt(input.monthlyRequests),
    objective: input.objective || 'migrate-safely',
    createdAt: input.createdAt || new Date().toISOString(),
  }
}

export function validateProfile(input) {
  const errors = {}
  const normalized = normalizeProfile(input)
  const parsedFallbacks = normalizeFallbackModels(input.driftModels || [])
  const notes = []

  if (!normalized.appName) {
    errors.appName = 'App name is required to generate a brief.'
  }

  if (!normalized.provider) {
    errors.provider = 'Provider is required to generate a brief.'
  }

  if (!normalized.currentModel) {
    errors.currentModel = 'Candidate prompt is required to generate a brief.'
  }

  if (!normalized.workload) {
    errors.workload = 'Primary workload is required to generate a brief.'
  }

  if (!normalized.region) {
    errors.region = 'Region is required to generate a brief.'
  }

  if (input.monthlyRequests && !isPositiveInteger(input.monthlyRequests)) {
    errors.monthlyRequests = 'Review runs must be a whole number greater than zero.'
  }

  if (parsedFallbacks.length > 4) {
    notes.push('Only the first 4 critical cases are used in this deterministic demo.')
  }

  if (!parsedFallbacks.length) {
    notes.push('Add at least one critical case before a real release.')
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    notes,
    driftModelsTruncated: parsedFallbacks.length > normalized.driftModels.length,
    ignoredFallbackCount: Math.max(parsedFallbacks.length - normalized.driftModels.length, 0),
    profile: normalized,
  }
}

export function generateBrief(input) {
  const profile = normalizeProfile(input)
  const prompts = generatePrompts(profile)
  const seed = stableHash(seedInput(profile))
  const findings = buildFindings(profile, prompts, seed)
  const readiness = buildReadiness(profile, findings, seed)
  const actions = buildActions(profile, prompts, findings, readiness)
  const score = buildScore(prompts, findings, readiness, profile)
  const generatedAt = deterministicTimestamp(seed)

  return {
    schemaVersion: 1,
    id: `promptdrift-${slugify(profile.appName || profile.provider)}-${seed}`,
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
  const statuses = ['ready', 'watch', 'risk', 'urgent']
  const sourceGaps = ['release-notes', 'drift-policy', 'eval-suite', 'prompt-contracts', 'region-policy']
  let driftPressureAdded = false

  const findings = prompts.map((prompt, index) => {
    const bucket = stableHash(`${seed}|${prompt.id}|${profile.objective}|${index}`)
    let status = statuses[bucket % statuses.length]

    if (profile.objective === 'migrate-safely' && prompt.intentGroup === 'sunset-risk' && bucket % 5 !== 0) {
      status = bucket % 2 === 0 ? 'risk' : 'urgent'
    }

    if (profile.objective === 'preserve-quality' && prompt.intentGroup === 'regression-coverage' && bucket % 4 !== 0) {
      status = bucket % 2 === 0 ? 'watch' : 'risk'
    }

    if (profile.objective === 'reduce-cost' && prompt.intentGroup === 'vendor-choice' && bucket % 3 !== 0) {
      status = bucket % 2 === 0 ? 'watch' : 'risk'
    }

    const likelySourceGap = sourceGaps[(bucket + index) % sourceGaps.length]
    const topAlternatives = pickAlternatives(profile, bucket, status)
    if (topAlternatives.length) driftPressureAdded = true

    return {
      promptId: prompt.id,
      status,
      topAlternatives,
      likelySourceGap,
      recommendedAction: actionFor(profile, prompt, status, likelySourceGap, topAlternatives),
    }
  })

  if (profile.driftModels.length && !driftPressureAdded && findings[0]) {
    findings[0] = {
      ...findings[0],
      status: 'risk',
      topAlternatives: [profile.driftModels[0].name],
      likelySourceGap: 'drift-policy',
      recommendedAction: `Create a primary-to-${profile.driftModels[0].name} route with a rollout flag and rollback path for ${profile.appName}.`,
    }
  }

  return findings
}

function pickAlternatives(profile, bucket, status) {
  if (!profile.driftModels.length) return []
  if (status === 'ready' && bucket % 3 !== 0) return []
  const count = 1 + (bucket % Math.min(2, profile.driftModels.length))
  return profile.driftModels
    .slice()
    .sort((a, b) => stableHash(`${bucket}|${a.name}`) - stableHash(`${bucket}|${b.name}`))
    .slice(0, count)
    .map((drift) => drift.name)
}

function actionFor(profile, prompt, status, gap, alternatives) {
  const altText = alternatives.length ? ` using ${alternatives.join(' and ')}` : ''
  const urgency = status === 'urgent' ? 'this week' : 'before the next release'

  if (gap === 'drift-policy') {
    return `Document a primary-to-drift route${altText} and set the rollback rule for ${profile.appName}.`
  }
  if (gap === 'eval-suite') {
    return `Create golden prompts and expected outputs for the highest-risk workflows in ${profile.workload}.`
  }
  if (gap === 'prompt-contracts') {
    return `Separate the prompt contract and eval rubric from model choice, then pin the contract in code.`
  }
  if (gap === 'region-policy') {
    return `Map region handling for ${profile.region} and verify the prompt choice matches data residency requirements.`
  }

  if (status === 'urgent') {
    return `Treat "${prompt.prompt}" as a drift blocker and add a regression test ${urgency}.`
  }
  if (status === 'risk') {
    return `Add coverage for "${prompt.prompt}" and verify the release gate${altText}.`
  }
  if (status === 'watch') {
    return `Monitor "${prompt.prompt}" in the next release and keep the critical case ready.`
  }
  return `Keep "${prompt.prompt}" in the weekly watch list and confirm the prompt path still behaves as expected.`
}

function buildReadiness(profile, findings, seed) {
  const summary = (state, detail, gap) => ({ state, detail, gap })
  const driftCount = profile.driftModels.length
  const requestPressure = profile.monthlyRequests > 500000 ? 'high' : profile.monthlyRequests > 200000 ? 'medium' : 'low'
  const urgentCount = findings.filter((item) => item.status === 'urgent').length
  const riskCount = findings.filter((item) => item.status === 'risk').length

  return [
    summary(
      driftCount >= 2 && urgentCount === 0 ? 'ready' : driftCount >= 1 ? 'watch' : 'risk',
      driftCount >= 2
        ? `Fallback coverage exists with ${driftCount} candidate models.`
        : driftCount >= 1
          ? 'At least one critical case is named, but the release gate still needs a hard rule.'
          : 'No critical case has been named, so the release path is fragile.',
      driftCount >= 2 ? '' : 'drift-policy',
    ),
    summary(
      riskCount <= 1 ? 'ready' : riskCount <= 3 ? 'watch' : 'risk',
      riskCount <= 1
        ? 'The highest-risk scenarios have enough coverage to survive a prompt change.'
        : 'The workflow set needs golden prompts and output fixtures before a cutover.',
      'eval-suite',
    ),
    summary(
      profile.currentModel.includes('4.5') || profile.currentModel.includes('4.1') || profile.currentModel.includes('o3')
        ? 'watch'
        : 'ready',
      'Release-note watch is important because the candidate prompt is in an active transition window.',
      'release-notes',
    ),
    summary(
      requestPressure === 'high' && driftCount < 2 ? 'risk' : requestPressure === 'high' ? 'watch' : 'ready',
      requestPressure === 'high'
        ? 'High request volume makes rollout discipline more important.'
        : 'Request volume is low enough that the release can be phased safely.',
      'prompt-contracts',
    ),
    summary(
      profile.region.toLowerCase().includes('eu') ? (driftCount ? 'watch' : 'risk') : 'ready',
      profile.region.toLowerCase().includes('eu')
        ? 'EU handling should be documented explicitly before a release.'
        : 'Region handling is simple enough for a first-pass drift brief.',
      'region-policy',
    ),
  ]
}

function buildActions(profile, prompts, findings, readiness) {
  const topRisks = findings.filter((finding) => finding.status === 'risk' || finding.status === 'urgent').slice(0, 3)
  const topPrompt = prompts[0]
  const driftName = profile.driftModels[0]?.name || 'a critical case'
  const topRiskPrompt = prompts.find((prompt) => prompt.id === topRisks[0]?.promptId) || topPrompt

  return [
    {
      id: 'pin-contract',
      title: 'Pin the model contract',
      impact: 5,
      effort: 2,
      why: `Separate the prompt contract from ${profile.currentModel} so a drift does not break the app surface.`,
    },
    {
      id: 'build-router',
      title: 'Add a drift gate',
      impact: 5,
      effort: 3,
      why: `Route high-value traffic from ${profile.currentModel} to ${driftName} with a rollback flag.`,
    },
    {
      id: 'golden-evals',
      title: 'Create golden evals',
      impact: 5,
      effort: 3,
      why: `Freeze the highest-risk workflows from ${profile.workload} so regressions show up before customers do.`,
    },
    {
      id: 'watch-release-notes',
      title: 'Track model release notes',
      impact: 4,
      effort: 1,
      why: `Set a weekly watch on ${profile.provider} release notes and deprecation notices.`,
    },
    {
      id: 'map-region-policy',
      title: 'Map region handling',
      impact: 4,
      effort: 2,
      why: `Document how ${profile.region} traffic and data rules affect the release path.`,
    },
    {
      id: 'release-runbook',
      title: 'Publish a release runbook',
      impact: 4,
      effort: 2,
      why: `Give the team one page that lists the baseline prompt, candidate prompt, owners, and release gate steps.`,
    },
    {
      id: 'test-high-risk',
      title: 'Test the highest-risk prompt first',
      impact: 5,
      effort: 2,
      why: topRisks.length
        ? `Start with "${topRiskPrompt?.prompt || topPrompt?.prompt || topRisks[0].promptId}" and verify the release gate stays stable.`
        : `Start with ${topPrompt?.prompt || 'the top drift prompt'} and verify the release gate stays stable.`,
    },
  ]
}

function buildScore(prompts, findings, readiness, profile) {
  const promptScore = average(findings.map((finding) => STATUS_WEIGHTS[finding.status] || 0))
  const readinessScore = average(
    readiness.map((item) => {
      if (item.state === 'ready') return 100
      if (item.state === 'watch') return 72
      return 32
    }),
  )
  const driftDepth = profile.driftModels.length ? 18 + profile.driftModels.length * 6 : 0
  const requestPressure = profile.monthlyRequests > 500000 ? 14 : profile.monthlyRequests > 200000 ? 8 : 0
  const objectivePressure = profile.objective === 'migrate-safely' ? -3 : profile.objective === 'preserve-quality' ? -1 : 2

  const overall = clamp(
    Math.round(promptScore * 0.42 + readinessScore * 0.36 + driftDepth + 8 - requestPressure - objectivePressure),
    0,
    100,
  )

  const providerIndependence = clamp(
    Math.round(100 - requestPressure * 2 - (profile.driftModels.length ? 6 : 18) - (readiness.some((item) => item.state === 'risk') ? 8 : 0)),
    0,
    100,
  )

  const driftReadiness = clamp(
    Math.round(
      readiness.filter((item) => item.group === 'drift-routing' || item.group === 'sunset-risk').reduce((sum, item) => {
        if (item.state === 'ready') return sum + 100
        if (item.state === 'watch') return sum + 72
        return sum + 28
      }, 0) / 2,
    ),
    0,
    100,
  )

  const regressionCoverage = clamp(
    Math.round(
      readiness.filter((item) => item.group === 'regression-coverage').reduce((sum, item) => {
        if (item.state === 'ready') return sum + 100
        if (item.state === 'watch') return sum + 70
        return sum + 24
      }, 0) / 2,
    ),
    0,
    100,
  )

  return {
    overall,
    providerIndependence,
    driftReadiness,
    regressionCoverage,
  }
}

function buildSummary(profile, findings, actions, score) {
  const urgentCount = findings.filter((finding) => finding.status === 'urgent').length
  const riskCount = findings.filter((finding) => finding.status === 'risk').length
  const topAction = actions[0]?.title || 'Pin the model contract'
  const highestPressure = profile.driftModels[0]?.name || profile.currentModel

  return {
    headline:
      score.overall >= 70
        ? 'The release is manageable if the team keeps the prompt and eval work first.'
        : 'The release still has a few high-risk edges that should be fixed before cutover.',
    releaseWindow:
      urgentCount > 0
        ? 'This week'
        : riskCount > 2
          ? 'Next release'
          : 'This month',
    driftGap:
      profile.driftModels.length
        ? `Fallback planning centers on ${highestPressure}.`
        : 'No critical case is set yet, so the primary risk is a missing release gate.',
    providerCoupling:
      profile.monthlyRequests > 500000
        ? 'High request volume makes provider coupling visible quickly.'
        : 'Request volume is moderate enough to make phased release practical.',
    topAction,
  }
}

function seedInput(profile) {
  return [
    profile.appName,
    profile.provider,
    profile.currentModel,
    profile.driftModels.map((item) => item.name).join('|'),
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
  const base = Date.UTC(2026, 5, 21, 0, 0, 0)
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
