import { COST_DRIVERS, OBJECTIVES, PLAN_LABELS, SIMULATION_NOTICE, STATUS_WEIGHTS } from './model.js'
import { generatePrompts } from './prompt-generation.js'

const readinessTemplates = [
  {
    id: 'seat-hygiene',
    group: 'billing-control',
    label: 'Seat hygiene',
    pass: 'Active developers are close to seat count, so inactive seats will not dominate the bill.',
    watch: 'Reassign the least active seats before the monthly renewal so unused capacity does not sit idle.',
    gap: 'Too many seats are inactive, which is wasting monthly allowance.',
  },
  {
    id: 'review-policy',
    group: 'billing-control',
    label: 'Code review policy',
    pass: 'Review usage is in a controllable range and can stay focused on risky pull requests.',
    watch: 'Limit review usage on low-value repositories and keep the heavyweight review flow for critical code.',
    gap: 'Copilot review is broad enough to drive avoidable credit burn.',
  },
  {
    id: 'model-policy',
    group: 'governance',
    label: 'Advanced model policy',
    pass: 'Advanced model usage is modest and can be reserved for hard refactors.',
    watch: 'Set a rule for when advanced models are allowed and when cheaper defaults should be used.',
    gap: 'Advanced model usage is high enough to push the bill faster than the team expects.',
  },
  {
    id: 'budget-alerts',
    group: 'governance',
    label: 'Budget alerts',
    pass: 'A clear cap is present, so overage thresholds can be tracked before renewal.',
    watch: 'Add threshold alerts so finance or ops sees burn before the end of the month.',
    gap: 'No reliable alerting is set up for bill spikes or overage risk.',
  },
  {
    id: 'usage-visibility',
    group: 'plan-fit',
    label: 'Usage visibility',
    pass: 'Usage is easy to explain at the org level and can be summarized in a weekly review.',
    watch: 'Add a weekly usage dashboard by repo or team to make the forecast easier to steer.',
    gap: 'The org lacks per-repo visibility, so spend will be hard to explain or control.',
  },
]

export function normalizeProfile(input) {
  return {
    orgName: String(input.orgName || '').trim(),
    githubOrg: String(input.githubOrg || '').trim(),
    plan: normalizePlan(input.plan || 'business'),
    planLabel: PLAN_LABELS[normalizePlan(input.plan || 'business')] || 'Business',
    seats: normalizePositiveInt(input.seats),
    activeDevelopers: normalizePositiveInt(input.activeDevelopers),
    repos: normalizePositiveInt(input.repos),
    prsPerMonth: normalizePositiveInt(input.prsPerMonth),
    codeReviewShare: normalizePercent(input.codeReviewShare),
    advancedModelShare: normalizePercent(input.advancedModelShare),
    monthlyCreditCap: normalizeOptionalInt(input.monthlyCreditCap),
    objective: input.objective || 'forecast',
    createdAt: input.createdAt || new Date().toISOString(),
  }
}

export function validateProfile(input) {
  const errors = {}
  const normalized = normalizeProfile(input)
  const notes = []

  if (!normalized.orgName) {
    errors.orgName = 'Organization name is required to generate a brief.'
  }

  if (!normalized.githubOrg) {
    errors.githubOrg = 'GitHub org or repo hub is required to forecast spend.'
  }

  if (!isPositiveInteger(input.seats)) {
    errors.seats = 'Seats must be a whole number greater than zero.'
  }

  if (!isPositiveInteger(input.activeDevelopers)) {
    errors.activeDevelopers = 'Active developers must be a whole number greater than zero.'
  }

  if (!isPositiveInteger(input.repos)) {
    errors.repos = 'Repos in scope must be a whole number greater than zero.'
  }

  if (!isPositiveInteger(input.prsPerMonth)) {
    errors.prsPerMonth = 'PRs per month must be a whole number greater than zero.'
  }

  if (!isOptionalPercent(input.codeReviewShare)) {
    errors.codeReviewShare = 'Code review share must be a percentage between 0 and 100.'
  }

  if (!isOptionalPercent(input.advancedModelShare)) {
    errors.advancedModelShare = 'Advanced model share must be a percentage between 0 and 100.'
  }

  if (!isOptionalInt(input.monthlyCreditCap)) {
    errors.monthlyCreditCap = 'Credit cap must be a whole number if you set one.'
  }

  notes.push('Credit cap is optional. If blank, the forecast relies on plan allowances and workload shape.')

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    notes,
    profile: normalized,
  }
}

export function generateBrief(input) {
  const profile = normalizeProfile(input)
  const prompts = generatePrompts(profile)
  const seed = stableHash(seedInput(profile))
  const forecast = buildForecast(profile, seed)
  const findings = buildFindings(profile, prompts, seed, forecast)
  const readiness = buildReadiness(profile, findings, seed, forecast)
  const actions = buildActions(profile, prompts, findings, readiness, forecast)
  const score = buildScore(prompts, findings, readiness, forecast)
  const generatedAt = new Date().toISOString()

  return {
    schemaVersion: 1,
    id: `copilotburn-${slugify(profile.githubOrg || profile.orgName)}-${seed}`,
    generatedAt,
    profile,
    forecast,
    prompts,
    findings,
    readiness,
    actions,
    score,
    summary: buildSummary(profile, forecast, findings, actions, score),
    simulationNotice: SIMULATION_NOTICE,
  }
}

function buildForecast(profile, seed) {
  const includedByPlan = {
    individual: 700,
    business: 1800,
    enterprise: 4200,
  }

  const includedCredits = Math.round(
    includedByPlan[profile.plan] +
      profile.seats * 28 +
      profile.activeDevelopers * 20 +
      profile.repos * 8,
  )

  const generationLoad = Math.round(profile.activeDevelopers * 40 + profile.prsPerMonth * 0.22 + profile.repos * 2)
  const reviewLoad = profile.codeReviewShare
    ? Math.round(profile.prsPerMonth * (profile.codeReviewShare / 100) * (profile.plan === 'enterprise' ? 4.6 : 5.8))
    : 0
  const modelLoad = profile.advancedModelShare
    ? Math.round(profile.prsPerMonth * (profile.advancedModelShare / 100) * 7.2)
    : 0
  const seatWaste = Math.max(profile.seats - profile.activeDevelopers, 0) * 8
  const repoSprawl = Math.max(profile.repos - Math.ceil(profile.activeDevelopers * 1.5), 0) * 3
  const seedBoost = stableHash(`${seed}|forecast`) % 70
  const projectedCredits = Math.max(100, generationLoad + reviewLoad + modelLoad + seatWaste + repoSprawl + seedBoost)
  const overageCredits = Math.max(projectedCredits - includedCredits, 0)
  const bufferCredits = Math.max(includedCredits - projectedCredits, 0)
  const utilizationPercent = Math.round((projectedCredits / Math.max(includedCredits, 1)) * 100)
  const seatUtilizationPercent = Math.round((profile.activeDevelopers / Math.max(profile.seats, 1)) * 100)
  const driverMix = [
    { key: 'review-scope', credits: reviewLoad },
    { key: 'model-mix', credits: modelLoad },
    { key: 'seat-usage', credits: seatWaste },
    { key: 'repo-sprawl', credits: repoSprawl },
    { key: 'pr-churn', credits: generationLoad },
  ]

  return {
    includedCredits,
    projectedCredits,
    overageCredits,
    bufferCredits,
    utilizationPercent,
    seatUtilizationPercent,
    generationLoad,
    reviewLoad,
    modelLoad,
    seatWaste,
    repoSprawl,
    driverMix,
  }
}

function buildFindings(profile, prompts, seed, forecast) {
  const statuses = ['safe', 'watch', 'hot', 'over']
  const findings = prompts.map((prompt, index) => {
    const bucket = stableHash(`${seed}|${prompt.id}|${index}|${profile.objective}`)
    const utilizationBoost = forecast.utilizationPercent > 100 ? 2 : forecast.utilizationPercent > 85 ? 1 : 0
    const baseIndex = (bucket + utilizationBoost + Math.floor((profile.codeReviewShare + profile.advancedModelShare) / 35)) % statuses.length
    let status = statuses[baseIndex]

    if (forecast.overageCredits > 0 && prompt.intentGroup === 'billing-control' && bucket % 2 === 0) {
      status = 'over'
    } else if (forecast.utilizationPercent > 120 && prompt.intentGroup === 'usage-driver') {
      status = bucket % 3 === 0 ? 'over' : 'hot'
    } else if (profile.objective === 'governance' && prompt.intentGroup === 'governance' && bucket % 3 !== 0) {
      status = bucket % 2 === 0 ? 'hot' : 'watch'
    } else if (profile.objective === 'budget' && prompt.intentGroup === 'billing-control' && bucket % 4 !== 0) {
      status = bucket % 2 === 0 ? 'hot' : 'watch'
    }

    const topDrivers = pickDrivers(profile, forecast, bucket, status)
    return {
      promptId: prompt.id,
      status,
      topDrivers,
      likelySourceGap: topDrivers[0] || 'visibility',
      recommendedAction: actionFor(profile, prompt, status, topDrivers, forecast),
    }
  })

  if (forecast.overageCredits > 0 && findings[0] && !findings.some((finding) => finding.status === 'over')) {
    findings[0] = {
      ...findings[0],
      status: 'over',
      topDrivers: findings[0].topDrivers.length ? findings[0].topDrivers : ['budget-policy'],
      likelySourceGap: findings[0].topDrivers[0] || 'budget-policy',
      recommendedAction: `Put a hard budget alert on ${profile.orgName} and route overage to finance before the next billing cycle.`,
    }
  }

  return findings
}

function pickDrivers(profile, forecast, bucket, status) {
  const candidates = []

  if (forecast.reviewLoad > 0) candidates.push('review-scope')
  if (forecast.modelLoad > 0) candidates.push('model-mix')
  if (forecast.seatWaste > 0) candidates.push('seat-usage')
  if (forecast.repoSprawl > 0) candidates.push('repo-sprawl')
  if (forecast.generationLoad > 0) candidates.push('pr-churn')
  if (profile.monthlyCreditCap > 0 && forecast.overageCredits > 0) candidates.push('budget-policy')
  if (!candidates.length) candidates.push('visibility')

  const count = status === 'over' ? 2 : status === 'hot' ? 2 : 1
  return candidates
    .slice()
    .sort((a, b) => stableHash(`${bucket}|${a}`) - stableHash(`${bucket}|${b}`))
    .slice(0, Math.min(count, candidates.length))
}

function actionFor(profile, prompt, status, drivers, forecast) {
  const primary = drivers[0] || 'visibility'
  const driverText = COST_DRIVERS[primary] || primary
  if (primary === 'seat-usage') {
    return `Reassign idle seats and remove infrequent contributors before renewal so ${profile.orgName} stops paying for unused access.`
  }
  if (primary === 'review-scope') {
    return `Limit Copilot review to the highest-risk repositories and pause it on low-value PRs.`
  }
  if (primary === 'model-mix') {
    return `Reserve advanced models for hard refactors and keep routine edits on cheaper defaults.`
  }
  if (primary === 'repo-sprawl') {
    return `Group low-activity repos under a lighter policy and avoid blanket rollout across ${profile.repos} repos.`
  }
  if (primary === 'pr-churn') {
    return `Batch noisy changes into fewer PRs so the team pays for less repeated context and review overhead.`
  }
  if (primary === 'budget-policy') {
    return `Set a weekly budget alert and route overage risk to finance and ops before the bill closes.`
  }
  if (status === 'over') {
    return `Freeze expensive Copilot workflows until the burn is back under the ${profile.monthlyCreditCap || 'current'} credit cap.`
  }
  return `Make ${driverText} visible in a weekly dashboard so leadership can steer spend before the month closes.`
}

function buildReadiness(profile, findings, seed, forecast) {
  return readinessTemplates.map((template) => {
    const bucket = stableHash(`${seed}|readiness|${template.id}`)
    let state = bucket % 3 === 0 ? 'pass' : bucket % 3 === 1 ? 'watch' : 'gap'

    if (template.id === 'seat-hygiene' && profile.seats - profile.activeDevelopers >= 4) state = 'gap'
    if (template.id === 'review-policy' && profile.codeReviewShare >= 45) state = forecast.overageCredits > 0 ? 'gap' : 'watch'
    if (template.id === 'model-policy' && profile.advancedModelShare >= 25) state = forecast.overageCredits > 0 ? 'gap' : 'watch'
    if (template.id === 'budget-alerts' && profile.monthlyCreditCap > 0 && forecast.overageCredits > 0) state = 'gap'
    if (template.id === 'budget-alerts' && !profile.monthlyCreditCap) state = 'watch'
    if (template.id === 'usage-visibility' && (profile.repos >= 20 || profile.prsPerMonth >= 300)) state = state === 'pass' ? 'watch' : state

    return {
      id: template.id,
      group: template.group,
      label: template.label,
      state,
      detail: template[state],
    }
  })
}

function buildActions(profile, prompts, findings, readiness, forecast) {
  const findingActions = findings
    .filter((finding) => finding.status !== 'safe')
    .slice(0, 6)
    .map((finding, index) => {
      const prompt = prompts.find((item) => item.id === finding.promptId)
      const impact = finding.status === 'over' ? 5 : finding.status === 'hot' ? 4 : 3
      const effort = finding.likelySourceGap === 'budget-policy' ? 2 : finding.likelySourceGap === 'visibility' ? 2 : 3
      return {
        id: `action-finding-${index + 1}`,
        title: titleForAction(profile, prompt, finding),
        why: finding.recommendedAction,
        effort,
        impact,
        priorityScore: impact * 2 - effort + (prompt?.priority === 'high' ? 2 : 0),
        relatedPrompts: [finding.promptId],
      }
    })

  const readinessActions = readiness
    .filter((check) => check.state !== 'pass')
    .slice(0, 3)
    .map((check, index) => ({
      id: `action-readiness-${index + 1}`,
      title: `Fix ${check.label.toLowerCase()}`,
      why: check.detail,
      effort: check.state === 'gap' ? 3 : 2,
      impact: check.state === 'gap' ? 4 : 3,
      priorityScore: (check.state === 'gap' ? 4 : 3) * 2 - (check.state === 'gap' ? 3 : 2),
      relatedPrompts: [],
    }))

  const planFitAction = profile.monthlyCreditCap > 0 && forecast.overageCredits > 0
    ? [{
        id: 'action-plan-fit',
        title: 'Revisit the plan tier before renewal',
        why: `The forecast exceeds the current cap by ${forecast.overageCredits} credits, so plan fit should be reviewed before the next billing cycle.`,
        effort: 3,
        impact: 5,
        priorityScore: 7,
        relatedPrompts: [],
      }]
    : []

  return [...findingActions, ...readinessActions, ...planFitAction]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 7)
}

function titleForAction(profile, prompt, finding) {
  if (finding.likelySourceGap === 'seat-usage') return 'Trim idle seats'
  if (finding.likelySourceGap === 'review-scope') return 'Limit Copilot review scope'
  if (finding.likelySourceGap === 'model-mix') return 'Reserve advanced models'
  if (finding.likelySourceGap === 'repo-sprawl') return 'Group low-usage repos'
  if (finding.likelySourceGap === 'pr-churn') return 'Reduce repeated PR churn'
  if (finding.likelySourceGap === 'budget-policy') return 'Set budget alerts'
  if (finding.likelySourceGap === 'visibility') return 'Publish weekly usage visibility'
  return `Clarify ${prompt?.intentGroup || 'billing'} controls`
}

function buildScore(prompts, findings, readiness, forecast) {
  const statusAverage = average(findings.map((finding) => STATUS_WEIGHTS[finding.status] || 0))
  const readinessBonus = readiness.reduce((sum, check) => {
    if (check.state === 'pass') return sum + 6
    if (check.state === 'watch') return sum + 2
    return sum - 3
  }, 0)
  const utilizationPenalty = forecast.utilizationPercent > 100
    ? Math.min(55, (forecast.utilizationPercent - 100) * 1.4)
    : Math.max(0, (80 - forecast.utilizationPercent) * 0.08)
  const overagePenalty = forecast.overageCredits
    ? Math.min(30, (forecast.overageCredits / Math.max(forecast.includedCredits, 1)) * 100 * 0.9)
    : 0
  const seatWastePenalty = forecast.seatUtilizationPercent < 65
    ? (65 - forecast.seatUtilizationPercent) * 0.1
    : 0
  const safeCountBonus = findings.filter((finding) => finding.status === 'safe').length * 1.5
  const overCountPenalty = findings.filter((finding) => finding.status === 'over').length * 1.5
  const objectiveFit = findings.some((finding) => {
    const prompt = prompts.find((item) => item.id === finding.promptId)
    return prompt?.intentGroup === objectiveIntent(forecast, prompts) && finding.status === 'safe'
  }) ? 3 : 0
  const overall = clamp(Math.round(55 + statusAverage * 0.22 + readinessBonus + safeCountBonus + objectiveFit - utilizationPenalty - overagePenalty - seatWastePenalty - overCountPenalty))

  const byIntent = {}
  for (const prompt of prompts) {
    const finding = findings.find((item) => item.promptId === prompt.id)
    byIntent[prompt.intentGroup] ||= []
    byIntent[prompt.intentGroup].push(STATUS_WEIGHTS[finding?.status] || 0)
  }

  return {
    overall,
    byIntent: Object.fromEntries(Object.entries(byIntent).map(([group, values]) => [group, Math.round(average(values))])),
    burnRisk: clamp(Math.round(forecast.utilizationPercent)),
    overagePressure: clamp(Math.round((forecast.overageCredits / Math.max(forecast.includedCredits, 1)) * 100)),
  }
}

function buildSummary(profile, forecast, findings, actions, score) {
  const topDrivers = forecast.driverMix
    .slice()
    .sort((a, b) => b.credits - a.credits)
    .filter((item) => item.credits > 0)
    .slice(0, 2)
    .map((item) => COST_DRIVERS[item.key] || item.key)

  const overageLine = forecast.overageCredits > 0
    ? `The forecast runs ${forecast.overageCredits} credits over the current allowance.`
    : `${forecast.bufferCredits} credits of buffer remain before the cap is hit.`

  return {
    usageSnapshot: `${profile.planLabel} plan · ${profile.activeDevelopers}/${profile.seats} active seats · ${profile.repos} repos · ${profile.prsPerMonth} PRs per month.`,
    costDriver: `${topDrivers.length ? `${topDrivers.join(' and ')} drive most of the burn.` : 'The workload is relatively even, so no single driver dominates the bill.'} ${overageLine} Score: ${score.overall}/100.`,
    nextWeekFocus: actions[0]?.title || 'Set a weekly usage dashboard before the next billing cycle.',
    coverageLine: `${findings.filter((finding) => finding.status === 'safe').length} of ${findings.length} simulated billing questions are currently in a safe state.`,
  }
}

function objectiveIntent(forecast, prompts) {
  const objective = forecast.utilizationPercent > 110 ? 'billing-control' : 'usage-driver'
  if (forecast.overageCredits > 0) return 'billing-control'
  const groupSet = new Set(prompts.map((prompt) => prompt.intentGroup))
  if (groupSet.has('governance') && forecast.seatUtilizationPercent < 80) return 'governance'
  if (groupSet.has('usage-driver')) return objective
  return 'plan-fit'
}

function normalizePlan(value) {
  const plan = String(value || '').toLowerCase()
  if (plan === 'individual' || plan === 'business' || plan === 'enterprise') return plan
  return 'business'
}

function normalizePositiveInt(value) {
  const parsed = Number.parseInt(String(value || '').trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function normalizeOptionalInt(value) {
  const raw = String(value || '').trim()
  if (!raw) return 0
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function normalizePercent(value) {
  const raw = String(value || '').trim()
  if (!raw) return 0
  const parsed = Number.parseFloat(raw)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return 0
  return Math.round(parsed)
}

function isPositiveInteger(value) {
  const parsed = Number.parseInt(String(value || '').trim(), 10)
  return Number.isInteger(parsed) && parsed > 0
}

function isOptionalPercent(value) {
  const raw = String(value || '').trim()
  if (!raw) return true
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100
}

function isOptionalInt(value) {
  const raw = String(value || '').trim()
  if (!raw) return true
  const parsed = Number.parseInt(raw, 10)
  return Number.isInteger(parsed) && parsed >= 0
}

function seedInput(profile) {
  return [
    profile.orgName.toLowerCase(),
    profile.githubOrg.toLowerCase(),
    profile.plan,
    String(profile.seats),
    String(profile.activeDevelopers),
    String(profile.repos),
    String(profile.prsPerMonth),
    String(profile.codeReviewShare),
    String(profile.advancedModelShare),
    String(profile.monthlyCreditCap),
    profile.objective,
  ].join('|')
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function stableHash(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}
