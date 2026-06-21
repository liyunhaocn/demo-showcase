const templates = {
  'deprecation-risk': [
    {
      id: 'deprecation-breaks',
      intentGroup: 'deprecation-risk',
      priority: 'high',
      text: 'What breaks in {appName} if {currentModel} changes or gets retired?',
    },
    {
      id: 'deprecation-coupling',
      intentGroup: 'deprecation-risk',
      priority: 'high',
      text: 'Which features in {workload} are most coupled to {provider} release notes?',
    },
    {
      id: 'deprecation-window',
      intentGroup: 'deprecation-risk',
      priority: 'medium',
      text: 'How much warning does {appName} need before a release note becomes a customer-visible incident?',
    },
  ],
  'upgrade-opportunity': [
    {
      id: 'upgrade-benefit',
      intentGroup: 'upgrade-opportunity',
      priority: 'high',
      text: 'Which features in {workload} benefit most from the new release or capability preview?',
    },
    {
      id: 'upgrade-fit',
      intentGroup: 'upgrade-opportunity',
      priority: 'medium',
      text: 'Which feature can safely move first if {appName} wants the upgrade upside without taking extra risk?',
    },
    {
      id: 'upgrade-router',
      intentGroup: 'upgrade-opportunity',
      priority: 'medium',
      text: 'How should {appName} compare the current release note, the upgrade path, and the owner checklist?',
    },
  ],
  'inventory-coverage': [
    {
      id: 'inventory-evals',
      intentGroup: 'inventory-coverage',
      priority: 'high',
      text: 'Which feature checks catch regressions after a release note change in {appName}?',
    },
    {
      id: 'inventory-golden',
      intentGroup: 'inventory-coverage',
      priority: 'medium',
      text: 'Which feature rows should {appName} pin before changing the release path?',
    },
    {
      id: 'inventory-failure',
      intentGroup: 'inventory-coverage',
      priority: 'medium',
      text: 'What customer-facing failures are most likely if the release impact matrix is missing?',
    },
  ],
  'owner-checklist': [
    {
      id: 'owner-stay',
      intentGroup: 'owner-checklist',
      priority: 'high',
      text: 'Should {appName} stay on the current release path or switch because of the new note?',
    },
    {
      id: 'owner-fit',
      intentGroup: 'owner-checklist',
      priority: 'medium',
      text: 'Which feature owner best understands {workload} if the team cares most about reliability and clarity?',
    },
    {
      id: 'owner-sequence',
      intentGroup: 'owner-checklist',
      priority: 'medium',
      text: 'What checklist sequence reduces release risk fastest for {appName}?',
    },
  ],
}

const objectiveOrder = {
  'prevent-breakage': ['deprecation-risk', 'inventory-coverage', 'owner-checklist', 'upgrade-opportunity'],
  'spot-opportunities': ['upgrade-opportunity', 'inventory-coverage', 'owner-checklist', 'deprecation-risk'],
  'reduce-noise': ['owner-checklist', 'deprecation-risk', 'inventory-coverage', 'upgrade-opportunity'],
}

export function generatePrompts(profile) {
  const order = objectiveOrder[profile.objective] || objectiveOrder['prevent-breakage']
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
  const inventoryText = profile.driftModels.length
    ? profile.driftModels.map((model) => model.name).join(', ')
    : 'known feature rows'

  return template
    .replaceAll('{appName}', profile.appName)
    .replaceAll('{provider}', profile.provider)
    .replaceAll('{currentModel}', profile.currentModel)
    .replaceAll('{workload}', profile.workload || 'the current feature surface')
    .replaceAll('{region}', profile.region || 'the current owner group')
    .replaceAll('{driftModels}', inventoryText)
}
