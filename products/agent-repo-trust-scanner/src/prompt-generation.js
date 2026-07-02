const templates = {
  'pilot-coverage': [
    {
      id: 'pilot-repo',
      intentGroup: 'pilot-coverage',
      priority: 'high',
      text: 'Which repo in {workload} should be the first trust pilot for GitHub Code Quality?',
    },
    {
      id: 'owner-gap',
      intentGroup: 'pilot-coverage',
      priority: 'high',
      text: 'Which repo in {workload} still needs a named owner before trust review can start?',
    },
    {
      id: 'review-baseline',
      intentGroup: 'pilot-coverage',
      priority: 'medium',
      text: 'Which repo should lock its review baseline before Copilot code review is enabled?',
    },
  ],
  'budget-gate': [
    {
      id: 'cost-cap',
      intentGroup: 'budget-gate',
      priority: 'high',
      text: 'Which repo in {workload} is most likely to break the active committer budget?',
    },
    {
      id: 'usage-spike',
      intentGroup: 'budget-gate',
      priority: 'high',
      text: 'Where should {appName} watch for an AI usage spike before turning on Code Quality?',
    },
    {
      id: 'budget-note',
      intentGroup: 'budget-gate',
      priority: 'medium',
      text: 'What budget note should {appName} attach so finance and platform agree on trust limits?',
    },
  ],
  'policy-gate': [
    {
      id: 'policy-check',
      intentGroup: 'policy-gate',
      priority: 'high',
      text: 'Which repo in {workload} still needs a security or marketplace policy check before enablement?',
    },
    {
      id: 'autofix-gate',
      intentGroup: 'policy-gate',
      priority: 'high',
      text: 'Which repo should keep Autofix disabled until the security owner signs off?',
    },
    {
      id: 'policy-brief',
      intentGroup: 'policy-gate',
      priority: 'medium',
      text: 'How should {appName} brief the owner so policy exceptions stay visible?',
    },
  ],
  'rollout-view': [
    {
      id: 'rollout-view-fit',
      intentGroup: 'rollout-view',
      priority: 'high',
      text: 'Which trust board in {appName} should be updated so the team sees trusted repos first?',
    },
    {
      id: 'rollout-filter',
      intentGroup: 'rollout-view',
      priority: 'medium',
      text: 'What filter in {workload} should change first to keep risky repos and ready repos in the same board?',
    },
    {
      id: 'rollout-share',
      intentGroup: 'rollout-view',
      priority: 'medium',
      text: 'How should {appName} share a trust board so engineering and finance see the same enablement queue?',
    },
  ],
}

const objectiveOrder = {
  'reduce-trust-risk': ['pilot-coverage', 'policy-gate', 'budget-gate', 'rollout-view'],
  'control-budget': ['budget-gate', 'pilot-coverage', 'policy-gate', 'rollout-view'],
  'policy-ready': ['policy-gate', 'pilot-coverage', 'rollout-view', 'budget-gate'],
}

export function generatePrompts(profile) {
  const order = objectiveOrder[profile.objective] || objectiveOrder['reduce-trust-risk']
  const selected = []

  for (const group of order) {
    selected.push(...templates[group])
  }

  return selected.slice(0, 9).map((template, index) => ({
    id: `${template.id}-${index + 1}`,
    intentGroup: template.intentGroup,
    priority: template.priority,
    prompt: hydrate(template.text, profile),
  }))
}

function hydrate(template, profile) {
  const inventoryText = profile.reviewModels.length
    ? profile.reviewModels.map((model) => model.name).join(', ')
    : 'known trust targets'

  return template
    .replaceAll('{appName}', profile.appName)
    .replaceAll('{provider}', profile.provider)
    .replaceAll('{currentModel}', profile.currentModel)
    .replaceAll('{workload}', profile.workload || 'the current repo fleet')
    .replaceAll('{region}', profile.region || 'the current owner group')
    .replaceAll('{reviewModels}', inventoryText)
}
