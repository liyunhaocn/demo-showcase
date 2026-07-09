const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const labels = {
  objectives: {
    'recover-stalled-deals': 'Recover stalled deals',
    'increase-forecast-confidence': 'Increase forecast confidence',
    'speed-rep-followup': 'Speed rep follow-up',
  },
  scopes: {
    'next-best-action': 'next-best-action',
    'forecast-hygiene': 'forecast hygiene',
    'manager-coach': 'manager coaching',
  },
}

const defaults = {
  orgName: 'Revenue team',
  crmSystem: 'Salesforce Sales Cloud',
  segment: 'Mid-market pipeline',
  objective: 'recover-stalled-deals',
  pipelineValue: 1200000,
  winRate: 18,
  cycleDays: 54,
  staleDeals: 24,
  dataQuality: 'mixed',
  ownerCoverage: 'partial',
  compliancePosture: 'approval-needed',
  agentScope: 'next-best-action',
  blockers: '',
}

const scoreTable = {
  dataQuality: {
    poor: 8,
    mixed: 14,
    good: 20,
    excellent: 24,
  },
  ownerCoverage: {
    unknown: 6,
    partial: 13,
    named: 20,
  },
  compliancePosture: {
    none: 5,
    'approval-needed': 12,
    'policy-ready': 18,
  },
  agentScope: {
    'manager-coach': 13,
    'forecast-hygiene': 16,
    'next-best-action': 17,
  },
  objective: {
    'speed-rep-followup': 11,
    'increase-forecast-confidence': 12,
    'recover-stalled-deals': 13,
  },
}

export function normalizePilotInputs(raw = {}) {
  return {
    orgName: text(raw.orgName, defaults.orgName),
    crmSystem: text(raw.crmSystem, defaults.crmSystem),
    segment: text(raw.segment, defaults.segment),
    objective: pick(raw.objective, scoreTable.objective, defaults.objective),
    pipelineValue: number(raw.pipelineValue, defaults.pipelineValue, 0, 100000000),
    winRate: number(raw.winRate, defaults.winRate, 0, 100),
    cycleDays: number(raw.cycleDays, defaults.cycleDays, 1, 365),
    staleDeals: number(raw.staleDeals, defaults.staleDeals, 0, 1000),
    dataQuality: pick(raw.dataQuality, scoreTable.dataQuality, defaults.dataQuality),
    ownerCoverage: pick(raw.ownerCoverage, scoreTable.ownerCoverage, defaults.ownerCoverage),
    compliancePosture: pick(raw.compliancePosture, scoreTable.compliancePosture, defaults.compliancePosture),
    agentScope: pick(raw.agentScope, scoreTable.agentScope, defaults.agentScope),
    blockers: text(raw.blockers, defaults.blockers),
  }
}

export function scorePipelineAgentPilot(input) {
  const staleLoad = input.staleDeals >= 30 ? -1 : input.staleDeals >= 18 ? 1 : 3
  const readiness = clamp(
    Math.round(
      15 +
        scoreTable.dataQuality[input.dataQuality] +
        scoreTable.ownerCoverage[input.ownerCoverage] +
        scoreTable.compliancePosture[input.compliancePosture] +
        scoreTable.agentScope[input.agentScope] +
        staleLoad,
    ),
    0,
    100,
  )

  const roiIndex = clamp(
    34 +
      pipelinePotential(input.pipelineValue) +
      staleOpportunity(input.staleDeals) +
      winRateLeverage(input.winRate) +
      cycleLeverage(input.cycleDays) +
      scopeLeverage(input.agentScope),
    0,
    100,
  )

  const riskPoints =
    dataRisk(input.dataQuality) +
    ownerRisk(input.ownerCoverage) +
    complianceRisk(input.compliancePosture) +
    staleRisk(input.staleDeals) +
    blockerRisk(input.blockers)

  return {
    readiness,
    roiIndex,
    riskLevel: riskPoints >= 60 ? 'High' : riskPoints >= 30 ? 'Medium' : 'Low',
    riskPoints,
    gates: buildGates(input),
  }
}

export function buildPilotPlan(raw = {}) {
  const input = normalizePilotInputs(raw)
  const score = scorePipelineAgentPilot(input)
  const opportunityValue = Math.round(input.pipelineValue * (input.winRate / 100) * 0.08)
  const summary = {
    objective: labels.objectives[input.objective],
    recommendedPilot: input.agentScope,
    weeklyLift: opportunityValue,
    audience: `${input.segment} team using ${input.crmSystem}`,
  }

  const findings = [
    {
      title: 'Pilot wedge',
      detail: `${labels.scopes[input.agentScope]} is narrow enough to test without rewriting the CRM workflow.`,
      status: score.readiness >= 75 ? 'Ready' : 'Needs guardrails',
    },
    {
      title: 'Revenue exposure',
      detail: `$${formatNumber(input.pipelineValue)} in visible pipeline with ${input.staleDeals} stale opportunities creates a measurable pilot target.`,
      status: score.roiIndex >= 80 ? 'Strong upside' : 'Moderate upside',
    },
    {
      title: 'Adoption risk',
      detail: ownerFinding(input),
      status: score.riskLevel,
    },
  ]

  const milestones = [
    'Day 1-2: freeze the opportunity fields the agent can read, write, or only suggest.',
    'Day 3-5: run suggestions in shadow mode against stalled deals and manager notes.',
    'Day 6-8: review accepted suggestions, rejected suggestions, and rep override reasons.',
    'Day 9-10: decide whether to expand to one more segment, pause, or require policy work.',
  ]

  const pricing = [
    'Pilot package: $2,500 for setup brief, sandbox policy, and manager review dashboard.',
    'Expansion: $900 per sales pod per month for weekly pilot governance and field-change audits.',
    'Enterprise: security review, CRM field policy, and manager enablement workshop.',
  ]

  const markdown = renderMarkdown(input, score, summary, findings, milestones, pricing)

  return {
    orgName: input.orgName,
    input,
    score,
    summary,
    findings,
    milestones,
    pricing,
    markdown,
  }
}

function buildGates(input) {
  const gates = [
    'Run sandbox-only agent suggestions on stalled opportunities for 10 business days.',
    'Require sales-manager approval before any CRM field is changed by an agent.',
  ]

  if (input.compliancePosture !== 'policy-ready') {
    gates.push('Map CRM field permissions, audit log ownership, and buyer-data handling before production use.')
  }

  if (input.dataQuality !== 'excellent') {
    gates.push('Clean missing close dates, next steps, and owner fields before scoring pilot success.')
  }

  if (input.blockers) {
    gates.push(`Resolve named blockers before expansion: ${input.blockers}.`)
  }

  gates.push('Track accepted suggestions, rejected suggestions, and opportunity-stage movement weekly.')
  return gates
}

function renderMarkdown(input, score, summary, findings, milestones, pricing) {
  return [
    `# Pipeline Agent Pilot Planner - ${input.orgName}`,
    '',
    `Readiness score: ${score.readiness}`,
    `ROI index: ${score.roiIndex}`,
    `Risk level: ${score.riskLevel}`,
    `Pilot scope: ${summary.recommendedPilot}`,
    '',
    '## Why this pilot now',
    `${summary.audience} has $${formatNumber(input.pipelineValue)} in tracked pipeline, ${input.staleDeals} stale opportunities, and a ${input.winRate}% win rate. The pilot stays deterministic and assumes no live CRM or AI calls in this demo.`,
    '',
    '## Findings',
    ...findings.map((finding) => `- ${finding.title}: ${finding.detail} (${finding.status})`),
    '',
    '## Required gates',
    ...buildGates(input).map((gate) => `- ${gate}`),
    '',
    '## 2-week pilot milestones',
    ...milestones.map((milestone) => `- ${milestone}`),
    '',
    '## Commercial test',
    ...pricing.map((item) => `- ${item}`),
  ].join('\n')
}

function text(value, fallback) {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function pick(value, table, fallback) {
  return Object.hasOwn(table, value) ? value : fallback
}

function number(value, fallback, min, max) {
  const parsed = Number.parseFloat(String(value ?? '').replace(/,/g, ''))
  if (!Number.isFinite(parsed)) return fallback
  return clamp(Math.round(parsed), min, max)
}

function pipelinePotential(value) {
  if (value >= 5000000) return 20
  if (value >= 4000000) return 18
  if (value >= 1500000) return 14
  return 9
}

function staleOpportunity(value) {
  if (value >= 30) return 14
  if (value >= 18) return 10
  return 6
}

function winRateLeverage(value) {
  if (value >= 15 && value <= 30) return 10
  if (value < 15) return 7
  return 5
}

function cycleLeverage(value) {
  if (value >= 45) return 6
  if (value >= 30) return 4
  return 2
}

function scopeLeverage(value) {
  if (value === 'next-best-action') return 5
  if (value === 'forecast-hygiene') return 4
  return 3
}

function dataRisk(value) {
  return { poor: 24, mixed: 16, good: 10, excellent: 4 }[value]
}

function ownerRisk(value) {
  return { unknown: 20, partial: 10, named: 0 }[value]
}

function complianceRisk(value) {
  return { none: 22, 'approval-needed': 13, 'policy-ready': 3 }[value]
}

function staleRisk(value) {
  if (value >= 35) return 16
  if (value >= 25) return 12
  return 6
}

function blockerRisk(value) {
  return value ? 8 : 0
}

function ownerFinding(input) {
  if (input.ownerCoverage === 'named') {
    return 'Named owners make the pilot suitable for a manager-approved shadow run.'
  }

  if (input.ownerCoverage === 'partial') {
    return 'Some owners are missing, so the pilot should start with read-only suggestions.'
  }

  return 'No accountable owner is named, so the agent should not change CRM fields.'
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value)
}
