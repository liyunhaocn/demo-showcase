const templates = {
  forecast: [
    {
      id: 'forecast-drivers',
      intentGroup: 'usage-driver',
      priority: 'high',
      text: 'Which Copilot workloads will burn the most credits for {org} this month?',
    },
    {
      id: 'forecast-review',
      intentGroup: 'usage-driver',
      priority: 'high',
      text: 'How much of {org}\'s projected burn comes from code review rather than code writing?',
    },
    {
      id: 'forecast-concentration',
      intentGroup: 'usage-driver',
      priority: 'medium',
      text: 'Which repos or teams are most likely to concentrate Copilot usage across {seats} seats?',
    },
  ],
  budget: [
    {
      id: 'budget-guardrails',
      intentGroup: 'billing-control',
      priority: 'high',
      text: 'What guardrails keep {org} inside the {cap} credit cap?',
    },
    {
      id: 'budget-idle-seats',
      intentGroup: 'billing-control',
      priority: 'medium',
      text: 'Which seats are consuming budget without enough active usage?',
    },
    {
      id: 'budget-model-mix',
      intentGroup: 'billing-control',
      priority: 'medium',
      text: 'How should {org} limit advanced model usage without slowing delivery?',
    },
  ],
  governance: [
    {
      id: 'governance-approval',
      intentGroup: 'governance',
      priority: 'high',
      text: 'Who should approve advanced model access for expensive tasks at {org}?',
    },
    {
      id: 'governance-reporting',
      intentGroup: 'governance',
      priority: 'medium',
      text: 'What weekly usage report should finance or ops review before renewal?',
    },
    {
      id: 'governance-alerts',
      intentGroup: 'governance',
      priority: 'low',
      text: 'Which alerts should fire before {org} burns through its included credits?',
    },
  ],
  'plan-fit': [
    {
      id: 'plan-fit-tier',
      intentGroup: 'plan-fit',
      priority: 'high',
      text: 'Does the current {plan} tier fit {org}\'s developer density and PR volume?',
    },
    {
      id: 'plan-fit-renewal',
      intentGroup: 'plan-fit',
      priority: 'medium',
      text: 'Is it cheaper for {org} to upgrade the plan or tighten usage controls before renewal?',
    },
    {
      id: 'plan-fit-dashboard',
      intentGroup: 'plan-fit',
      priority: 'medium',
      text: 'What dashboard does {org} need to make Copilot spend predictable each week?',
    },
  ],
}

const objectiveOrder = {
  forecast: ['forecast', 'budget', 'governance', 'plan-fit'],
  budget: ['budget', 'forecast', 'plan-fit', 'governance'],
  governance: ['governance', 'budget', 'forecast', 'plan-fit'],
}

export function generatePrompts(profile) {
  const order = objectiveOrder[profile.objective] || objectiveOrder.forecast
  const selected = []

  for (const group of order) {
    selected.push(...templates[group])
  }

  return selected.slice(0, 10).map((template, index) => ({
    id: `${template.id}-${index + 1}`,
    intentGroup: template.intentGroup,
    priority: template.priority,
    prompt: hydrate(template.text, profile),
  }))
}

function hydrate(template, profile) {
  return template
    .replaceAll('{org}', profile.orgName)
    .replaceAll('{plan}', profile.planLabel)
    .replaceAll('{seats}', String(profile.seats))
    .replaceAll('{cap}', profile.monthlyCreditCap ? `${profile.monthlyCreditCap} credits` : 'the current cap')
}
