const templates = {
  'sunset-risk': [
    {
      id: 'sunset-breaks',
      intentGroup: 'sunset-risk',
      priority: 'high',
      text: 'What breaks in {appName} if the candidate prompt is retired or behavior shifts?',
    },
    {
      id: 'sunset-coupling',
      intentGroup: 'sunset-risk',
      priority: 'high',
      text: 'Which workflows in {workload} are most coupled to the baseline prompt and candidate prompt?',
    },
    {
      id: 'sunset-window',
      intentGroup: 'sunset-risk',
      priority: 'medium',
      text: 'How much warning does {appName} need before a prompt change becomes a customer-visible incident?',
    },
  ],
  'drift-routing': [
    {
      id: 'drift-primary',
      intentGroup: 'drift-routing',
      priority: 'high',
      text: 'What should handle {workload} when the candidate prompt fails or drifts?',
    },
    {
      id: 'drift-quality',
      intentGroup: 'drift-routing',
      priority: 'medium',
      text: 'Which critical case keeps output quality close to the baseline prompt while lowering risk?',
    },
    {
      id: 'drift-router',
      intentGroup: 'drift-routing',
      priority: 'medium',
      text: 'How should {appName} compare the baseline prompt, the candidate prompt, and the critical cases without adding latency spikes?',
    },
  ],
  'regression-coverage': [
    {
      id: 'regression-evals',
      intentGroup: 'regression-coverage',
      priority: 'high',
      text: 'Which evals catch output drift after a prompt regression in {appName}?',
    },
    {
      id: 'regression-golden',
      intentGroup: 'regression-coverage',
      priority: 'medium',
      text: 'Which golden prompts or fixtures should {appName} pin before changing models?',
    },
    {
      id: 'regression-failure',
      intentGroup: 'regression-coverage',
      priority: 'medium',
      text: 'What user-facing failures are most likely if the prompt contract changes without a regression suite?',
    },
  ],
  'vendor-choice': [
    {
      id: 'vendor-stay',
      intentGroup: 'vendor-choice',
      priority: 'high',
      text: 'Should {appName} keep the baseline prompt or swap the candidate prompt for {region}?',
    },
    {
      id: 'vendor-fit',
      intentGroup: 'vendor-choice',
      priority: 'medium',
      text: 'Which prompt variant best matches {workload} if the team cares most about reliability and latency?',
    },
    {
      id: 'vendor-transition',
      intentGroup: 'vendor-choice',
      priority: 'medium',
      text: 'What prompt-review sequence reduces risk fastest for {appName}?',
    },
  ],
}

const objectiveOrder = {
  'migrate-safely': ['sunset-risk', 'drift-routing', 'regression-coverage', 'vendor-choice'],
  'preserve-quality': ['regression-coverage', 'drift-routing', 'vendor-choice', 'sunset-risk'],
  'reduce-cost': ['vendor-choice', 'drift-routing', 'sunset-risk', 'regression-coverage'],
}

export function generatePrompts(profile) {
  const order = objectiveOrder[profile.objective] || objectiveOrder['migrate-safely']
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
  const driftText = profile.driftModels.length
    ? profile.driftModels.map((model) => model.name).join(', ')
    : 'known critical cases'

  return template
    .replaceAll('{appName}', profile.appName)
    .replaceAll('{provider}', profile.provider)
    .replaceAll('{currentModel}', profile.currentModel)
    .replaceAll('{workload}', profile.workload || 'the current workflow')
    .replaceAll('{region}', profile.region || 'the current region')
    .replaceAll('{driftModels}', driftText)
}
