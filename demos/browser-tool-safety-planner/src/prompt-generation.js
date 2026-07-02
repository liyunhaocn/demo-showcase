const templates = {
  'safe-coverage': [
    {
      id: 'safe-browser-task',
      intentGroup: 'safe-coverage',
      priority: 'high',
      text: 'Which browser task in {workload} should be the first safe coverage lane for {appName}?',
    },
    {
      id: 'owner-gap',
      intentGroup: 'safe-coverage',
      priority: 'high',
      text: 'Which browser task in {workload} still needs a named owner before safety review can start?',
    },
    {
      id: 'review-baseline',
      intentGroup: 'safe-coverage',
      priority: 'medium',
      text: 'Which browser task should lock its review baseline before browser tools are enabled?',
    },
  ],
  'budget-gate': [
    {
      id: 'cost-cap',
      intentGroup: 'budget-gate',
      priority: 'high',
      text: 'Which browser task in {workload} is most likely to break the active session budget?',
    },
    {
      id: 'usage-spike',
      intentGroup: 'budget-gate',
      priority: 'high',
      text: 'Where should {appName} watch for a browser-session spike before turning on browser tools?',
    },
    {
      id: 'budget-note',
      intentGroup: 'budget-gate',
      priority: 'medium',
      text: 'What budget note should {appName} attach so finance and platform agree on browser limits?',
    },
  ],
  'policy-gate': [
    {
      id: 'policy-check',
      intentGroup: 'policy-gate',
      priority: 'high',
      text: 'Which browser task in {workload} still needs a security or browser-policy check before enablement?',
    },
    {
      id: 'browser-policy-gate',
      intentGroup: 'policy-gate',
      priority: 'high',
      text: 'Which browser task should keep browser automation disabled until the security owner signs off?',
    },
    {
      id: 'policy-brief',
      intentGroup: 'policy-gate',
      priority: 'medium',
      text: 'How should {appName} brief the owner so browser-policy exceptions stay visible?',
    },
  ],
  'browser-execution-view': [
    {
      id: 'browser-execution-board-fit',
      intentGroup: 'browser-execution-view',
      priority: 'high',
      text: 'Which safety board in {appName} should be updated so the team sees safe browser tasks first?',
    },
    {
      id: 'browser-execution-filter',
      intentGroup: 'browser-execution-view',
      priority: 'medium',
      text: 'What filter in {workload} should change first to keep risky tasks and ready tasks in the same board?',
    },
    {
      id: 'browser-execution-share',
      intentGroup: 'browser-execution-view',
      priority: 'medium',
      text: 'How should {appName} share a browser safety board so engineering and finance see the same enablement queue?',
    },
  ],
}

const objectiveOrder = {
  'reduce-browser-risk': ['safe-coverage', 'policy-gate', 'budget-gate', 'browser-execution-view'],
  'control-budget': ['budget-gate', 'safe-coverage', 'policy-gate', 'browser-execution-view'],
  'policy-ready': ['policy-gate', 'safe-coverage', 'browser-execution-view', 'budget-gate'],
}

export function generatePrompts(profile) {
  const order = objectiveOrder[profile.objective] || objectiveOrder['reduce-browser-risk']
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
    : 'known browser tasks'

  return template
    .replaceAll('{appName}', profile.appName)
    .replaceAll('{provider}', profile.provider)
    .replaceAll('{currentModel}', profile.currentModel)
    .replaceAll('{workload}', profile.workload || 'the current browser task fleet')
    .replaceAll('{region}', profile.region || 'the current owner group')
    .replaceAll('{reviewModels}', inventoryText)
}
