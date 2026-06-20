const templates = {
  'sunset-risk': [
    {
      id: 'sunset-breaks',
      intentGroup: 'sunset-risk',
      priority: 'high',
      text: 'What breaks in {appName} if {currentModel} is retired or behavior shifts?',
    },
    {
      id: 'sunset-coupling',
      intentGroup: 'sunset-risk',
      priority: 'high',
      text: 'Which workflows in {workload} are most coupled to {provider} and {currentModel}?',
    },
    {
      id: 'sunset-window',
      intentGroup: 'sunset-risk',
      priority: 'medium',
      text: 'How much warning does {appName} need before a model change becomes a customer-visible incident?',
    },
  ],
  'fallback-routing': [
    {
      id: 'fallback-primary',
      intentGroup: 'fallback-routing',
      priority: 'high',
      text: 'What should handle {workload} when {currentModel} fails or is unavailable?',
    },
    {
      id: 'fallback-quality',
      intentGroup: 'fallback-routing',
      priority: 'medium',
      text: 'Which fallback model keeps output quality close to {currentModel} while lowering risk?',
    },
    {
      id: 'fallback-router',
      intentGroup: 'fallback-routing',
      priority: 'medium',
      text: 'How should {appName} route between {currentModel} and the fallback models without adding latency spikes?',
    },
  ],
  'regression-coverage': [
    {
      id: 'regression-evals',
      intentGroup: 'regression-coverage',
      priority: 'high',
      text: 'Which evals catch output drift after a model migration in {appName}?',
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
      text: 'Should {appName} stay with {provider} or move to another vendor for {region}?',
    },
    {
      id: 'vendor-fit',
      intentGroup: 'vendor-choice',
      priority: 'medium',
      text: 'Which provider best matches {workload} if the team cares most about reliability and latency?',
    },
    {
      id: 'vendor-transition',
      intentGroup: 'vendor-choice',
      priority: 'medium',
      text: 'What migration sequence reduces risk fastest for {appName}?',
    },
  ],
}

const objectiveOrder = {
  'migrate-safely': ['sunset-risk', 'fallback-routing', 'regression-coverage', 'vendor-choice'],
  'preserve-quality': ['regression-coverage', 'fallback-routing', 'vendor-choice', 'sunset-risk'],
  'reduce-cost': ['vendor-choice', 'fallback-routing', 'sunset-risk', 'regression-coverage'],
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
  const fallbackText = profile.fallbackModels.length
    ? profile.fallbackModels.map((model) => model.name).join(', ')
    : 'known fallback models'

  return template
    .replaceAll('{appName}', profile.appName)
    .replaceAll('{provider}', profile.provider)
    .replaceAll('{currentModel}', profile.currentModel)
    .replaceAll('{workload}', profile.workload || 'the current workflow')
    .replaceAll('{region}', profile.region || 'the current region')
    .replaceAll('{fallbackModels}', fallbackText)
}
