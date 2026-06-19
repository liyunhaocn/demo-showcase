import { SIMULATION_NOTICE, STATUS_WEIGHTS } from './model.js'
import { generatePrompts } from './prompt-generation.js'

const readinessTemplates = [
  {
    id: 'technical-access',
    group: 'technical',
    label: 'Technical access',
    pass: 'Domain is clean and likely crawlable for basic source discovery.',
    watch: 'Domain exists, but add clear HTML headings and indexable comparison sections.',
    gap: 'Website is weakly formed, making citation discovery less likely.',
  },
  {
    id: 'proof',
    group: 'proof',
    label: 'Proof and third-party evidence',
    pass: 'Competitor pressure is offset by named proof, reviews, or case study opportunities.',
    watch: 'Add quantified proof and named customer evidence to reduce answer uncertainty.',
    gap: 'AI answers are likely to cite competitors with stronger third-party proof.',
  },
  {
    id: 'comparison-coverage',
    group: 'comparison-coverage',
    label: 'Comparison coverage',
    pass: 'Comparison prompts have a clear page target and action path.',
    watch: 'Comparison pages should clarify target segment, alternatives, and switching triggers.',
    gap: 'No obvious comparison asset exists for high-intent buyer questions.',
  },
  {
    id: 'structured-facts',
    group: 'content',
    label: 'Structured facts',
    pass: 'Category, pricing, audience, and proof facts can be summarized consistently.',
    watch: 'Add a concise facts block with category, buyer, use cases, pricing, and proof.',
    gap: 'The brand lacks structured facts that an AI answer can confidently cite.',
  },
  {
    id: 'freshness',
    group: 'content',
    label: 'Freshness and specificity',
    pass: 'The current profile has enough specificity for a current answer brief.',
    watch: 'Refresh dated pages and use buyer-specific claims instead of generic category copy.',
    gap: 'Generic positioning makes the brand easy to omit from current AI buying answers.',
  },
]

export function normalizeWebsite(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .replace(/\/+$/g, '')
    .toLowerCase()
}

export function normalizeProfile(input) {
  const parsedCompetitors = parseCompetitors(input.competitors || [])

  return {
    brandName: String(input.brandName || '').trim(),
    website: String(input.website || '').trim(),
    normalizedDomain: normalizeWebsite(input.website || input.normalizedDomain || ''),
    category: String(input.category || '').trim(),
    targetBuyer: String(input.targetBuyer || '').trim(),
    objective: input.objective || 'comparison',
    competitors: parsedCompetitors.competitors,
    createdAt: input.createdAt || new Date().toISOString(),
  }
}

export function parseCompetitors(value) {
  const rows = Array.isArray(value)
    ? value
    : String(value || '')
      .split(/\n|,/)
      .map((name) => ({ name }))

  const normalizedRows = rows
    .map((competitor, index) => {
      const name = typeof competitor === 'string' ? competitor : competitor.name
      const website = typeof competitor === 'string' ? '' : competitor.website
      return {
        id: typeof competitor === 'string' ? stableId(`${name}-${index}`) : competitor.id || stableId(`${name}-${index}`),
        name: String(name || '').trim(),
        website: normalizeWebsite(website || ''),
      }
    })
    .filter((competitor) => competitor.name)

  const competitors = normalizedRows.slice(0, 4)

  return {
    competitors,
    truncated: normalizedRows.length > competitors.length,
    ignoredCount: Math.max(normalizedRows.length - competitors.length, 0),
    originalCount: normalizedRows.length,
  }
}

export function validateProfile(input) {
  const errors = {}
  const normalized = normalizeProfile(input)
  const parsedCompetitors = parseCompetitors(input.competitors || [])
  const notes = []

  if (!normalized.brandName) {
    errors.brandName = 'Brand name is required to generate a brief.'
  }

  if (!normalized.category) {
    errors.category = 'Category is required to generate a brief.'
  }

  if (!isValidDomain(normalized.normalizedDomain)) {
    errors.website = 'Website must look like a domain or URL, for example example.com.'
  }

  if (parsedCompetitors.truncated) {
    notes.push('Only the first 4 competitors are used in this deterministic demo.')
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    notes,
    competitorsTruncated: parsedCompetitors.truncated,
    ignoredCompetitorCount: parsedCompetitors.ignoredCount,
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
  const generatedAt = new Date().toISOString()

  return {
    schemaVersion: 1,
    id: `answerrank-${profile.normalizedDomain}-${seed}`,
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
  const statuses = ['cited', 'mentioned', 'mispositioned', 'missing']
  const sourceGaps = ['comparison-page', 'proof', 'structured-facts', 'technical-access', 'positioning']
  let competitorPressureAdded = false

  const findings = prompts.map((prompt, index) => {
    const bucket = stableHash(`${seed}|${prompt.id}|${profile.objective}|${index}`)
    let status = statuses[bucket % statuses.length]

    if (profile.objective === 'comparison' && prompt.intentGroup === 'comparison' && bucket % 5 !== 0) {
      status = bucket % 2 === 0 ? 'missing' : 'mispositioned'
    }

    if (profile.objective === 'brand-defense' && prompt.intentGroup === 'brand-defense' && bucket % 4 === 0) {
      status = 'mentioned'
    }

    const likelySourceGap = sourceGaps[(bucket + index) % sourceGaps.length]
    const topCompetitors = pickCompetitors(profile, bucket, status)
    if (topCompetitors.length) competitorPressureAdded = true

    return {
      promptId: prompt.id,
      status,
      topCompetitors,
      likelySourceGap,
      recommendedAction: actionFor(profile, prompt, status, likelySourceGap, topCompetitors),
    }
  })

  if (profile.competitors.length && !competitorPressureAdded && findings[0]) {
    findings[0] = {
      ...findings[0],
      status: 'missing',
      topCompetitors: [profile.competitors[0].name],
      likelySourceGap: 'comparison-page',
      recommendedAction: `Publish a direct ${profile.brandName} vs ${profile.competitors[0].name} page with buyer-fit criteria and proof.`,
    }
  }

  return findings
}

function pickCompetitors(profile, bucket, status) {
  if (!profile.competitors.length) return []
  if (status === 'cited' && bucket % 3 !== 0) return []
  const count = 1 + (bucket % Math.min(2, profile.competitors.length))
  return profile.competitors
    .slice()
    .sort((a, b) => stableHash(`${bucket}|${a.name}`) - stableHash(`${bucket}|${b.name}`))
    .slice(0, count)
    .map((competitor) => competitor.name)
}

function actionFor(profile, prompt, status, gap, competitors) {
  const competitorText = competitors.length ? ` against ${competitors.join(' and ')}` : ''
  if (gap === 'comparison-page') {
    return `Create a comparison page for "${prompt.prompt}"${competitorText}, with fit criteria and switching triggers.`
  }
  if (gap === 'proof') {
    return `Add named proof, quantified outcomes, and customer evidence that support ${profile.brandName} for this buyer question.`
  }
  if (gap === 'structured-facts') {
    return `Add a concise facts block covering category, target buyer, use cases, pricing, and proof points.`
  }
  if (gap === 'technical-access') {
    return `Make the answer source easier to parse with indexable headings, descriptive titles, and crawlable HTML content.`
  }
  if (status === 'mispositioned') {
    return `Clarify positioning for ${profile.targetBuyer || 'the target buyer'} so AI answers do not place ${profile.brandName} in the wrong segment.`
  }
  return `Refresh the page most likely to answer this prompt and add a short buyer-focused answer section.`
}

function buildReadiness(profile, findings, seed) {
  const missingCount = findings.filter((finding) => finding.status === 'missing').length
  const competitorCount = findings.filter((finding) => finding.topCompetitors.length > 0).length

  return readinessTemplates.map((template, index) => {
    const bucket = stableHash(`${seed}|readiness|${template.id}`)
    let state = bucket % 3 === 0 ? 'pass' : bucket % 3 === 1 ? 'watch' : 'gap'

    if (template.id === 'comparison-coverage' && profile.objective === 'comparison' && missingCount > 1) state = 'gap'
    if (template.id === 'proof' && competitorCount > 1) state = 'watch'
    if (template.id === 'technical-access' && profile.normalizedDomain) state = state === 'gap' ? 'watch' : state
    if (index === 0 && state === 'gap') state = 'watch'

    return {
      id: template.id,
      group: template.group,
      label: template.label,
      state,
      detail: template[state],
    }
  })
}

function buildActions(profile, prompts, findings, readiness) {
  const findingActions = findings
    .filter((finding) => finding.status === 'missing' || finding.status === 'mispositioned')
    .slice(0, 6)
    .map((finding, index) => {
      const prompt = prompts.find((item) => item.id === finding.promptId)
      const impact = finding.status === 'missing' ? 5 : 4
      const effort = finding.likelySourceGap === 'technical-access' ? 2 : finding.likelySourceGap === 'proof' ? 3 : 4
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

  return [...findingActions, ...readinessActions]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 7)
}

function titleForAction(profile, prompt, finding) {
  if (finding.likelySourceGap === 'comparison-page') return `Ship a ${profile.brandName} comparison page`
  if (finding.likelySourceGap === 'proof') return 'Add proof that AI answers can cite'
  if (finding.likelySourceGap === 'structured-facts') return 'Publish a structured facts block'
  if (finding.likelySourceGap === 'technical-access') return 'Make the source page crawlable and clear'
  return `Clarify ${prompt?.intentGroup || 'buyer'} positioning`
}

function buildScore(prompts, findings, readiness, profile) {
  const statusAverage = average(findings.map((finding) => STATUS_WEIGHTS[finding.status] || 0))
  const readinessBonus = readiness.reduce((sum, check) => {
    if (check.state === 'pass') return sum + 5
    if (check.state === 'watch') return sum + 1
    return sum - 4
  }, 0)
  const competitorPressureCount = findings.filter((finding) => finding.topCompetitors.length > 0).length
  const competitorPressure = clamp(Math.round((competitorPressureCount / Math.max(findings.length, 1)) * 100))
  const pressurePenalty = profile.competitors.length ? competitorPressure * 0.08 : 0
  const objectiveFit = findings.some((finding) => {
    const prompt = prompts.find((item) => item.id === finding.promptId)
    return prompt?.intentGroup === objectiveIntent(profile.objective) && finding.status === 'cited'
  }) ? 6 : 0
  const ownedProfileBonus = profile.targetBuyer ? 5 : 0
  const overall = clamp(Math.round(statusAverage + readinessBonus - pressurePenalty + objectiveFit + ownedProfileBonus + 8))
  const byIntent = {}

  for (const prompt of prompts) {
    const finding = findings.find((item) => item.promptId === prompt.id)
    byIntent[prompt.intentGroup] ||= []
    byIntent[prompt.intentGroup].push(STATUS_WEIGHTS[finding?.status] || 0)
  }

  return {
    overall,
    byIntent: Object.fromEntries(Object.entries(byIntent).map(([group, values]) => [group, Math.round(average(values))])),
    citationReadiness: clamp(Math.round(50 + readinessBonus * 4)),
    competitorPressure,
  }
}

function buildSummary(profile, findings, actions, score) {
  const missing = findings.filter((finding) => finding.status === 'missing').length
  const cited = findings.filter((finding) => finding.status === 'cited').length
  const competitorNames = [...new Set(findings.flatMap((finding) => finding.topCompetitors))]

  return {
    visibilityNarrative: `${profile.brandName} is cited in ${cited} simulated buyer prompts and missing or mispositioned in ${missing} prompts. Score: ${score.overall}/100.`,
    competitorGap: competitorNames.length
      ? `${competitorNames.join(', ')} appear as likely citation alternatives when ${profile.brandName} lacks comparison, proof, or structured facts.`
      : 'No named competitors were supplied, so the demo focuses on generic category sources and source readiness gaps.',
    nextWeekFocus: actions[0]?.title || 'Add a buyer-focused answer page with proof and structured facts.',
  }
}

function objectiveIntent(objective) {
  if (objective === 'comparison') return 'comparison'
  if (objective === 'category') return 'category-recommendation'
  return 'brand-defense'
}

function seedInput(profile) {
  return [
    profile.brandName.toLowerCase(),
    profile.normalizedDomain,
    profile.category.toLowerCase(),
    profile.targetBuyer.toLowerCase(),
    profile.objective,
    profile.competitors.map((competitor) => competitor.name.toLowerCase()).join(','),
  ].join('|')
}

function stableId(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function isValidDomain(value) {
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(value) && !/\s/.test(value)
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
